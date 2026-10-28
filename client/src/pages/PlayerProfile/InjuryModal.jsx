import { useEffect, useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import { playersApi } from '../../api/services';
import Button from '../../components/Button/Button';
import Input from '../../components/Input/Input';
import { useToast } from '../../context/ToastContext';
import { toLocalInput } from '../../utils/format';

/** Log a new injury, or edit one (usually to set the return date). */
export default function InjuryModal({ show, playerId, injury, onHide, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ type: '', startDate: '', endDate: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!show) return;
    setErrors({});
    setForm({
      type: injury?.type ?? '',
      startDate: toLocalInput(injury?.startDate ?? new Date(), false),
      endDate: toLocalInput(injury?.endDate, false),
      notes: injury?.notes ?? '',
    });
  }, [show, injury]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.type.trim().length < 2) return setErrors({ type: 'Describe the injury, e.g. hamstring strain.' });
    if (form.endDate && form.startDate && form.endDate < form.startDate) return setErrors({ endDate: 'The return date must be after the start date.' });
    setBusy(true);
    try {
      const body = { ...form, endDate: form.endDate || null };
      const saved = injury ? await playersApi.updateInjury(playerId, injury._id, body) : await playersApi.addInjury(playerId, body);
      toast.success(injury ? 'Injury record updated.' : 'Injury logged. Fitness set to injured.');
      onSaved(saved);
      onHide();
    } catch (err) {
      setErrors(err.fields ?? {});
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{injury ? 'Update injury' : 'Log an injury'}</Modal.Title>
      </Modal.Header>
      <form onSubmit={submit} noValidate>
        <Modal.Body className="d-grid gap-4">
          <Input label="Injury" value={form.type} onChange={set('type')} error={errors.type} placeholder="Hamstring strain" autoFocus />
          <div className="row g-4">
            <div className="col-sm-6"><Input label="Since" type="date" value={form.startDate} onChange={set('startDate')} error={errors.startDate} /></div>
            <div className="col-sm-6"><Input label="Back on" type="date" value={form.endDate} onChange={set('endDate')} error={errors.endDate} hint="Leave empty while still out." /></div>
          </div>
          <Input label="Notes" as="textarea" rows={3} value={form.notes} onChange={set('notes')} maxLength={500} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" onClick={onHide}>Cancel</Button>
          <Button type="submit" loading={busy}>{injury ? 'Save' : 'Log injury'}</Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
