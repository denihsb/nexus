import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Wires up standard dialog accessibility behavior for a modal:
 * - Moves focus into the dialog when it opens.
 * - Restores focus to whatever triggered it when it closes.
 * - Closes on Escape.
 * - Traps Tab/Shift+Tab within the dialog's focusable elements.
 *
 * Usage: attach `containerRef` to the dialog's outer element (the one
 * with role="dialog"), and pass the same `onClose` used by its close button.
 */
export function useModalA11y<T extends HTMLElement>(
  isOpen: boolean,
  onClose: () => void,
) {
  const containerRef = useRef<T | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const container = containerRef.current;
    const focusables = container
      ? Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      : [];
    (focusables[0] ?? container)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !container) return;
      const items = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused.current?.focus();
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- intentional: only re-run on open/close, not when the caller passes a new onClose closure each render
  }, [isOpen]);

  return containerRef;
}
