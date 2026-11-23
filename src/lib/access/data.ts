import 'server-only';
import { and, asc, eq, notExists, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { role, rolePermission, user, userPermission, userRole } from '@/lib/db/schema';
import { transaction, type Transaction } from '@/lib/db/transaction';
import { leavesAccessManager, permissionsOf, type Grants, type Removal } from '@/lib/access/grants';
import { PERMISSIONS, type Permission } from '@/lib/access/permissions';

export interface AccessOverview {
  roles: {
    id: string;
    name: string;
    description: string | null;
    permissions: Permission[];
    holderCount: number;
  }[];
  people: {
    id: string;
    name: string;
    email: string;
    roles: { id: string; name: string }[];
    directPermissions: Permission[];
    permissions: Permission[];
  }[];
}

export async function loadUserGrants(userId: string): Promise<Grants> {
  const [userRoles, rolePermissions, userPermissions] = await db.batch([
    db.select({ userId: userRole.userId, roleId: userRole.roleId }).from(userRole).where(eq(userRole.userId, userId)),
    db
      .select({ roleId: rolePermission.roleId, permission: rolePermission.permission })
      .from(rolePermission)
      .innerJoin(userRole, eq(userRole.roleId, rolePermission.roleId))
      .where(eq(userRole.userId, userId)),
    db
      .select({ userId: userPermission.userId, permission: userPermission.permission })
      .from(userPermission)
      .where(eq(userPermission.userId, userId)),
  ]);
  return { userRoles, rolePermissions, userPermissions };
}

export async function getAccessOverview(): Promise<AccessOverview> {
  const [people, roles, rolePermissions, userRoles, userPermissions] = await db.batch([
    db.select({ id: user.id, name: user.name, email: user.email }).from(user).orderBy(asc(user.name), asc(user.email)),
    db.select({ id: role.id, name: role.name, description: role.description }).from(role).orderBy(asc(role.name)),
    db.select({ roleId: rolePermission.roleId, permission: rolePermission.permission }).from(rolePermission),
    db.select({ userId: userRole.userId, roleId: userRole.roleId }).from(userRole),
    db.select({ userId: userPermission.userId, permission: userPermission.permission }).from(userPermission),
  ]);
  const grants: Grants = { rolePermissions, userRoles, userPermissions };
  const inOrder = (held: ReadonlySet<Permission>) => PERMISSIONS.filter((permission) => held.has(permission));

  return {
    roles: roles.map((row) => ({
      ...row,
      permissions: inOrder(new Set(rolePermissions.filter((grant) => grant.roleId === row.id).map((grant) => grant.permission))),
      holderCount: userRoles.filter((grant) => grant.roleId === row.id).length,
    })),
    people: people.map((person) => ({
      ...person,
      roles: roles
        .filter((row) => userRoles.some((grant) => grant.userId === person.id && grant.roleId === row.id))
        .map(({ id, name }) => ({ id, name })),
      directPermissions: inOrder(
        new Set(userPermissions.filter((grant) => grant.userId === person.id).map((grant) => grant.permission)),
      ),
      permissions: inOrder(permissionsOf(person.id, grants)),
    })),
  };
}

export async function grantRole(userId: string, roleId: string, grantedBy: string): Promise<void> {
  await db.insert(userRole).values({ userId, roleId, grantedBy }).onConflictDoNothing();
}

export async function grantPermission(userId: string, permission: Permission, grantedBy: string): Promise<void> {
  await db.insert(userPermission).values({ userId, permission, grantedBy }).onConflictDoNothing();
}

export async function addRolePermission(roleId: string, permission: Permission, grantedBy: string): Promise<void> {
  await db.insert(rolePermission).values({ roleId, permission, grantedBy }).onConflictDoNothing();
}

export async function createRole(name: string, description: string | null): Promise<'created' | 'name-taken'> {
  const created = await db
    .insert(role)
    .values({ id: nanoid(), name, description })
    .onConflictDoNothing({ target: role.name })
    .returning({ id: role.id });
  return created.length > 0 ? 'created' : 'name-taken';
}

export async function deleteUnusedRole(roleId: string): Promise<'deleted' | 'in-use'> {
  const deleted = await db
    .delete(role)
    .where(and(eq(role.id, roleId), notExists(db.select().from(userRole).where(eq(userRole.roleId, roleId)))))
    .returning({ id: role.id });
  return deleted.length > 0 ? 'deleted' : 'in-use';
}

export async function removeGrant(removal: Removal): Promise<'removed' | 'last-access-manager'> {
  return transaction(async (tx) => {
    await lockAccessChanges(tx);
    if (!leavesAccessManager(await loadAllGrants(tx), removal)) return 'last-access-manager';
    await deleteGrant(tx, removal);
    return 'removed';
  });
}

function lockAccessChanges(tx: Transaction) {
  return tx.execute(sql`select pg_advisory_xact_lock(hashtext('access'))`);
}

async function loadAllGrants(tx: Transaction): Promise<Grants> {
  const rolePermissions = await tx
    .select({ roleId: rolePermission.roleId, permission: rolePermission.permission })
    .from(rolePermission);
  const userRoles = await tx.select({ userId: userRole.userId, roleId: userRole.roleId }).from(userRole);
  const userPermissions = await tx
    .select({ userId: userPermission.userId, permission: userPermission.permission })
    .from(userPermission);
  return { rolePermissions, userRoles, userPermissions };
}

async function deleteGrant(tx: Transaction, removal: Removal) {
  switch (removal.kind) {
    case 'userRole':
      await tx.delete(userRole).where(and(eq(userRole.userId, removal.userId), eq(userRole.roleId, removal.roleId)));
      break;
    case 'userPermission':
      await tx
        .delete(userPermission)
        .where(and(eq(userPermission.userId, removal.userId), eq(userPermission.permission, removal.permission)));
      break;
    case 'rolePermission':
      await tx
        .delete(rolePermission)
        .where(and(eq(rolePermission.roleId, removal.roleId), eq(rolePermission.permission, removal.permission)));
      break;
  }
}
