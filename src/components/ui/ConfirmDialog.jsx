import Modal from './Modal.jsx';

/**
 * Confirm / cancel dialog built on the shared Modal.
 * @param {{
 *   open: boolean,
 *   title?: string,
 *   message: string,
 *   confirmLabel?: string,
 *   cancelLabel?: string,
 *   danger?: boolean,
 *   busy?: boolean,
 *   onConfirm: () => void | Promise<void>,
 *   onCancel: () => void,
 * }} props
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
  return (
    <Modal
      show={open}
      onClose={busy ? () => {} : onCancel}
      title={title}
      size="modal-sm"
      footer={(
        <>
          <button className="btn" type="button" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <div className="spacer" />
          <button
            className={`btn ${danger ? 'danger' : 'primary'}`}
            type="button"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </>
      )}
    >
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--ink-2)' }}>
        {message}
      </p>
    </Modal>
  );
}
