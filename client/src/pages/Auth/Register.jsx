import { useState } from 'react';
import { ArrowRight, Hourglass } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { teamsApi } from '../../api/services';
import Button from '../../components/Button/Button';
import Input from '../../components/Input/Input';
import Segmented from '../../components/Segmented/Segmented';
import Select from '../../components/Select/Select';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { POSITION_NAMES } from '../../utils/format';
import styles from './Auth.module.css';
import { AuthLayout, Ticket } from './Ticket';

const EMPTY = { name: '', email: '', password: '', role: 'player', team: '', position: 'MF', jerseyNumber: '' };

function validate(form) {
  const e = {};
  if (form.name.trim().length < 2) e.name = 'Add your full name.';
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'Enter a valid email address, like you@club.com.';
  if (form.password.length < 8) e.password = 'Use at least 8 characters.';
  if (form.role === 'player' && !form.team) e.team = 'Pick the team you play for.';
  if (form.jerseyNumber && (form.jerseyNumber < 1 || form.jerseyNumber > 99)) e.jerseyNumber = 'Numbers run 1–99.';
  return e;
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { data: teams } = useFetch(() => teamsApi.publicList(), []);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e?.target ? e.target.value : e }));

  const submit = async (e) => {
    e.preventDefault();
    const next = validate(form);
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const body = { ...form, jerseyNumber: form.jerseyNumber ? Number(form.jerseyNumber) : undefined };
      if (form.role === 'coach') {
        delete body.position;
        delete body.jerseyNumber;
      }
      if (!body.team) delete body.team;
      const res = await register(body);
      if (res.pendingApproval) setPending(res.message);
      else navigate('/', { replace: true });
    } catch (err) {
      setErrors(err.fields ?? {});
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const isPlayer = form.role === 'player';
  const teamOptions = (teams ?? []).map((t) => ({ value: t._id, label: `${t.name} (${t.shortName})` }));

  if (pending) {
    return (
      <AuthLayout side={<p>Coach accounts are checked by a club admin before they can open the gate.</p>}>
        <Ticket
          title="Ticket on hold"
          kicker="PENDING"
          stub={
            <>
              <span className="wp-label">Status</span>
              <Hourglass size={48} strokeWidth={1} aria-hidden="true" />
              <span className="wp-label">Awaiting admin</span>
            </>
          }
        >
          <div className={styles.pending}>
            <p className="mb-0 wp-prose" role="status">{pending}</p>
            <p className="mb-0 wp-meta">You will be able to sign in with {form.email} once you are approved.</p>
            <div>
              <Link to="/login" className="btn btn-chalk">Back to sign in</Link>
            </div>
          </div>
        </Ticket>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      side={
        <>
          <p>Players join their team straight away. Coaches wait for a club admin to approve them.</p>
          <p className="wp-label">Season ticket office</p>
        </>
      }
    >
      <Ticket
        title="Get your ticket"
        kicker="NEW ACCOUNT"
        stub={
          <>
            <span className="wp-label">{isPlayer ? 'Shirt' : 'Dugout'}</span>
            <span className={styles.stubBig}>{isPlayer ? form.jerseyNumber || '—' : 'C'}</span>
            <span className="wp-label">{isPlayer ? POSITION_NAMES[form.position] : 'Coach'}</span>
          </>
        }
      >
        <form onSubmit={submit} noValidate className={styles.fields}>
          {formError && (
            <p className={`${styles.formError} ${styles.full}`} role="alert">
              {formError}
            </p>
          )}
          <Segmented
            className={styles.full}
            label="Joining as"
            value={form.role}
            onChange={set('role')}
            options={[
              { value: 'player', label: 'Player' },
              { value: 'coach', label: 'Coach' },
            ]}
          />
          <Input index="01" label="Full name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />
          <Input index="02" label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
          <Input
            index="03"
            label="Password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
            error={errors.password}
            hint="At least 8 characters."
          />
          <Select
            index="04"
            label="Team"
            value={form.team}
            onChange={set('team')}
            options={teamOptions}
            placeholder={isPlayer ? 'Pick your team' : 'Pick a team (optional)'}
            error={errors.team}
          />
          {isPlayer && (
            <>
              <Select
                index="05"
                label="Position"
                value={form.position}
                onChange={set('position')}
                options={Object.entries(POSITION_NAMES).map(([value, label]) => ({ value, label }))}
              />
              <Input
                index="06"
                label="Shirt number"
                type="number"
                inputMode="numeric"
                min={1}
                max={99}
                value={form.jerseyNumber}
                onChange={set('jerseyNumber')}
                error={errors.jerseyNumber}
                hint="Optional. Your coach can change it."
              />
            </>
          )}
          {!isPlayer && (
            <p className={`wp-meta mb-0 ${styles.full}`}>An admin approves coach accounts before you can sign in.</p>
          )}
          <div className={`${styles.actions} ${styles.full}`}>
            <Button type="submit" cut loading={busy} icon={ArrowRight} iconPosition="end">
              {isPlayer ? 'Get your ticket' : 'Request coach access'}
            </Button>
            <Link to="/login" className="btn btn-ghost">I already have one</Link>
          </div>
        </form>
      </Ticket>
    </AuthLayout>
  );
}
