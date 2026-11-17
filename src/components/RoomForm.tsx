'use client';

import { startTransition, useActionState, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import type { RoomFormState } from '@/actions/room-form';
import { fieldErrors, parseRoomForm, type RoomInput } from '@/lib/rooms/form';
import { FLOORS, floorLabel, roomTypeLabel } from '@/lib/rooms/labels';
import { ROOM_TYPES, type Building, type Feature } from '@/types/types';

interface RoomFormProps {
  action: (state: RoomFormState, formData: FormData) => Promise<RoomFormState>;
  buildings: Building[];
  features: Feature[];
  initial?: RoomInput;
  submitLabel: string;
  cancelHref: string;
}

const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500';

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function described(id: string, error?: string) {
  return { id, 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${id}-error` : undefined };
}

export function RoomForm({ action, buildings, features, initial, submitLabel, cancelHref }: RoomFormProps) {
  const [state, formAction, pending] = useActionState(action, { errors: {} });
  const [clientErrors, setClientErrors] = useState<Record<string, string> | null>(null);
  const [selected, setSelected] = useState(() => new Set(Object.keys(initial?.features ?? {})));
  const errors = clientErrors ?? state.errors;
  const categories = [...new Set(features.map((feature) => feature.category))];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const parsed = parseRoomForm(formData);
    if (!parsed.success) {
      setClientErrors(fieldErrors(parsed.error));
      return;
    }
    setClientErrors(null);
    startTransition(() => formAction(formData));
  }

  function toggle(featureId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(featureId)) next.add(featureId);
      return next;
    });
  }

  return (
    <form action={formAction} onSubmit={submit} noValidate className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 grid gap-5 sm:grid-cols-2">
        <Field id="buildingId" label="Building" error={errors.buildingId}>
          <select name="buildingId" defaultValue={initial?.buildingId ?? ''} className={input} {...described('buildingId', errors.buildingId)}>
            <option value="" disabled>
              Choose a building
            </option>
            {buildings.map((building) => (
              <option key={building.id} value={building.id}>
                {building.name} ({building.abbreviation})
              </option>
            ))}
          </select>
        </Field>
        <Field id="roomNumber" label="Room number" error={errors.roomNumber}>
          <input name="roomNumber" defaultValue={initial?.roomNumber} className={input} {...described('roomNumber', errors.roomNumber)} />
        </Field>
        <Field id="displayName" label="Display name (optional)" error={errors.displayName}>
          <input name="displayName" defaultValue={initial?.displayName ?? ''} className={input} {...described('displayName', errors.displayName)} />
        </Field>
        <Field id="roomType" label="Room type" error={errors.roomType}>
          <select name="roomType" defaultValue={initial?.roomType ?? ''} className={input} {...described('roomType', errors.roomType)}>
            <option value="" disabled>
              Choose a type
            </option>
            {ROOM_TYPES.map((type) => (
              <option key={type} value={type}>
                {roomTypeLabel(type)}
              </option>
            ))}
          </select>
        </Field>
        <Field id="floor" label="Floor" error={errors.floor}>
          <select name="floor" defaultValue={initial?.floor ?? ''} className={input} {...described('floor', errors.floor)}>
            <option value="" disabled>
              Choose a floor
            </option>
            {FLOORS.map((floor) => (
              <option key={floor} value={floor}>
                {floorLabel(floor)}
              </option>
            ))}
          </select>
        </Field>
        <Field id="capacity" label="Seats" error={errors.capacity}>
          <input name="capacity" inputMode="numeric" defaultValue={initial?.capacity} className={input} {...described('capacity', errors.capacity)} />
        </Field>
        <div className="sm:col-span-2 flex items-center gap-2">
          <input id="accessible" name="accessible" type="checkbox" defaultChecked={initial?.accessible ?? true} className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
          <label htmlFor="accessible" className="text-sm font-medium text-gray-700">
            Accessible
          </label>
        </div>
        <div className="sm:col-span-2">
          <Field id="notes" label="Notes (optional)" error={errors.notes}>
            <textarea name="notes" rows={3} defaultValue={initial?.notes ?? ''} className={input} {...described('notes', errors.notes)} />
          </Field>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Features</h2>
        {categories.map((category) => (
          <fieldset key={category} className="space-y-3">
            <legend className="text-sm font-medium text-gray-500 mb-2 capitalize">{category}</legend>
            {features
              .filter((feature) => feature.category === category)
              .map((feature) => {
                const checked = selected.has(feature.id);
                const saved = initial?.features[feature.id];
                const quantityId = `quantity-${feature.id}`;
                const detailsId = `details-${feature.id}`;
                const quantityError = errors[`features.${feature.id}.quantity`];
                const detailsError = errors[`features.${feature.id}.details`];
                return (
                  <div key={feature.id} className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <div className="flex items-center gap-2 sm:w-48 sm:pt-2">
                      <input
                        id={`feature-${feature.id}`}
                        name="features"
                        value={feature.id}
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(feature.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                      />
                      <label htmlFor={`feature-${feature.id}`} className="text-sm text-gray-900">
                        {feature.name}
                      </label>
                    </div>
                    {checked && (
                      <div className="grid gap-3 grid-cols-[6rem_1fr] flex-1">
                        <Field id={quantityId} label="Quantity" error={quantityError}>
                          <input
                            name={`quantity:${feature.id}`}
                            inputMode="numeric"
                            defaultValue={saved?.quantity ?? 1}
                            className={input}
                            {...described(quantityId, quantityError)}
                          />
                        </Field>
                        <Field id={detailsId} label="Details (optional)" error={detailsError}>
                          <input
                            name={`details:${feature.id}`}
                            defaultValue={saved?.details ?? ''}
                            className={input}
                            {...described(detailsId, detailsError)}
                          />
                        </Field>
                      </div>
                    )}
                  </div>
                );
              })}
          </fieldset>
        ))}
      </div>

      <div className="flex items-center justify-end gap-3">
        <Link href={cancelHref} className="text-gray-700 hover:text-blue-600 px-4 py-2 rounded transition-colors">
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg transition-colors"
        >
          {pending ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
