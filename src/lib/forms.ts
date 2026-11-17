import type { z } from 'zod';

export interface FormState {
  errors: Record<string, string>;
}

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.join('.');
    errors[field] ??= issue.message;
  }
  return errors;
}
