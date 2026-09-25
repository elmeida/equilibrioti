import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

export function ExpandablePanel({ title, className = '', children }: {
  title: string; className?: string; children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);

  useEffect(() => {
    if (!expanded) {
      if (restoreFocus.current) toggle.current?.focus({ preventScroll: true });
      restoreFocus.current = false;
      return;
    }
    const element = dialog.current!;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    toggle.current?.focus();
    restoreFocus.current = true;
    return () => {
      element.close();
      document.body.style.overflow = overflow;
    };
  }, [expanded]);

  const panel = <article className={`expandable-panel ${className} ${expanded ? 'panel-expanded' : ''}`}>
    <button ref={toggle} type="button" className="icon-button panel-expand-toggle"
      aria-label={`${expanded ? 'Restaurar' : 'Ampliar'} ${title}`}
      aria-haspopup={expanded ? undefined : 'dialog'}
      title={expanded ? 'Sair da tela cheia' : 'Ver em tela cheia'}
      onClick={() => setExpanded(value => !value)}>
      {expanded ? <Minimize2 size={18} aria-hidden="true" /> : <Maximize2 size={18} aria-hidden="true" />}
    </button>
    {children}
  </article>;

  return expanded
    ? <dialog ref={dialog} className="panel-fullscreen-dialog" aria-label={title}
      onCancel={event => { event.preventDefault(); setExpanded(false); }}
      onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], summary, [tabindex="0"]',
        )].filter(element => element.getClientRects().length > 0);
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first?.focus();
        }
      }}>{panel}</dialog>
    : panel;
}
