import { useEffect, useRef } from 'react';

/**
 * Modal keyboard: Enter submits when valid, Escape closes.
 * Attach ref to the `.modal` element (not the backdrop).
 *
 * Focus and keydown are split into mount-only effects so controlled-input
 * re-renders never re-run focus() or re-attach the listener.
 */
export function useModalKeyboard({ valid, onSubmit, onClose }) {
  const modalRef = useRef(null);

  const validRef = useRef(valid);
  validRef.current = valid;

  const submitRef = useRef(onSubmit);
  submitRef.current = onSubmit;

  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Effect A: focus first field once when the modal mounts
  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;

    const firstInput = el.querySelector(
      'input:not([type="radio"]):not([readonly]), textarea, select'
    );
    if (firstInput) {
      requestAnimationFrame(() => firstInput.focus());
    }
  }, []);

  // Effect B: keydown listener once; reads latest callbacks via refs
  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;

    const onKeyDown = (ev) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        ev.stopPropagation();
        closeRef.current();
        return;
      }
      if (ev.key === 'Enter') {
        if (ev.target instanceof HTMLButtonElement) return;
        if (!validRef.current) return;
        ev.preventDefault();
        ev.stopPropagation();
        submitRef.current();
      }
    };

    el.addEventListener('keydown', onKeyDown);
    return () => el.removeEventListener('keydown', onKeyDown);
  }, []);

  return modalRef;
}
