'use client';

import { ReactNode, useEffect } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ open, title, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;

    const { body } = document;
    const lockCount = Number(body.dataset.modalLockCount ?? '0');
    const nextLockCount = lockCount + 1;
    body.dataset.modalLockCount = String(nextLockCount);

    if (lockCount === 0) {
      body.dataset.modalOriginalOverflow = body.style.overflow;
      body.style.overflow = 'hidden';
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);

      const currentLockCount = Number(body.dataset.modalLockCount ?? '1');
      const updatedLockCount = Math.max(0, currentLockCount - 1);

      if (updatedLockCount === 0) {
        body.style.overflow = body.dataset.modalOriginalOverflow ?? '';
        delete body.dataset.modalOriginalOverflow;
        delete body.dataset.modalLockCount;
      } else {
        body.dataset.modalLockCount = String(updatedLockCount);
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      aria-modal='true'
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4'
      role='dialog'
    >
      <button
        aria-label='Close modal'
        className='absolute inset-0 cursor-default'
        onClick={onClose}
        type='button'
      />

      <div className='relative z-10 w-full max-w-md rounded-2xl border border-black/10 bg-white p-4 shadow-lg'>
        <div className='mb-3 flex items-center justify-between gap-2'>
          <h2 className='text-lg font-bold'>{title}</h2>
          <button
            className='rounded-lg border border-black/15 bg-white px-2 py-1 text-sm font-semibold'
            onClick={onClose}
            type='button'
          >
            Sluiten
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
