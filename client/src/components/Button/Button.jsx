import { forwardRef } from 'react';
import BsButton from 'react-bootstrap/Button';
import { cx } from '../../utils/cx';
import styles from './Button.module.css';

// Design-system names → Bootstrap variant classes defined in custom.scss.
const VARIANTS = {
  flood: 'primary',   // the one bright call to action per view
  turf: 'secondary',
  chalk: 'chalk',     // outline
  ghost: 'ghost',     // underlined text button
  danger: 'red-card', // destructive only
};

/**
 * Broadcast button. Hover runs a horizontal wipe in the hover colour.
 * `cut` gives the angled lower-third edge. `loading` swaps the label for
 * blinking scoreboard dashes and disables the button.
 */
const Button = forwardRef(function Button(
  {
    variant = 'flood',
    size,
    cut = false,
    icon: Icon,
    iconPosition = 'start',
    loading = false,
    block = false,
    disabled,
    className,
    children,
    ...rest
  },
  ref,
) {
  const icon = Icon ? <Icon size={16} strokeWidth={1.5} aria-hidden="true" /> : null;

  return (
    <BsButton
      ref={ref}
      variant={VARIANTS[variant] ?? variant}
      size={size}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        styles.btn,
        variant === 'ghost' && styles.ghost,
        cut && styles.cut,
        block && 'w-100',
        loading && styles.loading,
        className,
      )}
      {...rest}
    >
      <span className={styles.label}>
        {iconPosition === 'start' && icon}
        <span>{children}</span>
        {iconPosition === 'end' && icon}
      </span>
      {loading && (
        <>
          <span className={styles.dashes} aria-hidden="true">— — —</span>
          <span className="visually-hidden">Loading</span>
        </>
      )}
    </BsButton>
  );
});

export default Button;
