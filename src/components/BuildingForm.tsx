'use client';

import Link from 'next/link';
import { described, Field, input } from '@/components/FormFields';
import { FormSection } from '@/components/FormSection';
import { useFormAction } from '@/components/useFormAction';
import { parseBuildingForm } from '@/lib/buildings/form';
import type { FormState } from '@/lib/forms';

interface BuildingFormProps {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  cancelHref: string;
}

export function BuildingForm({ action, cancelHref }: BuildingFormProps) {
  const { errors, formAction, pending, submit } = useFormAction(action, parseBuildingForm);

  return (
    <form action={formAction} onSubmit={submit} noValidate className="space-y-10">
      <FormSection id="building-heading" title="Building" description="Rooms are listed by the short code, like ECK 260.">
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <Field id="name" label="Name" error={errors.name}>
            <input name="name" placeholder="Eck Hall" className={input} {...described('name', errors.name)} />
          </Field>
          <Field id="abbreviation" label="Short code" error={errors.abbreviation}>
            <input
              name="abbreviation"
              placeholder="ECK"
              autoCapitalize="characters"
              className={`${input} uppercase`}
              {...described('abbreviation', errors.abbreviation)}
            />
          </Field>
        </div>
      </FormSection>

      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
        <Link href={cancelHref} className="rounded-lg px-4 py-2 text-gray-700 transition-colors hover:text-blue-600">
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-600 px-5 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Add building'}
        </button>
      </div>
    </form>
  );
}
