import React, { useEffect, useRef } from 'react';

/**
 * Modal Component
 *
 * Renders centered over a semi-transparent backdrop.
 * - Closes on backdrop click
 * - Closes on Escape key press
 * - Traps focus within the modal while open
 *
 * Props:
 *   isOpen  {boolean}        - whether the modal is visible
 *   onClose {function}       - called when user dismisses the modal
 *   title   {string}         - modal header title
 *   children                 - modal body content
 *
 * Requirements: 12.4
 */
export default function Modal({ isOpen, onClose, title, children }) {
  const modalRef = useRef(null);

  // Focus the modal panel when it opens
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        modalRef.current.focus();
      }
    }
  }, [isOpen]);

  // Escape key closes the modal
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Tab trap: cycle focus within the modal
  function handleTabTrap(e) {
    if (e.key !== 'Tab') return;
    const focusable = Array.from(
      modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => !el.disabled);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label={title}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        onKeyDown={handleTabTrap}
        style={{
          background: 'rgba(13, 17, 23, 0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '28px 32px',
          minWidth: '340px',
          maxWidth: '560px',
          width: '100%',
          boxShadow: '0 8px 40px rgba(0, 0, 0, 0.5)',
          outline: 'none',
        }}
      >
        {title && (
          <h2
            style={{
              margin: '0 0 20px 0',
              fontSize: '1.2rem',
              fontFamily: 'var(--font-heading)',
              fontWeight: 600,
              color: '#e2e8f0',
            }}
          >
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
