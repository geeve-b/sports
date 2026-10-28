import { useEffect, useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import { trainingApi } from '../../api/services';
import Button from '../../components/Button/Button';
import Input from '../../components/Input/Input';
import { useToast } from '../../context/ToastContext';
import { toLocalInput } from '../../utils/format';

export default function SessionFormModal({ show, session, defaultDate, onHide, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!show) return;
    setErrors({});
    const start = session?.date ?? defaultDate ?? (() => { const d = new Date(); d.setHours(18, 30, 0, 0); return d; })();
    setForm({
      date: toLocalInput(start),
      duration: session?.duration ?? 90,
      focus: session?.focus ?? '',
      location: session?.location ?? 'Pitch 1',
      drills: (session?.drills ?? []).join('\n'),
    });
  }, [show, session, defaultDate]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.date) next.date = 'Pick a date and start time.';
    if (form.focus.trim().length < 2) next.focus = 'Add a focus, e.g. pressing triggers.';
    if (!(form.duration >= 15 && form.duration <= 300)) next.duration = 'Sessions run 15–300 minutes.';
    setErrors(next);
    if (Object.keys(next).length) return;

    const body = {
      date: new Date(form.date).toISOString(),
      duration: Number(form.duration),
      focus: form.focus,
      location: form.location,
      drills: form.drills.split('\n').map((d) => d.trim()).filter(Boolean).slice(0, 12),
    };
    setBusy(true);
    try {
      const saved = session ? await trainingApi.update(session._id, body) : await trainingApi.create(body);
      toast.success(session ? 'Session updated.' : 'Session added to the week.');
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
        <Modal.Title>{session ? 'Edit session' : 'Add a session'}</Modal.Title>
      </Modal.Header>
      <form onSubmit={submit} noValidate>
        <Modal.Body className="d-grid gap-4">
          <Input label="Focus" value={form.focus ?? ''} onChange={set('focus')} error={errors.focus} placeholder="Pressing triggers" autoFocus />
          <div className="row g-4">
            <div className="col-sm-7"><Input label="Starts" type="datetime-local" value={form.date ?? ''} onChange={set('date')} error={errors.date} /></div>
            <div className="col-sm-5"><Input label="Length" type="number" min={15} max={300} step={15} suffix="min" value={form.duration ?? ''} onChange={set('duration')} error={errors.duration} /></div>
          </div>
          <Input label="Where" value={form.location ?? ''} onChange={set('location')} />
          <Input label="Drills" as="textarea" rows={4} value={form.drills ?? ''} onChange={set('drills')} hint="One per line." />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" onClick={onHide}>Cancel</Button>
          <Button type="submit" loading={busy}>{session ? 'Save session' : 'Add session'}</Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
