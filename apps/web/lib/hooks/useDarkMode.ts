'use client';

import { useSyncExternalStore } from 'react';

// Single shared MutationObserver for all useDarkMode instances
const listeners = new Set<() => void>();
let observer: MutationObserver | null = null;

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  if (!observer && typeof document !== 'undefined') {
    observer = new MutationObserver(() => {
      listeners.forEach((l) => l());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }
  return () => {
    listeners.delete(callback);
    if (listeners.size === 0 && observer) {
      observer.disconnect();
      observer = null;
    }
  };
}

function getSnapshot(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

function getServerSnapshot(): boolean {
  return false;
}

export function useDarkMode(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
