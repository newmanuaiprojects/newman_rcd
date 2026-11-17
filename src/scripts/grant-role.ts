import { asc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { role, user, userRole } from '@/lib/db/schema';

async function main() {
  const [email, roleName] = process.argv.slice(2);
  if (!email || !roleName) {
    console.error('usage: pnpm access:grant <email> <role>');
    process.exitCode = 1;
    return;
  }

  const [users, roles] = await db.batch([
    db.select({ id: user.id }).from(user).where(sql`lower(${user.email}) = ${email.toLowerCase()}`),
    db.select({ id: role.id, name: role.name }).from(role).orderBy(asc(role.name)),
  ]);
  const account = users[0];
  const target = roles.find((row) => row.name === roleName);

  if (!account) {
    console.error(`No account uses ${email}. Sign up first, then run this again.`);
    process.exitCode = 1;
    return;
  }
  if (!target) {
    console.error(`No role named ${roleName}. Roles: ${roles.map((row) => row.name).join(', ') || 'none, run pnpm access:seed'}`);
    process.exitCode = 1;
    return;
  }

  const granted = await db
    .insert(userRole)
    .values({ userId: account.id, roleId: target.id })
    .onConflictDoNothing()
    .returning({ roleId: userRole.roleId });
  console.log(granted.length > 0 ? `${email} is now ${roleName}.` : `${email} was already ${roleName}.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
