import { startTransition, useActionState, useState, type FormEvent } from 'react';
import type { z } from 'zod';
import { fieldErrors, type FormState } from '@/lib/forms';

type Check = (formData: FormData) => { success: true } | { success: false; error: z.ZodError };

export function useFormAction(action: (state: FormState, formData: FormData) => Promise<FormState>, check: Check) {
  const [state, formAction, pending] = useActionState(action, { errors: {} });
  const [clientErrors, setClientErrors] = useState<Record<string, string> | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const checked = check(formData);
    if (!checked.success) {
      setClientErrors(fieldErrors(checked.error));
      return;
    }
    setClientErrors(null);
    startTransition(() => formAction(formData));
  }

  return { errors: clientErrors ?? state.errors, formAction, pending, submit };
}
