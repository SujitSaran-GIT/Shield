import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
interface ModalProps { isOpen?: boolean; onClose: () => void; title?: ReactNode; children?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'; showCloseButton?: boolean; preventClose?: boolean; className?: string }
export default function Modal({ isOpen = true, onClose, title, children, size = 'md', showCloseButton = true, preventClose = false, className = '' }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !isOpen) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, [isOpen]);
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-full' };
  if (!isOpen) return null;
  return <dialog ref={ref} aria-labelledby={title ? titleId : undefined} aria-label={title ? undefined : 'Dialog'} onCancel={(event) => { event.preventDefault(); if (!preventClose) onClose(); }} onClick={(event) => { if (!preventClose && event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }} className={`m-auto max-h-[90dvh] w-[calc(100%-2rem)] overflow-auto rounded-xl border border-gray-200 bg-white p-0 text-gray-900 shadow-xl backdrop:bg-black/60 dark:bg-gray-800 dark:text-white ${sizes[size]} ${className}`}>
    <div className="relative">{title && <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-6 py-4 dark:border-gray-700"><h2 id={titleId} className="text-xl font-semibold">{title}</h2>{showCloseButton && !preventClose && <button type="button" onClick={onClose} aria-label="Close dialog" className="icon-button"><X /></button>}</div>}{!title && showCloseButton && !preventClose && <button type="button" onClick={onClose} aria-label="Close dialog" className="icon-button absolute right-3 top-3"><X /></button>}<div className="p-6">{children}</div></div>
  </dialog>;
}
