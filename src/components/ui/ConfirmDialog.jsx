import { X } from 'lucide-react';

/**
 * Confirm / cancel dialog.
 * Renders above drawers (leads panel is z-index 1100).
 */
export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  danger = true,
  busy = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div
      className="modal-bg show confirm-dialog-bg"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="modal modal-sm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <div className="modal-head">
          <h2 id="confirm-dialog-title">{title}</h2>
          <button
            className="icon-btn"
            type="button"
            onClick={busy ? undefined : onCancel}
            disabled={busy}
            style={{ border: 'none', background: 'none' }}
            aria-label="Close"
          >
            <X />
          </button>
        </div>
        <div className="modal-body">
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--ink-2)' }}>
            {message}
          </p>
        </div>
        <div className="modal-foot">
          <button className="btn" type="button" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <div className="spacer" />
          <button
            className={`btn ${danger ? 'danger solid' : 'primary'}`}
            type="button"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
