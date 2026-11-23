export const PERMISSIONS = ['rooms:create', 'rooms:update', 'access:manage'] as const;

export type Permission = (typeof PERMISSIONS)[number];

export function parsePermission(value: string): Permission | undefined {
  return PERMISSIONS.find((permission) => permission === value);
}
