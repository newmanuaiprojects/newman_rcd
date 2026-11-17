import type { ReactNode } from 'react';

interface FormSectionProps {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function FormSection({ id, title, description, children }: FormSectionProps) {
  return (
    <section aria-labelledby={id} className="grid gap-4 md:grid-cols-[14rem_1fr] md:gap-8">
      <div>
        <h2 id={id} className="text-base font-semibold text-gray-900">
          {title}
        </h2>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">{children}</div>
    </section>
  );
}
