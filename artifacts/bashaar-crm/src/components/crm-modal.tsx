import { X } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  type FormEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

export const fieldClass =
  'h-10 w-full rounded-lg border border-input bg-white px-3 text-sm text-black outline-none transition-[border-color,box-shadow] placeholder:text-[#5c574e] focus-visible:border-[hsl(var(--accent))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent)/.25)] disabled:cursor-not-allowed disabled:opacity-50';

export const textareaClass =
  'min-h-[96px] w-full resize-y rounded-lg border border-input bg-white px-3 py-2.5 text-sm text-black outline-none transition-[border-color,box-shadow] placeholder:text-[#5c574e] focus-visible:border-[hsl(var(--accent))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent)/.25)] disabled:cursor-not-allowed disabled:opacity-50';

export const selectClass = fieldClass;

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-[#fbf8f1] p-4">
      <div className="mb-3">
        <h3 className="text-[13px] font-extrabold tracking-[-.01em] text-foreground">{title}</h3>
        {description && <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function FormField({
  label,
  hint,
  error,
  required,
  className = '',
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`grid gap-1.5 ${className}`}>
      <span className="text-[11px] font-bold text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-[hsl(var(--destructive))]">*</span>}
      </span>
      {children}
      {error ? (
        <span className="text-[11px] font-semibold text-[hsl(var(--destructive))]" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="text-[11px] leading-relaxed text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  );
}

export function Modal({
  title,
  eyebrow,
  description,
  onClose,
  children,
  footer,
  wide,
  testId,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  testId?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const leavingRef = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  closeRef.current = onClose;

  const requestClose = () => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    const panel = panelRef.current;
    const overlay = panel?.parentElement;
    panel?.classList.add('crm-modal-leave');
    overlay?.classList.add('crm-modal-overlay-leave');
    window.setTimeout(() => closeRef.current(), 180);
  };

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => {
      const root = panelRef.current;
      if (!root) return;
      const focusable = root.querySelector<HTMLElement>(
        'input, select, textarea, button:not([data-modal-close])',
      );
      // Keep the dialog anchored at its initial position. Focusing the first
      // field without preventScroll can scroll a tall form past its header,
      // which makes the top of the form appear to be missing.
      (focusable ?? root).focus({ preventScroll: true });
    });

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const nodes = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(node => !node.hasAttribute('disabled') && node.tabIndex !== -1);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, []);

  // Rendered via a portal straight onto <body>. If this markup stayed
  // nested inside a page's "animate-rise" wrapper (or anything else with
  // a transform/filter/perspective), position: fixed below would stop
  // being relative to the viewport and instead clip to that ancestor's
  // box — which is what was cutting off the header/footer and shrinking
  // the modal. Portaling out of the page tree makes that impossible.
  return createPortal(
    <div
      className="crm-modal-overlay fixed inset-0 z-50 flex min-h-0 items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4"
      onMouseDown={event => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        data-testid={testId}
        className={`crm-modal-panel flex h-[100dvh] max-h-[100dvh] min-h-0 w-full flex-col overflow-hidden rounded-t-2xl border border-card-border bg-card shadow-[var(--shadow-modal)] outline-none sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl ${
          wide ? 'sm:max-w-5xl' : 'sm:max-w-xl'
        }`}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border bg-white px-5 py-4 sm:px-8 sm:py-6">
          <div className="min-w-0">
            {eyebrow && (
              <div className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-[hsl(var(--accent-foreground))]">
                {eyebrow}
              </div>
            )}
            <h2 id={titleId} className="mt-1 text-xl font-extrabold tracking-[-.03em] sm:text-3xl">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            data-modal-close="true"
            onClick={requestClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent)/.35)]"
            aria-label="Close"
            data-testid="button-close-modal"
          >
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto bg-white px-5 py-5 sm:px-8 sm:py-7">
          {children}
        </div>
        {footer && (
          <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-8 sm:py-5">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function ModalForm({
  onSubmit,
  children,
}: {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      {children}
    </form>
  );
}
