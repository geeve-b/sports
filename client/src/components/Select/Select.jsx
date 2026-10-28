import { forwardRef, useId } from 'react';
import Form from 'react-bootstrap/Form';
import { cx } from '../../utils/cx';
import styles from '../Input/Input.module.css';

/** Underlined select that matches <Input>. options: [{ value, label }] */
const Select = forwardRef(function Select(
  { label, index, hint, error, options = [], placeholder, id, className, children, ...rest },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? `s${autoId.replace(/:/g, '')}`;
  const errorId = error ? `${selectId}-error` : undefined;
  const hintId = hint && !error ? `${selectId}-hint` : undefined;

  return (
    <Form.Group controlId={selectId} className={cx(styles.field, error && styles.invalid, className)}>
      {label && (
        <Form.Label className={styles.label}>
          {index && <span className={styles.index} aria-hidden="true">{index}</span>}
          {label}
        </Form.Label>
      )}
      <div className={styles.control}>
        <Form.Select ref={ref} isInvalid={Boolean(error)} aria-describedby={errorId || hintId} className={styles.input} {...rest}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
          {children}
        </Form.Select>
        <span className={styles.bar} aria-hidden="true" />
      </div>
      {error ? (
        <p id={errorId} className={styles.error}>{error}</p>
      ) : (
        hint && <Form.Text id={hintId} className={styles.hint}>{hint}</Form.Text>
      )}
    </Form.Group>
  );
});

export default Select;
