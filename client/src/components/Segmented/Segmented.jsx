import { useId } from 'react';
import { cx } from '../../utils/cx';
import styles from './Segmented.module.css';

/**
 * Radio group styled as broadcast tabs.
 * options: [{ value, label, icon? }]
 */
export default function Segmented({ label, options, value, onChange, size, hideLabel = false, className }) {
  const name = useId();
  return (
    <fieldset className={cx(styles.group, size === 'sm' && styles.sm, className)}>
      <legend className={hideLabel ? 'visually-hidden' : styles.legend}>{label}</legend>
      <div className={styles.options}>
        {options.map((o) => {
          const Icon = o.icon;
          const checked = value === o.value;
          return (
            <label key={o.value} className={cx(styles.option, checked && styles.checked)}>
              <input
                type="radio"
                className="visually-hidden"
                name={name}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
              />
              {Icon && <Icon size={15} strokeWidth={1.5} aria-hidden="true" />}
              <span className={cx(Icon && o.iconOnly && 'visually-hidden')}>{o.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
