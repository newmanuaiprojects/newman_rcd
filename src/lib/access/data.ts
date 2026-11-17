import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { rolePermission, userPermission, userRole } from '@/lib/db/schema';
import type { Grants } from '@/lib/access/grants';

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
