'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  PROJECT_TYPES,
  type ContactMessagePayload,
  type MessageSource,
} from '@/model/Message';

type ContactFormVariant = 'dark' | 'light';
type ContactFieldName =
  | 'name'
  | 'email'
  | 'phone'
  | 'projectType'
  | 'message'
  | 'consent';

const FIELD_LABELS: Record<ContactFieldName, string> = {
  name: 'Full name',
  email: 'Email address',
  phone: 'Phone number',
  projectType: 'Project type',
  message: 'Your message',
  consent: '',
};

const SUBMISSION_CONTEXT = createContext(false);

interface ContactFormProps {
  formId: string;
  source: MessageSource;
  className: string;
  animate?: boolean;
  parallax?: boolean;
  children: ReactNode;
}

interface ContactFieldProps {
  field: ContactFieldName;
  variant: ContactFormVariant;
  animated?: boolean;
  form?: string;
  label?: string;
}

function responseErrorMessage(body: unknown): string {
  if (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof body.error === 'string'
  ) {
    return body.error;
  }

  return 'Your message could not be sent. Please try again.';
}

export function ContactForm({
  formId,
  source,
  className,
  animate = false,
  parallax = false,
  children,
}: ContactFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );
  const submittingRef = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = (nextToast: { type: 'success' | 'error'; message: string }) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(nextToast);
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload: ContactMessagePayload = {
      name: String(formData.get('name') ?? ''),
      email: String(formData.get('email') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      projectType: String(formData.get('projectType') ?? ''),
      message: String(formData.get('message') ?? ''),
      consent: formData.get('consent') === 'on',
      source,
    };

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const responseBody: unknown = await response.json();

      if (!response.ok) {
        showToast({ type: 'error', message: responseErrorMessage(responseBody) });
        return;
      }

      form.reset();
      showToast({ type: 'success', message: 'Message received — thanks for reaching out.' });
    } catch (error) {
      console.error('Contact message submission failed', error);
      showToast({
        type: 'error',
        message: 'Your message could not be sent. Please try again.',
      });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form
        id={formId}
        onSubmit={handleSubmit}
        aria-busy={isSubmitting}
        data-swarm-shell={animate ? '' : undefined}
        data-contact-parallax={parallax ? 'form' : undefined}
        className={className}
        style={animate ? { visibility: 'hidden' } : undefined}
      >
        <SUBMISSION_CONTEXT.Provider value={isSubmitting}>
          {children}
        </SUBMISSION_CONTEXT.Provider>
      </form>

      <div
        className={`pointer-events-none fixed inset-x-4 top-4 z-[1000] flex justify-center transition-all duration-300 motion-reduce:transition-none ${
          toast ? 'translate-y-0 opacity-100' : '-translate-y-16 opacity-0'
        }`}
      >
        {toast && (
          <div
            role={toast.type === 'success' ? 'status' : 'alert'}
            aria-live={toast.type === 'success' ? 'polite' : 'assertive'}
            aria-atomic="true"
            className={`pointer-events-auto max-w-lg border px-5 py-3 text-center text-sm shadow-lg ${
              toast.type === 'success'
                ? 'border-[#1e513d] bg-[#173b2e] text-white'
                : 'border-red-300 bg-red-50 text-red-900'
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </>
  );
}

export function ContactField({
  field,
  variant,
  animated = false,
  form,
  label,
}: ContactFieldProps) {
  const isDark = variant === 'dark';
  const labelText = label ?? FIELD_LABELS[field];
  const labelClass = isDark
    ? 'mb-2 block text-[0.62rem] font-medium tracking-[0.2em] text-white/60 uppercase'
    : 'mb-2 block text-[11px] text-black/70';
  const inputClass = isDark
  ? 'w-full border-0 border-b border-white/35 bg-transparent px-0 pb-3 text-base text-white placeholder:text-white/35 focus:border-white/70 focus:outline-none'
  : 'h-12 w-full border border-black/25 bg-transparent px-3 text-sm text-black placeholder:text-black/40 outline-none transition-colors focus:border-black focus:ring-1 focus:ring-black';
    const animationProps = animated
    ? { 'data-swarm-item': '', style: { visibility: 'hidden' as const } }
    : {};

  if (field === 'consent') {
    return (
      <label
        className={`flex items-start gap-3 pt-1 text-xs leading-5 ${
          isDark ? 'text-white/60' : 'text-black/60'
        }`}
        {...animationProps}
      >
        <input
          type="checkbox"
          name="consent"
          required
          className={`mt-1 size-4 shrink-0 focus-visible:outline focus-visible:outline-offset-2 ${
            isDark
              ? 'accent-white focus-visible:outline-white'
              : 'accent-[#000000] focus-visible:outline-[#000000]'
          }`}
        />
        <span>
          I agree to share these details so Tamim can respond to my enquiry.
          <span aria-hidden="true"> *</span>
        </span>
      </label>
    );
  }

  const required = field !== 'phone';

  return (
    <label className="block" {...animationProps}>
      <span className={labelClass}>
        {labelText}
        {required && <span aria-hidden="true"> *</span>}
      </span>
      {field === 'projectType' ? (
        <div className="relative">
          <select
  id={form ? `${form}-project-type` : undefined}
  name="projectType"
  form={form}
  defaultValue=""
  required
  className={`${inputClass} appearance-none ${
    isDark ? 'pr-8 [color-scheme:dark]' : 'pr-11 [color-scheme:light]'
  }`}
>
  <option value="" disabled>
    Choose a project type
  </option>

  {PROJECT_TYPES.map((projectType) => (
    <option
  key={projectType}
  value={projectType}
  className={
    isDark
      ? 'bg-[#171717] text-white'
      : 'bg-white text-black'
  }
>
  {projectType}
</option>
  ))}
</select>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className={`pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 ${
              isDark ? 'text-white/60' : 'text-black/60'
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          >
            <path d="m7 10 5 5 5-5" />
          </svg>
        </div>
      ) : field === 'message' ? (
        <textarea
          name="message"
          rows={variant === 'dark' ? 4 : 6}
          maxLength={5000}
          placeholder="Tell me a little about your project..."
          required
          className={
            isDark
              ? `${inputClass} min-h-32 resize-y`
              : 'min-h-40 w-full flex-1 resize-y border border-black/25 bg-transparent p-3 text-sm text-black placeholder:text-black/40 outline-none transition-colors focus:border-black focus:ring-1 focus:ring-black'
          }
        />
      ) : (
        <input
          type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
          name={field}
          autoComplete={field === 'name' ? 'name' : field === 'email' ? 'email' : 'tel'}
          maxLength={field === 'name' ? 120 : field === 'email' ? 254 : 40}
          placeholder={
            field === 'name'
              ? 'Your name'
              : field === 'email'
                ? 'you@example.com'
                : 'Optional'
          }
          required={required}
          className={inputClass}
        />
      )}
    </label>
  );
}

export function ContactSubmitButton({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  const isSubmitting = useContext(SUBMISSION_CONTEXT);

  return (
    <button type="submit" disabled={isSubmitting} className={className}>
      {isSubmitting ? 'Sending…' : children}
    </button>
  );
}
