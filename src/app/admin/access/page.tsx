import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  addPermissionToRole,
  addRole,
  assignRole,
  deleteRole,
  grantUserPermission,
  removePermissionFromRole,
  removeRole,
  revokeUserPermission,
} from '@/actions/access';
import { AccessForm } from '@/components/AccessForm';
import { requirePermission } from '@/lib/access';
import { getAccessOverview } from '@/lib/access/data';
import { PERMISSIONS } from '@/lib/access/permissions';

export const metadata: Metadata = {
  title: 'Access | Newman RCD',
};

const chip = 'inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-800 pl-3 pr-1 py-1 text-sm';
const removeButton = 'rounded-full w-6 h-6 leading-none hover:bg-blue-100 transition-colors';
const addButton =
  'rounded-full border border-dashed border-gray-300 text-gray-600 px-3 py-1 text-sm hover:border-blue-600 hover:text-blue-600 transition-colors';
const card = 'bg-white rounded-xl border border-gray-100 shadow-sm p-5';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-gray-500 pt-1">{label}</dt>
      <dd className="flex flex-wrap items-start gap-2 text-sm text-gray-900">{children}</dd>
    </div>
  );
}

export default async function AccessPage() {
  await requirePermission('access:manage');
  const { people, roles } = await getAccessOverview();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <Link href="/" className="text-gray-500 hover:text-blue-600 transition-colors mb-6 inline-flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Directory
        </Link>

        <h1 className="text-4xl font-bold text-gray-900 mb-2">Access</h1>
        <p className="text-gray-600 mb-8">Choose who can add and edit rooms, and who can change access.</p>

        <section aria-labelledby="people-heading" className="mb-12">
          <h2 id="people-heading" className="text-2xl font-semibold text-gray-900 mb-4">
            People
          </h2>
          <ul className="space-y-4">
            {people.map((person) => (
              <li key={person.id} className={card}>
                <p className="font-semibold text-gray-900">{person.name}</p>
                <p className="text-sm text-gray-600 mb-4 break-all">{person.email}</p>
                <dl className="space-y-3">
                  <Row label="Can">
                    <span className="pt-1">{person.permissions.length > 0 ? person.permissions.join(', ') : 'No permissions'}</span>
                  </Row>
                  <Row label="Roles">
                    {person.roles.map((held) => (
                      <AccessForm key={held.id} action={removeRole} className={chip}>
                        <input type="hidden" name="userId" value={person.id} />
                        <input type="hidden" name="roleId" value={held.id} />
                        {held.name}
                        <button type="submit" aria-label={`Remove the ${held.name} role from ${person.name}`} className={removeButton}>
                          ×
                        </button>
                      </AccessForm>
                    ))}
                    {roles
                      .filter((row) => !person.roles.some((held) => held.id === row.id))
                      .map((row) => (
                        <AccessForm key={row.id} action={assignRole}>
                          <input type="hidden" name="userId" value={person.id} />
                          <input type="hidden" name="roleId" value={row.id} />
                          <button type="submit" aria-label={`Give ${person.name} the ${row.name} role`} className={addButton}>
                            + {row.name}
                          </button>
                        </AccessForm>
                      ))}
                  </Row>
                  <Row label="Given directly">
                    {PERMISSIONS.map((permission) =>
                      person.directPermissions.includes(permission) ? (
                        <AccessForm key={permission} action={revokeUserPermission} className={chip}>
                          <input type="hidden" name="userId" value={person.id} />
                          <input type="hidden" name="permission" value={permission} />
                          {permission}
                          <button type="submit" aria-label={`Take ${permission} away from ${person.name}`} className={removeButton}>
                            ×
                          </button>
                        </AccessForm>
                      ) : (
                        <AccessForm key={permission} action={grantUserPermission}>
                          <input type="hidden" name="userId" value={person.id} />
                          <input type="hidden" name="permission" value={permission} />
                          <button type="submit" aria-label={`Give ${person.name} ${permission}`} className={addButton}>
                            + {permission}
                          </button>
                        </AccessForm>
                      ),
                    )}
                  </Row>
                </dl>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="roles-heading">
          <h2 id="roles-heading" className="text-2xl font-semibold text-gray-900 mb-4">
            Roles
          </h2>
          <ul className="space-y-4 mb-6">
            {roles.map((row) => (
              <li key={row.id} className={card}>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="font-semibold text-gray-900">{row.name}</p>
                    {row.description && <p className="text-sm text-gray-600">{row.description}</p>}
                    <p className="text-sm text-gray-500">
                      {row.holderCount === 1 ? 'Held by 1 person' : `Held by ${row.holderCount} people`}
                    </p>
                  </div>
                  {row.holderCount === 0 && (
                    <AccessForm action={deleteRole}>
                      <input type="hidden" name="roleId" value={row.id} />
                      <button
                        type="submit"
                        aria-label={`Delete the ${row.name} role`}
                        className="text-sm text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        Delete role
                      </button>
                    </AccessForm>
                  )}
                </div>
                <dl>
                  <Row label="Permissions">
                    {PERMISSIONS.map((permission) =>
                      row.permissions.includes(permission) ? (
                        <AccessForm key={permission} action={removePermissionFromRole} className={chip}>
                          <input type="hidden" name="roleId" value={row.id} />
                          <input type="hidden" name="permission" value={permission} />
                          {permission}
                          <button type="submit" aria-label={`Take ${permission} out of the ${row.name} role`} className={removeButton}>
                            ×
                          </button>
                        </AccessForm>
                      ) : (
                        <AccessForm key={permission} action={addPermissionToRole}>
                          <input type="hidden" name="roleId" value={row.id} />
                          <input type="hidden" name="permission" value={permission} />
                          <button type="submit" aria-label={`Add ${permission} to the ${row.name} role`} className={addButton}>
                            + {permission}
                          </button>
                        </AccessForm>
                      ),
                    )}
                  </Row>
                </dl>
              </li>
            ))}
          </ul>

          <div className={`${card} flex flex-col`}>
            <h3 className="font-semibold text-gray-900 mb-3">New role</h3>
            <AccessForm action={addRole} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex flex-col gap-1">
                <label htmlFor="new-role-name" className="text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  id="new-role-name"
                  name="name"
                  required
                  className="border border-gray-300 rounded px-3 py-2 bg-white text-gray-900"
                />
              </div>
              <div className="flex flex-col gap-1 sm:flex-1">
                <label htmlFor="new-role-description" className="text-sm font-medium text-gray-700">
                  Description
                </label>
                <input
                  id="new-role-description"
                  name="description"
                  className="border border-gray-300 rounded px-3 py-2 bg-white text-gray-900"
                />
              </div>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors">
                Create role
              </button>
            </AccessForm>
          </div>
        </section>
      </div>
    </div>
  );
}
