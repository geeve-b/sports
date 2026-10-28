import { useEffect, useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import { matchesApi } from '../../api/services';
import Button from '../../components/Button/Button';
import Input from '../../components/Input/Input';
import Segmented from '../../components/Segmented/Segmented';
import Select from '../../components/Select/Select';
import { useToast } from '../../context/ToastContext';
import { toLocalInput } from '../../utils/format';
import { STATUS_LABELS } from '../../utils/match';

function nextSaturday() {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  d.setHours(15, 0, 0, 0);
  return d;
}

/** Create or edit a fixture's details (not the result). */
export default function MatchFormModal({ show, match, onHide, onSaved }) {
  const toast = useToast();
  const editing = Boolean(match);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!show) return;
    setErrors({});
    setForm({
      opponent: match?.opponent ?? '',
      opponentShort: match?.opponentShort ?? '',
      opponentColor: match?.opponentColor ?? '#2B6CB0',
      date: toLocalInput(match?.date ?? nextSaturday()),
      venue: match?.venue ?? '',
      homeAway: match?.homeAway ?? 'home',
      competition: match?.competition ?? 'County League',
      status: match?.status ?? 'scheduled',
    });
  }, [show, match]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (form.opponent.trim().length < 2) next.opponent = 'Add the opponent’s name.';
    if (!form.date) next.date = 'Pick a kick-off date and time.';
    setErrors(next);
    if (Object.keys(next).length) return;

    const body = { ...form, date: new Date(form.date).toISOString() };
    if (!body.opponentShort) delete body.opponentShort;
    if (!editing) delete body.status;
    setBusy(true);
    try {
      const saved = editing ? await matchesApi.update(match._id, body) : await matchesApi.create(body);
      toast.success(editing ? 'Fixture updated.' : `${saved.opponent} added to the calendar.`);
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
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{editing ? 'Edit fixture' : 'Add a fixture'}</Modal.Title>
      </Modal.Header>
      <form onSubmit={submit} noValidate>
        <Modal.Body>
          <div className="row g-4">
            <div className="col-md-6"><Input label="Opponent" value={form.opponent ?? ''} onChange={set('opponent')} error={errors.opponent} autoFocus /></div>
            <div className="col-6 col-md-3"><Input label="Short name" maxLength={4} value={form.opponentShort ?? ''} onChange={set('opponentShort')} error={errors.opponentShort} hint="3 letters" /></div>
            <div className="col-6 col-md-3"><Input label="Their colour" type="color" value={form.opponentColor ?? '#2B6CB0'} onChange={set('opponentColor')} /></div>
            <div className="col-md-6"><Input label="Kick-off" type="datetime-local" value={form.date ?? ''} onChange={set('date')} error={errors.date} /></div>
            <div className="col-md-6">
              <Segmented label="Ground" value={form.homeAway} onChange={set('homeAway')} options={[{ value: 'home', label: 'Home' }, { value: 'away', label: 'Away' }]} />
            </div>
            <div className="col-md-6"><Input label="Venue" value={form.venue ?? ''} onChange={set('venue')} /></div>
            <div className="col-md-6"><Input label="Competition" value={form.competition ?? ''} onChange={set('competition')} /></div>
            {editing && (
              <div className="col-md-6">
                <Select label="Status" value={form.status} onChange={set('status')} options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))} />
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" onClick={onHide}>Cancel</Button>
          <Button type="submit" loading={busy}>{editing ? 'Save fixture' : 'Add fixture'}</Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
