import { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import Modal from 'react-bootstrap/Modal';
import { playersApi } from '../../api/services';
import Button from '../../components/Button/Button';
import Input from '../../components/Input/Input';
import Select from '../../components/Select/Select';
import { useToast } from '../../context/ToastContext';
import { FOOT_NAMES, POSITION_NAMES, STATUS_NAMES, toLocalInput } from '../../utils/format';

const blank = { name: '', email: '', jerseyNumber: '', position: 'MF', status: 'fit', dob: '', height: '', foot: 'right' };
const options = (map) => Object.entries(map).map(([value, label]) => ({ value, label }));

/** Add or edit a squad member. Creating one returns a one-time password for the coach to pass on. */
export default function PlayerFormModal({ show, player, onHide, onSaved }) {
  const toast = useToast();
  const editing = Boolean(player);
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);

  useEffect(() => {
    if (!show) return;
    setErrors({});
    setCreated(null);
    setForm(
      player
        ? {
            name: player.name ?? '',
            email: player.email ?? '',
            jerseyNumber: player.jerseyNumber ?? '',
            position: player.position ?? 'MF',
            status: player.status ?? 'fit',
            dob: toLocalInput(player.dob, false),
            height: player.height ?? '',
            foot: player.foot ?? 'right',
          }
        : blank,
    );
  }, [show, player]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Add the player’s full name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (form.jerseyNumber && (form.jerseyNumber < 1 || form.jerseyNumber > 99)) next.jerseyNumber = 'Numbers run 1–99.';
    setErrors(next);
    if (Object.keys(next).length) return;

    const body = {
      ...form,
      jerseyNumber: form.jerseyNumber === '' ? '' : Number(form.jerseyNumber),
      height: form.height === '' ? '' : Number(form.height),
    };
    setBusy(true);
    try {
      if (editing) {
        const saved = await playersApi.update(player._id, body);
        toast.success(`${saved.name} updated.`);
        onSaved(saved);
        onHide();
      } else {
        const res = await playersApi.create(body);
        onSaved(res.player);
        if (res.tempPassword) setCreated(res);
        else {
          toast.success(`${res.player.name} added to the squad.`);
          onHide();
        }
      }
    } catch (err) {
      setErrors(err.fields ?? {});
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${created.player.email} / ${created.tempPassword}`);
      toast.success('Login copied.');
    } catch {
      toast.info('Select the password and copy it by hand.');
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{created ? 'Player added' : editing ? `Edit #${player.jerseyNumber ?? ''} ${player.name}` : 'Add a player'}</Modal.Title>
      </Modal.Header>

      {created ? (
        <>
          <Modal.Body className="d-grid gap-3">
            <p className="mb-0 wp-prose">
              {created.player.name} can sign in now. Give them this one-time password and ask them to change it in Settings.
            </p>
            <div className="d-flex flex-wrap align-items-center gap-3 p-3 border">
              <span className="wp-label">Email</span>
              <span className="wp-num">{created.player.email}</span>
              <span className="wp-label ms-lg-3">Password</span>
              <span className="wp-num fs-4 text-accent">{created.tempPassword}</span>
            </div>
            <p className="wp-meta mb-0">This password is shown once. It isn’t stored anywhere you can view it again.</p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="chalk" icon={Copy} onClick={copy}>Copy login</Button>
            <Button onClick={onHide}>Done</Button>
          </Modal.Footer>
        </>
      ) : (
        <form onSubmit={submit} noValidate>
          <Modal.Body>
            <div className="row g-4">
              <div className="col-md-8"><Input label="Full name" value={form.name} onChange={set('name')} error={errors.name} autoFocus /></div>
              <div className="col-md-4">
                <Input label="Shirt number" type="number" min={1} max={99} inputMode="numeric" value={form.jerseyNumber} onChange={set('jerseyNumber')} error={errors.jerseyNumber} />
              </div>
              <div className="col-md-8"><Input label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} hint={editing ? undefined : 'They sign in with this.'} /></div>
              <div className="col-md-4"><Select label="Position" value={form.position} onChange={set('position')} options={options(POSITION_NAMES)} /></div>
              <div className="col-md-4"><Select label="Fitness" value={form.status} onChange={set('status')} options={options(STATUS_NAMES)} /></div>
              <div className="col-md-4"><Input label="Date of birth" type="date" value={form.dob} onChange={set('dob')} error={errors.dob} /></div>
              <div className="col-6 col-md-2"><Input label="Height" type="number" suffix="cm" value={form.height} onChange={set('height')} error={errors.height} /></div>
              <div className="col-6 col-md-2"><Select label="Foot" value={form.foot} onChange={set('foot')} options={options(FOOT_NAMES)} /></div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" onClick={onHide}>Cancel</Button>
            <Button type="submit" loading={busy}>{editing ? 'Save changes' : 'Add to squad'}</Button>
          </Modal.Footer>
        </form>
      )}
    </Modal>
  );
}
