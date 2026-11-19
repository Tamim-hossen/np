'use client';

import dynamic from 'next/dynamic';
import {
  ContactField,
  ContactForm,
  ContactSubmitButton,
} from '@/components/contact/ContactForm';
import GeometricOrb from '@/components/contact/GeometricOrb';

const BackgroundCanvas = dynamic(
  () => import('@/components/canvas/BackgroundCanvas'),
  { ssr: false },
);

const CONTACT_EMAIL = 'tamimhossen003@gmail.com';

export function ContactPageContent() {
  return (
    <main className="large-mouse-effects relative isolate min-h-screen bg-[#080b10] text-white/65">
      <BackgroundCanvas
        blobColor="#fefefe"
        className="pointer-events-none z-10"
      />
      <section
        id="section-8"
        className="relative flex w-full justify-center"
      >
        <div className="grid w-full max-w-350 lg:grid-cols-2">
          <header className="relative z-20 flex flex-col justify-center px-6 py-30 sm:px-10 sm:py-16 lg:px-16 lg:py-20">
            <p className="font-mono text-[10px] tracking-[0.24em] text-white/65 uppercase">
              Start a conversation
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-[0.2em] italic uppercase sm:text-6xl md:text-7xl text-white">
              Contact
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/65">
              Have a project in mind? Tell me a little about it and I’ll get back
              to you as soon as I can.
            </p>

            <dl className="mt-8 space-y-5">
              <div className='flex flex-row justify-start items-center gap-2'>
                <dd className="mt-1 text-sm text-black/70">
                  <a
                    href="https://wa.me/8801623043299"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors uppercase text-white/55 hover:text-white/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b84437]"
                  >
                    Open WhatsApp
                  </a>
                </dd>
                <p className='w-px h-3 bg-white/65'/>
                <dd className="mt-1 break-words text-sm text-black/70">
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="transition-colors uppercase text-white/55 hover:text-white/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b84437]"
                  >
                    Send Email
                  </a>
                </dd>
              </div>
            </dl>
          </header>

<div
  role="img"
  aria-label="Animated white wireframe globe"
  className="relative z-20 h-[360px] w-full sm:h-[460px] lg:h-auto lg:min-h-[560px]"
>
  <div className="pointer-events-none absolute inset-0">
    <GeometricOrb
      config={{
        color: '#ffffff',
        background: 'transparent',
        enableZoom: false,
        enablePan: false,
      }}
    />
  </div>
</div>
        </div>
      </section>

      <section
        className="relative px-6 py-12 sm:px-10 sm:py-16 lg:px-16 lg:py-20"
      >
        <div aria-hidden="true" className="absolute inset-0 z-0 bg-[#f2f2f0]" />
        <div className="relative z-20 mx-auto max-w-[1440px]">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-10">
            <div>
              <p className="font-mono text-[9px] tracking-[0.22em] text-black/45 uppercase">
                A few details
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl text-black">
                Contact form
              </h2>
            </div>
            <p className="max-w-xs text-xs leading-5 text-black/50">
              Tell me what you’re building, and I’ll be in touch.
            </p>
          </div>

          <ContactForm
            formId="contact-page-form"
            source="contact"
            className="grid gap-x-10 gap-y-7 md:grid-cols-2 lg:gap-x-16"
          >
            <div className="space-y-5 sm:space-y-6">
              <ContactField field="name" variant="light" />
              <ContactField
                field="projectType"
                variant="light"
                form="contact-page-form"
                label="I’m interested in"
              />
              <ContactField field="email" variant="light" />
              <ContactField field="phone" variant="light" />
              <ContactField field="consent" variant="light" />
            </div>

            <div className="flex min-w-0 flex-col gap-5">
              <ContactField field="message" variant="light" />
              <div className="flex flex-col-reverse items-start justify-between gap-4 sm:flex-row sm:items-center">
                <p className="max-w-xs text-[10px] leading-4 text-black/45">
                  Your message will be saved so I can follow up.
                </p>
                <ContactSubmitButton className="cursor-pointer inline-flex min-h-11 items-center gap-3 bg-[#444444] px-6 text-[10px] font-semibold tracking-[0.18em] text-white uppercase transition-colors hover:bg-[#000000] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#b84437] disabled:cursor-not-allowed disabled:opacity-60">
                  <>
                    Send enquiry
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="size-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </>
                </ContactSubmitButton>
              </div>
            </div>
          </ContactForm>
        </div>
      </section>
    </main>
  );
}