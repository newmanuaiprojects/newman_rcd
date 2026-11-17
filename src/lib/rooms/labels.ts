import type { RoomType } from '@/types/types';

export const FLOORS = Array.from({ length: 11 }, (_, floor) => floor);

export function floorLabel(floor: number): string {
  return floor === 0 ? 'G' : String(floor);
}

export function roomTypeLabel(type: RoomType): string {
  return type
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
