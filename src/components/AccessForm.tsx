'use client';

import { useActionState, type ReactNode } from 'react';
import type { AccessFormState } from '@/actions/access';

interface AccessFormProps {
  action: (state: AccessFormState, formData: FormData) => Promise<AccessFormState>;
  className?: string;
  children: ReactNode;
}

export function AccessForm({ action, className, children }: AccessFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <form action={formAction} className={className}>
        <fieldset disabled={pending} className="contents">
          {children}
        </fieldset>
      </form>
      {state.error && (
        <p role="alert" className="text-sm text-red-600 max-w-xs">
          {state.error}
        </p>
      )}
    </div>
  );
}
