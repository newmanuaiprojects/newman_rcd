import type { Permission } from '@/lib/access/permissions';

export interface Grants {
  rolePermissions: readonly { roleId: string; permission: Permission }[];
  userRoles: readonly { userId: string; roleId: string }[];
  userPermissions: readonly { userId: string; permission: Permission }[];
}

export type Removal =
  | { kind: 'userRole'; userId: string; roleId: string }
  | { kind: 'userPermission'; userId: string; permission: Permission }
  | { kind: 'rolePermission'; roleId: string; permission: Permission };

export function permissionsOf(userId: string, grants: Grants): Set<Permission> {
  const roleIds = new Set(grants.userRoles.filter((grant) => grant.userId === userId).map((grant) => grant.roleId));
  const permissions = new Set<Permission>();
  for (const grant of grants.rolePermissions) {
    if (roleIds.has(grant.roleId)) permissions.add(grant.permission);
  }
  for (const grant of grants.userPermissions) {
    if (grant.userId === userId) permissions.add(grant.permission);
  }
  return permissions;
}

export function holdersOf(permission: Permission, grants: Grants): Set<string> {
  const roleIds = new Set(
    grants.rolePermissions.filter((grant) => grant.permission === permission).map((grant) => grant.roleId),
  );
  const holders = new Set<string>();
  for (const grant of grants.userRoles) {
    if (roleIds.has(grant.roleId)) holders.add(grant.userId);
  }
  for (const grant of grants.userPermissions) {
    if (grant.permission === permission) holders.add(grant.userId);
  }
  return holders;
}

export function leavesAccessManager(grants: Grants, removal: Removal): boolean {
  return holdersOf('access:manage', without(grants, removal)).size > 0;
}

function without(grants: Grants, removal: Removal): Grants {
  switch (removal.kind) {
    case 'userRole':
      return {
        ...grants,
        userRoles: grants.userRoles.filter(
          (grant) => !(grant.userId === removal.userId && grant.roleId === removal.roleId),
        ),
      };
    case 'userPermission':
      return {
        ...grants,
        userPermissions: grants.userPermissions.filter(
          (grant) => !(grant.userId === removal.userId && grant.permission === removal.permission),
        ),
      };
    case 'rolePermission':
      return {
        ...grants,
        rolePermissions: grants.rolePermissions.filter(
          (grant) => !(grant.roleId === removal.roleId && grant.permission === removal.permission),
        ),
      };
  }
}
