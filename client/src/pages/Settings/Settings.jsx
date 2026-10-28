import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { authApi } from '../../api/services';
import Button from '../../components/Button/Button';
import Input from '../../components/Input/Input';
import PageHeader from '../../components/PageHeader/PageHeader';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { cx } from '../../utils/cx';
import styles from './Settings.module.css';

function ProfileForm() {
  const { user, setMe } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: user.name, email: user.email, avatar: user.avatar ?? '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      setMe(await authApi.updateMe(form));
      toast.success('Profile saved.');
    } catch (err) {
      setErrors(err.fields ?? {});
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <form onSubmit={submit} noValidate className="d-grid gap-4">
      <Input label="Name" value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" />
      <Input label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" />
      <Input label="Photo URL" type="url" value={form.avatar} onChange={set('avatar')} error={errors.avatar} hint="Optional. A link to a square image." />
      <div><Button type="submit" loading={busy}>Save profile</Button></div>
    </form>
  );
}

function PasswordForm() {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.currentPassword) next.currentPassword = 'Enter your current password.';
    if (form.newPassword.length < 8) next.newPassword = 'Use at least 8 characters.';
    if (form.confirm !== form.newPassword) next.confirm = 'The two new passwords don’t match.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await authApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success('Password changed.');
    } catch (err) {
      setErrors(err.fields ?? {});
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <form onSubmit={submit} noValidate className="d-grid gap-4">
      <Input label="Current password" type="password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} error={errors.currentPassword} />
      <Input label="New password" type="password" autoComplete="new-password" value={form.newPassword} onChange={set('newPassword')} error={errors.newPassword} hint="At least 8 characters." />
      <Input label="New password again" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
      <div><Button type="submit" variant="chalk" loading={busy}>Change password</Button></div>
    </form>
  );
}

function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const options = [
    { value: 'dark', title: 'Night match', note: 'Floodlights on a dark pitch. The default.', icon: Moon },
    { value: 'light', title: 'Day match', note: 'Chalk paper and ink, for bright rooms.', icon: Sun },
  ];
  return (
    <fieldset className={styles.themes}>
      <legend className="visually-hidden">Theme</legend>
      {options.map((o) => {
        const Icon = o.icon;
        return (
          <label key={o.value} className={cx(styles.theme, theme === o.value && styles.themeOn)}>
            <input type="radio" name="theme" className="visually-hidden" value={o.value} checked={theme === o.value} onChange={() => setTheme(o.value)} />
            <span className={cx(styles.swatch, styles[`sw_${o.value}`])} aria-hidden="true">
              <span />
              <b>9</b>
            </span>
            <span className={styles.themeText}>
              <span className={styles.themeTitle}><Icon size={15} strokeWidth={1.5} aria-hidden="true" /> {o.title}</span>
              <span className="wp-meta">{o.note}</span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

export default function Settings() {
  const { user, team } = useAuth();
  return (
    <>
      <PageHeader eyebrow="Settings" title="Your account" meta={<><span>{user.role}</span>{team && <span>{team.name}</span>}</>} />
      <div className="row g-5">
        <section className="col-lg-6" aria-labelledby="s-profile">
          <div className="wp-slate"><span className="wp-slate-tab">01</span><h2 id="s-profile">Profile</h2></div>
          <ProfileForm />
        </section>
        <section className="col-lg-6" aria-labelledby="s-theme">
          <div className="wp-slate"><span className="wp-slate-tab">02</span><h2 id="s-theme">Theme</h2></div>
          <ThemePicker />
          <div className="wp-slate mt-5"><span className="wp-slate-tab">03</span><h2 id="s-pass">Password</h2></div>
          <PasswordForm />
        </section>
      </div>
    </>
  );
}
