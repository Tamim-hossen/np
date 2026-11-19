'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ContactField,
  ContactForm,
  ContactSubmitButton,
} from '@/components/contact/ContactForm';

gsap.registerPlugin(ScrollTrigger);

const HEADING_LINES = ['Let’s', 'Get in', 'Touch'];

export function ContactSection() {
  const sectionRef = useRef<HTMLElement>(null);

  // Swarm rebuild: pieces start scattered, then converge into the layout
  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const context = gsap.context(() => {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const chars = gsap.utils.toArray<HTMLElement>('[data-swarm-char]');
      const items = gsap.utils.toArray<HTMLElement>('[data-swarm-item]');
      const shells = gsap.utils.toArray<HTMLElement>('[data-swarm-shell]');

      if (reducedMotion) {
        gsap.set([...chars, ...items, ...shells], { autoAlpha: 1 });
        return;
      }

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // random scatter positions for every piece
      const scatter = (spread: number, rotate: number) => () => ({
        x: gsap.utils.random(-vw * spread, vw * spread),
        y: gsap.utils.random(-vh * spread, vh * spread),
        rotation: gsap.utils.random(-rotate, rotate),
        scale: gsap.utils.random(0.2, 1.7),
        autoAlpha: 0,
      });

      const scatterChar = scatter(0.55, 220);
      const scatterItem = scatter(0.45, 35);

      gsap.set(shells, { autoAlpha: 0 });
      chars.forEach((el) => gsap.set(el, scatterChar()));
      items.forEach((el) => gsap.set(el, scatterItem()));

      const rebuild = gsap.timeline({ paused: true });

      // form card + details borders fade in under the swarm
      rebuild.to(shells, { autoAlpha: 1, duration: 0.6, ease: 'power2.out' }, 0);

      // heading letters swarm in
      rebuild.to(
        chars,
        {
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
          autoAlpha: 1,
          duration: 1.5,
          ease: 'expo.out',
          stagger: { each: 0.035, from: 'random' },
        },
        0,
      );

      // form fields, button and contact details swarm in
      rebuild.to(
        items,
        {
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
          autoAlpha: 1,
          duration: 1.3,
          ease: 'expo.out',
          stagger: { each: 0.07, from: 'random' },
        },
        0.25,
      );

      ScrollTrigger.create({
        trigger: section,
        start: 'top 50%',
        once: true,
        onEnter: () => rebuild.play(),
      });
    }, section);

    return () => context.revert();
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const finePointer = window.matchMedia(
      '(min-width: 768px) and (hover: hover) and (pointer: fine)',
    );
    if (!finePointer.matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const targets = Array.from(
      section.querySelectorAll<HTMLElement>('[data-contact-parallax]'),
    ).map((element) => {
      const type = element.dataset.contactParallax;
      const values =
        type === 'heading'
          ? { x: -8, y: -6, duration: 0.6 }
          : type === 'form'
            ? { x: 14, y: 10, duration: 0.5 }
            : { x: -10, y: -8, duration: 0.65 };

      return {
        element,
        ...values,
        moveX: gsap.quickTo(element, 'x', { duration: values.duration, ease: 'power3' }),
        moveY: gsap.quickTo(element, 'y', { duration: values.duration, ease: 'power3' }),
      };
    });

    const resetParallax = () => {
      targets.forEach((target) => {
        target.moveX(0);
        target.moveY(0);
      });
    };

    let cachedBounds: DOMRect | null = section.getBoundingClientRect();
    const updateBounds = () => {
      cachedBounds = section.getBoundingClientRect();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;

      const bounds = cachedBounds ?? section.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      ) {
        resetParallax();
        return;
      }

      const x = (event.clientX - bounds.left) / Math.max(bounds.width, 1) - 0.5;
      const y = (event.clientY - bounds.top) / Math.max(bounds.height, 1) - 0.5;
      targets.forEach((target) => {
        target.moveX(x * target.x);
        target.moveY(y * target.y);
      });
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', updateBounds, { passive: true });
    window.addEventListener('resize', updateBounds, { passive: true });
    section.addEventListener('pointerleave', resetParallax);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', updateBounds);
      window.removeEventListener('resize', updateBounds);
      section.removeEventListener('pointerleave', resetParallax);
      gsap.killTweensOf(targets.map((target) => target.element));
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="section-8"
      data-section="section-8"
      aria-labelledby="contact-heading"
      className="relative isolate w-full px-4  text-white py-12 sm:px-6 md:px-10 lg:px-12 lg:py-16"
    >
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16">
          <h2
            id="contact-heading"
            data-contact-parallax="heading"
            className="text-[clamp(4rem,9vw,8rem)] leading-[0.82] font-light tracking-[-0.065em] uppercase"
          >
            <span className="sr-only">Let&apos;s Get in Touch</span>
            {HEADING_LINES.map((line, lineIndex) => (
              <span key={lineIndex} aria-hidden="true" className="block">
                {Array.from(line).map((character, charIndex) => (
                  <span
                    key={charIndex}
                    data-swarm-char
                    className="inline-block will-change-transform"
                    style={{ visibility: 'hidden' }}
                  >
                    {character === ' ' ? '\u00a0' : character}
                  </span>
                ))}
              </span>
            ))}
          </h2>

          <ContactForm
            formId="home-contact-form"
            source="home"
            animate
            parallax
            className="pointer-events-auto w-full rounded-2xl border border-white/20 bg-white/[0.08] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:p-8"
          >
            <div className="space-y-6">
              <ContactField field="name" variant="dark" animated />
              <ContactField field="email" variant="dark" animated />
              <ContactField field="phone" variant="dark" animated />
              <ContactField field="projectType" variant="dark" animated />
              <ContactField field="message" variant="dark" animated />
              <ContactField field="consent" variant="dark" animated />

              <div
                data-swarm-item
                className="flex justify-end pt-2"
                style={{ visibility: 'hidden' }}
              >
                <ContactSubmitButton className="inline-flex items-center justify-center rounded-full bg-white px-6 py-2.5 text-[0.6rem] font-medium tracking-[0.18em] text-black uppercase transition hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-60">
                  Submit
                </ContactSubmitButton>
              </div>
            </div>
          </ContactForm>
        </div>

        <div
          data-contact-parallax="details"
          data-swarm-shell
          className="pointer-events-auto mt-10 grid gap-6 border-t border-white/20 pt-6 text-sm text-white/70 sm:grid-cols-2"
          style={{ visibility: 'hidden' }}
        >
          <div data-swarm-item style={{ visibility: 'hidden' }}>
            <p className="mb-2 text-[0.62rem] tracking-[0.2em] text-white/60 uppercase">
              Send a Message
            </p>
            <a href="https://wa.me/8801521104170" target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
          </div>

          <div data-swarm-item className="sm:text-right" style={{ visibility: 'hidden' }}>
            <p className="mb-2 text-[0.62rem] tracking-[0.2em] text-white/60 uppercase">
              Send an Email
            </p>
            <a href="mailto:tamimhossen003@gmail.com" className="transition hover:text-white">
              tamimhossen003@gmail.com
            </a>
          </div>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -bottom-px h-1 bg-[#080b10]"
      />
    </section>
  );
}