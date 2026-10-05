import { useEffect } from 'react';

// React mounts over the static snapshot. Restore the native anchor after the
// actual page (including lazy routes) is present, so translated links land at
// the requested section instead of only keeping its name in the address bar.
export function useInitialFragment() {
  useEffect(() => {
    if (!window.location.hash) return undefined;
    let firstFrame;
    let secondFrame;
    firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        try {
          document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView({ behavior: 'instant', block: 'start' });
        } catch { /* An invalid URL fragment must not prevent page rendering. */ }
      });
    });
    return () => { cancelAnimationFrame(firstFrame); cancelAnimationFrame(secondFrame); };
  }, []);
}
