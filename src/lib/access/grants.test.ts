import { describe, expect, it } from 'vitest';
import { holdersOf, leavesAccessManager, permissionsOf, type Grants } from '@/lib/access/grants';

const DEFAULT_ROLES: Grants['rolePermissions'] = [
  { roleId: 'admin', permission: 'rooms:create' },
  { roleId: 'admin', permission: 'rooms:update' },
  { roleId: 'admin', permission: 'access:manage' },
  { roleId: 'editor', permission: 'rooms:create' },
  { roleId: 'editor', permission: 'rooms:update' },
];

function grants(overrides: Partial<Grants>): Grants {
  return { rolePermissions: DEFAULT_ROLES, userRoles: [], userPermissions: [], ...overrides };
}

describe('permissionsOf', () => {
  it('combines every role the user holds with their direct grants', () => {
    const state = grants({
      rolePermissions: [
        { roleId: 'creator', permission: 'rooms:create' },
        { roleId: 'updater', permission: 'rooms:update' },
      ],
      userRoles: [
        { userId: 'ana', roleId: 'creator' },
        { userId: 'ana', roleId: 'updater' },
      ],
      userPermissions: [{ userId: 'ana', permission: 'access:manage' }],
    });
    expect(permissionsOf('ana', state)).toEqual(new Set(['rooms:create', 'rooms:update', 'access:manage']));
  });

  it('counts a permission held twice once', () => {
    const state = grants({
      userRoles: [{ userId: 'ana', roleId: 'editor' }],
      userPermissions: [{ userId: 'ana', permission: 'rooms:create' }],
    });
    expect(permissionsOf('ana', state)).toEqual(new Set(['rooms:create', 'rooms:update']));
  });

  it("ignores other people's grants", () => {
    const state = grants({
      userRoles: [{ userId: 'ben', roleId: 'admin' }],
      userPermissions: [{ userId: 'ben', permission: 'rooms:create' }],
    });
    expect(permissionsOf('ana', state)).toEqual(new Set());
  });
});

describe('holdersOf', () => {
  it('finds holders through a role and through a direct grant', () => {
    const state = grants({
      userRoles: [{ userId: 'ana', roleId: 'admin' }],
      userPermissions: [{ userId: 'ben', permission: 'access:manage' }],
    });
    expect(holdersOf('access:manage', state)).toEqual(new Set(['ana', 'ben']));
  });
});

describe('leavesAccessManager', () => {
  const onlyAdmin = grants({ userRoles: [{ userId: 'ana', roleId: 'admin' }, { userId: 'ana', roleId: 'editor' }] });

  it('refuses to take the admin role from the last admin, even when they remove themselves', () => {
    expect(leavesAccessManager(onlyAdmin, { kind: 'userRole', userId: 'ana', roleId: 'admin' })).toBe(false);
  });

  it('refuses to take access:manage off the role the last admin holds it through', () => {
    expect(
      leavesAccessManager(onlyAdmin, { kind: 'rolePermission', roleId: 'admin', permission: 'access:manage' }),
    ).toBe(false);
  });

  it('refuses to revoke the last direct grant of access:manage', () => {
    const state = grants({ userPermissions: [{ userId: 'ana', permission: 'access:manage' }] });
    expect(
      leavesAccessManager(state, { kind: 'userPermission', userId: 'ana', permission: 'access:manage' }),
    ).toBe(false);
  });

  it('allows removing an admin while someone else still holds access:manage', () => {
    const state = grants({
      userRoles: [{ userId: 'ana', roleId: 'admin' }],
      userPermissions: [{ userId: 'ben', permission: 'access:manage' }],
    });
    expect(leavesAccessManager(state, { kind: 'userRole', userId: 'ana', roleId: 'admin' })).toBe(true);
  });

  it('allows removing a role when the user still holds access:manage directly', () => {
    const state = grants({
      userRoles: [{ userId: 'ana', roleId: 'admin' }],
      userPermissions: [{ userId: 'ana', permission: 'access:manage' }],
    });
    expect(leavesAccessManager(state, { kind: 'userRole', userId: 'ana', roleId: 'admin' })).toBe(true);
  });

  it('allows removals that do not touch access:manage', () => {
    expect(leavesAccessManager(onlyAdmin, { kind: 'userRole', userId: 'ana', roleId: 'editor' })).toBe(true);
    expect(
      leavesAccessManager(onlyAdmin, { kind: 'rolePermission', roleId: 'editor', permission: 'rooms:create' }),
    ).toBe(true);
  });
});
