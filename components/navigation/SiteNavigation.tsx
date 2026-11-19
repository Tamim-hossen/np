'use client';

import Link from 'next/link';
import { useLayoutEffect, useRef, useState } from 'react';
import { useLenis } from 'lenis/react';

const menuItems = [
  { label: 'Home', href: '/' },
  { label: 'Projects', href: '/projects' },
  { label: 'Case Studies', href: '/case-studies' },
  { label: 'Contact', href: '/contact' },
];

const socialLinks = [
  { label: 'GitHub', href: 'https://github.com/Tamim-hossen' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/tamim-hossen-th/' },
  { label: 'Facebook', href: 'https://www.facebook.com/tamim.hossen.007' },
];

export function SiteNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const lenis = useLenis();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const root = document.documentElement;
    const body = document.body;
    const trigger = triggerRef.current;
    const previousRootOverflow = root.style.getPropertyValue('overflow');
    const previousRootOverflowPriority = root.style.getPropertyPriority('overflow');
    const previousBodyOverflow = body.style.getPropertyValue('overflow');
    const previousBodyOverflowPriority = body.style.getPropertyPriority('overflow');
    const previousPaddingRight = root.style.getPropertyValue('padding-right');
    const previousPaddingRightPriority = root.style.getPropertyPriority('padding-right');
    const wasLenisStopped = lenis?.isStopped ?? false;
    const scrollbarWidth = window.innerWidth - root.clientWidth;

    lenis?.stop();
    root.style.setProperty('overflow', 'hidden', 'important');
    body.style.setProperty('overflow', 'hidden', 'important');
    if (scrollbarWidth > 0) {
      root.style.setProperty('padding-right', `${scrollbarWidth}px`);
    }

    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href]',
        ),
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!panelRef.current.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      if (previousRootOverflow) {
        root.style.setProperty(
          'overflow',
          previousRootOverflow,
          previousRootOverflowPriority,
        );
      } else {
        root.style.removeProperty('overflow');
      }

      if (previousBodyOverflow) {
        body.style.setProperty(
          'overflow',
          previousBodyOverflow,
          previousBodyOverflowPriority,
        );
      } else {
        body.style.removeProperty('overflow');
      }

      if (previousPaddingRight) {
        root.style.setProperty(
          'padding-right',
          previousPaddingRight,
          previousPaddingRightPriority,
        );
      } else {
        root.style.removeProperty('padding-right');
      }

      if (!wasLenisStopped) lenis?.start();
      document.removeEventListener('keydown', onKeyDown);
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [isOpen, lenis]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Open navigation menu"
        aria-controls="site-navigation-panel"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
        className="fixed left-4 top-4 z-[1100] grid size-12 place-items-center rounded-lg cursor-pointer border border-black/10 bg-white/70 text-black shadow-lg transition-transform hover:bg-white/90 transition focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-black"
        style={{
          left: 'max(1rem, env(safe-area-inset-left))',
          top: 'max(1rem, env(safe-area-inset-top))',
        }}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      <button
        type="button"
        tabIndex={-1}
        aria-label="Close navigation menu"
        aria-hidden={!isOpen}
        onClick={() => setIsOpen(false)}
        className={`fixed inset-0 z-[1200] bg-black/55 backdrop-blur-[2px] transition-opacity duration-300 motion-reduce:transition-none ${
          isOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        }`}
      />

      <div
        ref={panelRef}
        id="site-navigation-panel"
        role="dialog"
        aria-modal={isOpen}
        aria-label="Site navigation"
        aria-hidden={!isOpen}
        className={`fixed inset-y-0 left-0 z-[1201] flex h-screen h-[100dvh] w-[min(88vw,24rem)] max-w-full flex-col bg-white px-6 pb-8 text-black shadow-[0_0_80px_rgba(0,0,0,0.2)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none sm:px-8 ${
          isOpen
            ? 'pointer-events-auto translate-x-0'
            : 'pointer-events-none -translate-x-full'
        }`}
        style={{
          paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
          paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex items-center justify-between border-b border-black/10 pb-6">
          <p className="font-mono text-[10px] tracking-[0.24em] text-black/50 uppercase">
            Menu
          </p>
          <button
            ref={closeRef}
            type="button"
            tabIndex={isOpen ? 0 : -1}
            aria-label="Close navigation menu"
            onClick={() => setIsOpen(false)}
            className="grid size-11 place-items-center rounded-xl cursor-pointer border border-black/15 transition-colors hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <nav aria-label="Main navigation" className="mt-8 flex-1 overflow-y-auto">
          <ul>
            {menuItems.map((item) => (
              <li key={item.href} className="border-b border-black/10">
                <Link
                  href={item.href}
                  tabIndex={isOpen ? 0 : -1}
                  onClick={() => setIsOpen(false)}
                  className="group flex min-h-16 items-center gap-4 py-4 text-2xl font-medium tracking-tight transition-[padding,color] hover:pl-2 hover:text-black/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:min-h-[4.5rem] sm:text-3xl"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-auto border-t border-black/10 pt-6">
          <p className="font-mono text-[10px] tracking-[0.24em] text-black/50 uppercase">
            Socials
          </p>
          <ul className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2.5">
            {socialLinks.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  tabIndex={isOpen ? 0 : -1}
                  className="group inline-flex items-center gap-1.5 text-sm font-medium tracking-tight text-black/75 transition-colors hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:text-base"
                >
                  <span>{item.label}</span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="size-3.5 text-black/40 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-black"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 17 17 7M7 7h10v10" />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
