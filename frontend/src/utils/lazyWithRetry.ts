import { lazy } from 'react';

const RETRY_KEY = 'acm-lazy-retry';

function isChunkLoadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('Failed to load module script') ||
    message.includes('error loading dynamically imported module')
  );
}

export function lazyWithRetry<T extends React.ComponentType<any>>(
  importer: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      const module = await importer();
      sessionStorage.removeItem(RETRY_KEY);
      return module;
    } catch (error) {
      if (typeof window !== 'undefined' && isChunkLoadError(error)) {
        const hasRetried = sessionStorage.getItem(RETRY_KEY) === 'true';

        if (!hasRetried) {
          sessionStorage.setItem(RETRY_KEY, 'true');
          window.location.reload();
          return new Promise<never>(() => {});
        }
      }

      throw error;
    }
  });
}
