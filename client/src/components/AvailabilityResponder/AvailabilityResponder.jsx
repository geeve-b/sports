import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { availabilityApi } from '../../api/services';
import { useToast } from '../../context/ToastContext';
import { cx } from '../../utils/cx';
import { fmtRelative } from '../../utils/format';
import Button from '../Button/Button';
import Input from '../Input/Input';
import styles from './AvailabilityResponder.module.css';

/** Player's "can you play?" answer for one match. */
export default function AvailabilityResponder({ matchId, response, onSaved, compact = false }) {
  const toast = useToast();
  const [available, setAvailable] = useState(response?.available ?? null);
  const [reason, setReason] = useState(response?.reason ?? '');
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    setAvailable(response?.available ?? null);
    setReason(response?.reason ?? '');
  }, [response]);

  const save = async (next, why = '') => {
    setBusy(next ? 'yes' : 'no');
    try {
      const saved = await availabilityApi.respond({ match: matchId, available: next, reason: why });
      setAvailable(next);
      onSaved?.(saved);
      toast.success(next ? 'You’re marked available.' : 'You’re marked unavailable.', 'Answer saved');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={cx(styles.wrap, compact && styles.compact)}>
      <div className={styles.buttons} role="group" aria-label="Can you play?">
        <Button
          variant={available === true ? 'flood' : 'chalk'}
          size={compact ? 'sm' : undefined}
          icon={Check}
          aria-pressed={available === true}
          loading={busy === 'yes'}
          onClick={() => save(true)}
        >
          I’m available
        </Button>
        <Button
          variant={available === false ? 'danger' : 'chalk'}
          size={compact ? 'sm' : undefined}
          icon={X}
          aria-pressed={available === false}
          loading={busy === 'no' && available !== false}
          onClick={() => (available === false ? null : setAvailable(false))}
        >
          Can’t play
        </Button>
      </div>

      {available === false && (
        <form
          className={styles.reason}
          onSubmit={(e) => {
            e.preventDefault();
            save(false, reason);
          }}
        >
          <Input label="Reason (only coaches see this)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={160} placeholder="Injury, work, travel…" />
          <Button type="submit" size="sm" variant="chalk" loading={busy === 'no'}>
            Save answer
          </Button>
        </form>
      )}

      <p className={styles.state} aria-live="polite">
        {response?.updatedAt
          ? `Answered ${fmtRelative(response.updatedAt)}`
          : available === null
            ? 'You haven’t answered yet.'
            : ''}
      </p>
    </div>
  );
}
