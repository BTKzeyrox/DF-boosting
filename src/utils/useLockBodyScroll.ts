import { useEffect } from 'react';

let activeLocksCount = 0;
let originalBodyOverflow = '';
let originalHtmlOverflow = '';
let originalBodyOverscroll = '';
let originalHtmlOverscroll = '';

/**
 * Custom hook to lock body & html scrolling when a modal or lightbox is active.
 * Uses reference counting so nested modals (e.g. DayDetailsModal -> LightboxModal)
 * do not prematurely release the scroll lock when an inner modal closes.
 * Also configures overscroll-behavior to prevent scroll chaining in the background.
 */
export function useLockBodyScroll(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return;

    if (activeLocksCount === 0) {
      originalBodyOverflow = document.body.style.overflow;
      originalHtmlOverflow = document.documentElement.style.overflow;
      originalBodyOverscroll = document.body.style.overscrollBehavior;
      originalHtmlOverscroll = document.documentElement.style.overscrollBehavior;

      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'contain';
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.overscrollBehavior = 'contain';
    }

    activeLocksCount++;

    return () => {
      activeLocksCount = Math.max(0, activeLocksCount - 1);
      if (activeLocksCount === 0) {
        document.body.style.overflow = originalBodyOverflow;
        document.body.style.overscrollBehavior = originalBodyOverscroll;
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.documentElement.style.overscrollBehavior = originalHtmlOverscroll;
      }
    };
  }, [isLocked]);
}

