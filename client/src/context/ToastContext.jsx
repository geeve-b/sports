import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import Toast from 'react-bootstrap/Toast';
import ToastContainer from 'react-bootstrap/ToastContainer';
import { cx } from '../utils/cx';

const ToastContext = createContext(null);
let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const push = useCallback((kind, message, title) => {
    const id = nextId++;
    setToasts((all) => [...all.slice(-3), { id, kind, message, title }]);
  }, []);

  const api = useMemo(
    () => ({
      success: (message, title = 'Done') => push('success', message, title),
      error: (message, title = 'Not saved') => push('error', message, title),
      info: (message, title = 'Notice') => push('info', message, title),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastContainer position="top-end" className="wp-toasts p-3" containerPosition="fixed">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            onClose={() => dismiss(t.id)}
            autohide
            delay={t.kind === 'error' ? 6000 : 3500}
            className={cx(t.kind === 'error' && 'toast-alert')}
          >
            <Toast.Header closeLabel="Dismiss">
              <strong className="me-auto">{t.title}</strong>
            </Toast.Header>
            <Toast.Body>{t.message}</Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
