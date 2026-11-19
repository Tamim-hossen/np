'use client';

import ReactDOM from 'react-dom';

/** Injects resource hints into <head> using React 19's imperative APIs.
 *  This is the correct App Router pattern — no manual <head> block needed. */
export function ResourceHints() {
  ReactDOM.prefetchDNS('https://res.cloudinary.com');
  ReactDOM.preconnect('https://res.cloudinary.com', { crossOrigin: 'anonymous' });
  return null;
}
