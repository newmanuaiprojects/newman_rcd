'use client';

import { startTransition, useActionState, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import type { RoomFormState } from '@/actions/room-form';
import { FormSection } from '@/components/FormSection';
import { RoomPhotoField } from '@/components/RoomPhotoField';
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

const box =
  'rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 aria-[invalid=true]:border-red-500';
const input = `${box} w-full`;
const checkbox = 'h-4 w-4 shrink-0 accent-blue-600';

function described(id: string, error?: string) {
  return { id, 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${id}-error` : undefined };
}

function ErrorText({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={`${id}-error`} className="mt-1 text-sm text-red-600">
      {error}
    </p>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
      <ErrorText id={id} error={error} />
    </div>
  );
}

export function RoomForm({ action, buildings, features, initial, submitLabel, cancelHref }: RoomFormProps) {
  const [state, formAction, pending] = useActionState(action, { errors: {} });
  const [clientErrors, setClientErrors] = useState<Record<string, string> | null>(null);
  const [selected, setSelected] = useState(() => new Set(Object.keys(initial?.features ?? {})));
  const [uploading, setUploading] = useState<ReadonlySet<string>>(new Set());
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

  function trackUpload(field: string) {
    return (busy: boolean) =>
      setUploading((current) => {
        const next = new Set(current);
        if (busy) next.add(field);
        else next.delete(field);
        return next;
      });
  }

  function toggle(featureId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(featureId)) next.add(featureId);
      return next;
    });
  }

  function featureBox(feature: Feature) {
    return (
      <input
        id={`feature-${feature.id}`}
        name="features"
        value={feature.id}
        type="checkbox"
        checked={selected.has(feature.id)}
        onChange={() => toggle(feature.id)}
        className={checkbox}
      />
    );
  }

  function tileClass(checked: boolean) {
    return `rounded-lg border px-3 py-2.5 text-sm transition-colors ${
      checked ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-gray-200 text-gray-900 hover:border-gray-300'
    }`;
  }

  function countedFeature(feature: Feature) {
    const checked = selected.has(feature.id);
    const saved = initial?.features[feature.id];
    const quantityId = `quantity-${feature.id}`;
    const detailsId = `details-${feature.id}`;
    const quantityError = errors[`features.${feature.id}.quantity`];
    const detailsError = errors[`features.${feature.id}.details`];
    return (
      <div key={feature.id} className={tileClass(checked)}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <label htmlFor={`feature-${feature.id}`} className="flex w-40 cursor-pointer items-center gap-3">
            {featureBox(feature)}
            {feature.name}
          </label>
          {checked && (
            <>
              <div className="flex items-center gap-2">
                <label htmlFor={quantityId} className="whitespace-nowrap text-gray-600">
                  How many
                </label>
                <input
                  name={`quantity:${feature.id}`}
                  inputMode="numeric"
                  defaultValue={saved?.quantity ?? 1}
                  className={`${box} w-20 py-1.5`}
                  {...described(quantityId, quantityError)}
                />
              </div>
              <div className="flex min-w-56 flex-1 items-center gap-2">
                <label htmlFor={detailsId} className="text-gray-600">
                  Details
                </label>
                <input
                  name={`details:${feature.id}`}
                  defaultValue={saved?.details ?? ''}
                  placeholder="Optional"
                  className={`${input} py-1.5`}
                  {...described(detailsId, detailsError)}
                />
              </div>
            </>
          )}
        </div>
        <ErrorText id={quantityId} error={quantityError} />
        <ErrorText id={detailsId} error={detailsError} />
      </div>
    );
  }

  return (
    <form action={formAction} onSubmit={submit} noValidate className="space-y-10">
      <FormSection id="room-heading" title="Room" description="Where the room is and what it is used for.">
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
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
          <Field id="displayName" label="Display name (optional)" error={errors.displayName}>
            <input name="displayName" defaultValue={initial?.displayName ?? ''} className={input} {...described('displayName', errors.displayName)} />
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
          <Field id="capacity" label="Capacity" error={errors.capacity}>
            <input name="capacity" inputMode="numeric" defaultValue={initial?.capacity} className={input} {...described('capacity', errors.capacity)} />
          </Field>
          <label htmlFor="accessible" className="flex cursor-pointer items-center gap-3 text-sm font-medium text-gray-700 sm:col-span-2">
            <input id="accessible" name="accessible" type="checkbox" defaultChecked={initial?.accessible ?? true} className={checkbox} />
            Accessible
          </label>
          <div className="sm:col-span-2">
            <Field id="notes" label="Notes (optional)" error={errors.notes}>
              <textarea name="notes" rows={3} defaultValue={initial?.notes ?? ''} className={input} {...described('notes', errors.notes)} />
            </Field>
          </div>
        </div>
      </FormSection>

      <FormSection id="photos-heading" title="Photos" description="A front and a rear view help people recognize the room.">
        <div className="grid gap-6 sm:grid-cols-2">
          <RoomPhotoField
            name="photoFront"
            label="Front view"
            initialUrl={initial?.photoFront ?? null}
            error={errors.photoFront}
            onUploadingChange={trackUpload('photoFront')}
          />
          <RoomPhotoField
            name="photoBack"
            label="Rear view"
            initialUrl={initial?.photoBack ?? null}
            error={errors.photoBack}
            onUploadingChange={trackUpload('photoBack')}
          />
        </div>
      </FormSection>

      <FormSection id="features-heading" title="Features" description="Check everything the room has. Add how many for the things people count.">
        <div className="space-y-6">
          {categories.map((category) => {
            const inCategory = features.filter((feature) => feature.category === category);
            const counted = inCategory.filter((feature) => feature.counted);
            const yesOrNo = inCategory.filter((feature) => !feature.counted);
            return (
              <fieldset key={category}>
                <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{category}</legend>
                {counted.length > 0 && <div className="mb-2 space-y-2">{counted.map(countedFeature)}</div>}
                {yesOrNo.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {yesOrNo.map((feature) => (
                      <label
                        key={feature.id}
                        htmlFor={`feature-${feature.id}`}
                        className={`flex cursor-pointer items-center gap-3 ${tileClass(selected.has(feature.id))}`}
                      >
                        {featureBox(feature)}
                        {feature.name}
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>
            );
          })}
        </div>
      </FormSection>

      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
        <Link href={cancelHref} className="rounded-lg px-4 py-2 text-gray-700 transition-colors hover:text-blue-600">
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending || uploading.size > 0}
          className="rounded-lg bg-blue-600 px-5 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
