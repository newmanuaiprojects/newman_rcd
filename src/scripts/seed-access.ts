import { inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { role, rolePermission } from '@/lib/db/schema';
import { transaction } from '@/lib/db/transaction';
import { PERMISSIONS, type Permission } from '@/lib/access/permissions';

const ADMIN = { name: 'admin', description: 'Every permission, including who can do what' };
const EDITOR = {
  name: 'editor',
  description: 'Adds and edits rooms',
  defaultPermissions: ['rooms:create', 'rooms:update'] satisfies Permission[],
};

async function main() {
  const { createdRoles, added } = await transaction(async (tx) => {
    const created = await tx
      .insert(role)
      .values([ADMIN, EDITOR].map(({ name, description }) => ({ id: nanoid(), name, description })))
      .onConflictDoNothing({ target: role.name })
      .returning({ name: role.name });

    const roles = await tx
      .select({ id: role.id, name: role.name })
      .from(role)
      .where(inArray(role.name, [ADMIN.name, EDITOR.name]));
    const roleId = (name: string) => {
      const id = roles.find((row) => row.name === name)?.id;
      if (!id) throw new Error(`role ${name} is missing after the insert`);
      return id;
    };

    const createdRoles = created.map((row) => row.name);
    const everyPermissionForAdmin = PERMISSIONS.map((permission) => ({ roleName: ADMIN.name, permission }));
    const editorDefaultsIfNew = createdRoles.includes(EDITOR.name)
      ? EDITOR.defaultPermissions.map((permission) => ({ roleName: EDITOR.name, permission }))
      : [];
    const wanted = [...everyPermissionForAdmin, ...editorDefaultsIfNew];
    const inserted = await tx
      .insert(rolePermission)
      .values(wanted.map(({ roleName, permission }) => ({ roleId: roleId(roleName), permission })))
      .onConflictDoNothing()
      .returning({ roleId: rolePermission.roleId, permission: rolePermission.permission });

    const added = wanted
      .filter((grant) => inserted.some((row) => row.roleId === roleId(grant.roleName) && row.permission === grant.permission))
      .map((grant) => `${grant.roleName} ${grant.permission}`);
    return { createdRoles, added };
  });

  console.log(`created roles: ${createdRoles.join(', ') || 'none'}`);
  console.log(`added permissions: ${added.join(', ') || 'none'}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
