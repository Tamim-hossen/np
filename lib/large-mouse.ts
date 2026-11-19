const LARGE_MOUSE_QUERY =
  '(min-width: 1281px) and (any-hover: hover) and (any-pointer: fine)';

let largeMouseQuery: MediaQueryList | undefined;

export function isLargeMouseViewport(): boolean {
  if (typeof window === 'undefined') return false;
  largeMouseQuery ??= window.matchMedia(LARGE_MOUSE_QUERY);
  return largeMouseQuery.matches;
}
