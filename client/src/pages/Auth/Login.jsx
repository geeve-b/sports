import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../../components/Button/Button';
import Input from '../../components/Input/Input';
import { useAuth } from '../../hooks/useAuth';
import styles from './Auth.module.css';
import { AuthLayout, Ticket } from './Ticket';

const DEMO = [
  ['Coach', 'coach@wildplay.test'],
  ['Player', 'dani.okafor@wildplay.test'],
  ['Admin', 'admin@wildplay.test'],
];
const DEMO_PASSWORD = 'matchday26';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.email.trim()) next.email = 'Enter your email address.';
    if (!form.password) next.password = 'Enter your password.';
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await login(form);
      const destination = location.state?.from;
      navigate(
        destination
          ? {
              pathname: destination.pathname,
              search: destination.search,
              hash: destination.hash,
            }
          : '/',
        { replace: true },
      );
    } catch (err) {
      setErrors(err.fields ?? {});
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      side={
        <>
          <p>Squad, fixtures, lineups and the numbers behind them, for everyone at the club.</p>
          <p className="wp-label">Turnstiles open · Gate B</p>
        </>
      }
    >
      <Ticket
        title="Sign in"
        kicker="ADMIT ONE"
        stub={
          <>
            <span className="wp-label">Gate</span>
            <span className={styles.stubBig}>B</span>
            <span className="wp-label wp-num">ROW 09 · SEAT 14</span>
          </>
        }
      >
        <form onSubmit={submit} noValidate className={styles.fields}>
          {formError && (
            <p className={`${styles.formError} ${styles.full}`} role="alert">
              {formError}
            </p>
          )}
          <Input
            className={styles.full}
            label="Email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={set('email')}
            error={errors.email}
            autoFocus
          />
          <Input
            className={styles.full}
            label="Password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={set('password')}
            error={errors.password}
          />
          <div className={`${styles.actions} ${styles.full}`}>
            <Button type="submit" cut loading={busy} icon={ArrowRight} iconPosition="end">
              Through the gate
            </Button>
            <Link to="/register" className="btn btn-ghost">
              New here? Get a ticket
            </Link>
          </div>
        </form>

        {import.meta.env.DEV && (
          <div className={styles.demo}>
            <span className="wp-label">Demo accounts · password {DEMO_PASSWORD}</span>
            {DEMO.map(([role, email]) => (
              <button key={email} type="button" onClick={() => setForm({ email, password: DEMO_PASSWORD })}>
                {role}: {email}
              </button>
            ))}
          </div>
        )}
      </Ticket>
    </AuthLayout>
  );
}
