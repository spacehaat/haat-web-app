import { X } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ show, onClose, title, children, size = '', footer, backdropClassName = '' }) {
  useEffect(() => {
    if (!show) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [show, onClose]);

  if (!show) return null;

  const backdropClass = ['modal-bg', 'show', backdropClassName].filter(Boolean).join(' ');

  return createPortal(
    <div className={backdropClass} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal${size ? ' ' + size : ''}`}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} style={{ border: 'none', background: 'none' }}>
            <X />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
