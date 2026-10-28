import { forwardRef, useId } from 'react';
import Form from 'react-bootstrap/Form';
import { TriangleAlert } from 'lucide-react';
import { cx } from '../../utils/cx';
import styles from './Input.module.css';

/**
 * Underlined field in the style of a match-day programme form.
 * `index` prints a small field number ("01") before the label, for
 * forms that really are a sequence (registration, match report).
 */
const Input = forwardRef(function Input(
  { label, index, hint, error, suffix, id, type = 'text', as, className, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? `f${autoId.replace(/:/g, '')}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <Form.Group controlId={inputId} className={cx(styles.field, error && styles.invalid, className)}>
      <Form.Label className={styles.label}>
        {index && <span className={styles.index} aria-hidden="true">{index}</span>}
        {label}
      </Form.Label>

      <div className={styles.control}>
        <Form.Control
          ref={ref}
          as={as}
          type={as ? undefined : type}
          isInvalid={Boolean(error)}
          aria-describedby={describedBy}
          className={styles.input}
          {...rest}
        />
        {suffix && <span className={styles.suffix}>{suffix}</span>}
        <span className={styles.bar} aria-hidden="true" />
      </div>

      {error ? (
        <p id={errorId} className={styles.error}>
          <TriangleAlert size={14} strokeWidth={1.75} aria-hidden="true" />
          {error}
        </p>
      ) : (
        hint && <Form.Text id={hintId} className={styles.hint}>{hint}</Form.Text>
      )}
    </Form.Group>
  );
});

export default Input;
