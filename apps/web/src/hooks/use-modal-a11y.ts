import { useEffect, useRef } from "react";

// Accessible behavior shared by the app's modal overlays:
// - closes on the Escape key
// - locks body scroll while open and restores the previous overflow on close
// Only `open` is a dependency so the listener and scroll lock are not torn down
// on every parent re-render; the latest close handler is read through a ref.
export function useModalA11y(open: boolean, onClose: () => void): void {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseRef.current();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);
}
