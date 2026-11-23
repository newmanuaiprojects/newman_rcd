import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { forbidden } from 'next/navigation';
import { auth } from '@/lib/auth';
import { loadUserGrants } from '@/lib/access/data';
import { permissionsOf } from '@/lib/access/grants';
import type { Permission } from '@/lib/access/permissions';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  permissions: ReadonlySet<Permission>;
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name, email } = session.user;
  return { id, name, email, permissions: permissionsOf(id, await loadUserGrants(id)) };
});

export function can(user: CurrentUser | null, permission: Permission): boolean {
  return user !== null && user.permissions.has(permission);
}

export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !can(user, permission)) forbidden();
  return user;
}
