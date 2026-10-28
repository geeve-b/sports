import { useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from '../Button/Button';

/** Confirmation for destructive actions. onConfirm may return a promise. */
export default function ConfirmModal({ show, title, children, confirmLabel = 'Delete', onConfirm, onHide }) {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="wp-prose">{children}</Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onHide}>
          Keep it
        </Button>
        <Button variant="danger" loading={busy} onClick={confirm}>
          {confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
