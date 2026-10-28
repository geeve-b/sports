import { useEffect, useState } from 'react';
import { Check, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import Modal from 'react-bootstrap/Modal';
import { adminApi, teamsApi } from '../../api/services';
import Button from '../../components/Button/Button';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import EmptyState, { ErrorState } from '../../components/EmptyState/EmptyState';
import Input from '../../components/Input/Input';
import PageHeader from '../../components/PageHeader/PageHeader';
import Segmented from '../../components/Segmented/Segmented';
import Select from '../../components/Select/Select';
import Skeleton from '../../components/Skeleton/Skeleton';
import StatBlock from '../../components/StatBlock/StatBlock';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { fmtDate, fmtRelative, toLocalInput } from '../../utils/format';
import styles from './Admin.module.css';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'coach', label: 'Coach' },
  { value: 'player', label: 'Player' },
];

function Approvals({ teams, onChange }) {
  const toast = useToast();
  const { data, loading, error, reload, setData } = useFetch(() => adminApi.users({ role: 'coach', approved: 'false' }), []);

  const act = async (u, approve) => {
    try {
      if (approve) {
        await adminApi.updateUser(u._id, { approved: true, ...(u.team ? {} : teams[0] ? { team: teams[0]._id } : {}) });
        toast.success(`${u.name} can sign in now.`, 'Coach approved');
      } else {
        await adminApi.removeUser(u._id);
        toast.success(`${u.name}'s request was declined and the account removed.`);
      }
      setData((list) => list.filter((x) => x._id !== u._id));
      onChange();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <Skeleton rows={3} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data.length) return <EmptyState compact title="Nobody waiting at the gate.">New coach sign-ups appear here for approval.</EmptyState>;

  return (
    <ul className={styles.approvals}>
      {data.map((u) => (
        <li key={u._id}>
          <div className={styles.approvalWho}>
            <span className={styles.approvalName}>{u.name}</span>
            <span className="wp-meta">{u.email} · asked {fmtRelative(u.createdAt)} · {u.team ? `for ${u.team.name}` : 'no team chosen'}</span>
          </div>
          <div className="d-flex gap-2">
            <Button size="sm" icon={Check} onClick={() => act(u, true)}>Approve</Button>
            <Button size="sm" variant="ghost" icon={X} onClick={() => act(u, false)}>Decline</Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Users({ teams }) {
  const toast = useToast();
  const { user: me } = useAuth();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const { data, loading, error, reload, setData } = useFetch(() => adminApi.users({ q: q || undefined, role: role || undefined }), [q, role]);
  const [deleting, setDeleting] = useState(null);

  const update = async (u, body) => {
    try {
      const saved = await adminApi.updateUser(u._id, body);
      setData((list) => list.map((x) => (x._id === saved._id ? saved : x)));
      toast.success(`${saved.name} updated.`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async () => {
    try {
      const res = await adminApi.removeUser(deleting._id);
      setData((list) => list.filter((x) => x._id !== deleting._id));
      setDeleting(null);
      toast.success(res.message);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="d-grid gap-3">
      <div className={styles.filters}>
        <div style={{ flex: '1 1 240px', maxWidth: 340 }}>
          <Input label="Search" placeholder="Name or email" value={q} onChange={(e) => setQ(e.target.value)} suffix={<Search size={15} strokeWidth={1.5} aria-hidden="true" />} />
        </div>
        <Segmented label="Role" value={role} onChange={setRole} size="sm" options={[{ value: '', label: 'All' }, ...ROLE_OPTIONS]} />
      </div>
      {loading ? (
        <Skeleton rows={6} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data.length ? (
        <EmptyState compact title="No accounts match.">Try another search.</EmptyState>
      ) : (
        <div className="table-responsive">
          <table className="table align-middle">
            <caption className="visually-hidden">User accounts</caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Role</th>
                <th scope="col">Team</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {data.map((u) => (
                <tr key={u._id}>
                  <td>
                    <span className="d-block fw-bold">{u.name}</span>
                    <span className="wp-meta">{u.email}</span>
                  </td>
                  <td style={{ minWidth: 130 }}>
                    {u.role === 'player' ? (
                      <span className="wp-label">Player</span>
                    ) : (
                      <select className="form-select form-select-sm" aria-label={`Role for ${u.name}`} value={u.role} disabled={u._id === me._id} onChange={(e) => update(u, { role: e.target.value })}>
                        {ROLE_OPTIONS.filter((r) => r.value !== 'player').map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    )}
                  </td>
                  <td style={{ minWidth: 170 }}>
                    <select className="form-select form-select-sm" aria-label={`Team for ${u.name}`} value={u.team?._id ?? ''} onChange={(e) => update(u, { team: e.target.value || null })}>
                      <option value="">No team</option>
                      {teams.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                    </select>
                  </td>
                  <td>
                    {u.approved ? (
                      <span className="wp-label">Active</span>
                    ) : (
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => update(u, { approved: true })}>Approve</button>
                    )}
                  </td>
                  <td className="text-end">
                    {u._id !== me._id && (
                      <button type="button" className={styles.iconBtn} onClick={() => setDeleting(u)} aria-label={`Delete ${u.name}`}>
                        <Trash2 size={15} strokeWidth={1.5} aria-hidden="true" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmModal show={Boolean(deleting)} title="Delete account?" onHide={() => setDeleting(null)} onConfirm={remove}>
        <p className="mb-0">{deleting?.name} loses access. {deleting?.role === 'player' ? 'Their player profile, stats and availability answers are deleted too.' : ''}</p>
      </ConfirmModal>
    </div>
  );
}

function TeamModal({ show, team, seasons, onHide, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (show) {
      setErrors({});
      setForm({
        name: team?.name ?? '',
        shortName: team?.shortName ?? '',
        primary: team?.colors?.primary ?? '#E8FF3A',
        secondary: team?.colors?.secondary ?? '#0E0F0C',
        season: team?.season?._id ?? team?.season ?? seasons.find((s) => s.current)?._id ?? '',
      });
    }
  }, [show, team, seasons]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { name: form.name, shortName: form.shortName, colors: { primary: form.primary, secondary: form.secondary }, season: form.season || null };
      const saved = team ? await teamsApi.update(team._id, body) : await teamsApi.create(body);
      toast.success(`${saved.name} saved.`);
      onSaved();
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
        <Modal.Title>{team ? 'Edit team' : 'New team'}</Modal.Title>
      </Modal.Header>
      <form onSubmit={submit} noValidate>
        <Modal.Body>
          <div className="row g-4">
            <div className="col-8"><Input label="Name" value={form.name ?? ''} onChange={set('name')} error={errors.name} autoFocus /></div>
            <div className="col-4"><Input label="Short" maxLength={4} value={form.shortName ?? ''} onChange={set('shortName')} error={errors.shortName} /></div>
            <div className="col-6"><Input label="Primary colour" type="color" value={form.primary ?? '#E8FF3A'} onChange={set('primary')} /></div>
            <div className="col-6"><Input label="Secondary colour" type="color" value={form.secondary ?? '#0E0F0C'} onChange={set('secondary')} /></div>
            <div className="col-12">
              <Select label="Season" value={form.season ?? ''} onChange={set('season')} placeholder="No season" options={seasons.map((s) => ({ value: s._id, label: s.name }))} />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" onClick={onHide}>Cancel</Button>
          <Button type="submit" loading={busy}>Save team</Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}

function Teams({ teams, seasons, reload }) {
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const remove = async () => {
    try {
      const res = await teamsApi.remove(deleting._id);
      toast.success(res.message);
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="d-grid gap-3">
      <div><Button icon={Plus} onClick={() => setEditing('new')}>New team</Button></div>
      {!teams.length ? (
        <EmptyState compact title="No teams yet.">Create the first team, then add coaches and players to it.</EmptyState>
      ) : (
        <ul className={styles.teams}>
          {teams.map((t) => (
            <li key={t._id}>
              <span className={styles.teamMark} style={{ background: t.colors?.primary, color: t.colors?.secondary }} aria-hidden="true">{t.shortName}</span>
              <span className={styles.teamInfo}>
                <span className={styles.teamName}>{t.name}</span>
                <span className="wp-meta">
                  {t.playerCount} players · {t.coaches?.map((c) => c.name).join(', ') || 'no coach'} · {t.season?.name ?? 'no season'}
                </span>
              </span>
              <span className="d-flex gap-1">
                <button type="button" className={styles.iconBtn} onClick={() => setEditing(t)} aria-label={`Edit ${t.name}`}><Pencil size={15} strokeWidth={1.5} aria-hidden="true" /></button>
                <button type="button" className={styles.iconBtn} onClick={() => setDeleting(t)} aria-label={`Delete ${t.name}`}><Trash2 size={15} strokeWidth={1.5} aria-hidden="true" /></button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <TeamModal show={Boolean(editing)} team={editing === 'new' ? null : editing} seasons={seasons} onHide={() => setEditing(null)} onSaved={reload} />
      <ConfirmModal show={Boolean(deleting)} title="Delete team?" onHide={() => setDeleting(null)} onConfirm={remove}>
        <p className="mb-0">A team can only be deleted once its players are moved or removed.</p>
      </ConfirmModal>
    </div>
  );
}

function Seasons({ seasons, reload }) {
  const toast = useToast();
  const year = new Date().getFullYear();
  const [form, setForm] = useState({ name: `${year}/${String(year + 1).slice(2)}`, startDate: `${year}-08-01`, endDate: `${year + 1}-05-31`, current: false });
  const [busy, setBusy] = useState(false);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminApi.createSeason(form);
      toast.success(`Season ${form.name} created.`);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const makeCurrent = async (s) => {
    try {
      await adminApi.updateSeason(s._id, { current: true });
      toast.success(`${s.name} is the current season.`);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (s) => {
    try {
      const res = await adminApi.removeSeason(s._id);
      toast.success(res.message);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="row g-5">
      <div className="col-lg-7">
        {!seasons.length ? (
          <EmptyState compact title="No seasons yet.">Create one to group fixtures and stats.</EmptyState>
        ) : (
          <ul className={styles.seasons}>
            {seasons.map((s) => (
              <li key={s._id} className={s.current ? styles.current : undefined}>
                <span className={styles.seasonName}>{s.name}</span>
                <span className="wp-meta">{fmtDate(s.startDate, { day: 'numeric', month: 'short', year: 'numeric' })} – {fmtDate(s.endDate, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <span className="d-flex gap-2 ms-auto">
                  {s.current ? <span className="wp-label text-accent">Current</span> : <button type="button" className="btn btn-ghost btn-sm" onClick={() => makeCurrent(s)}>Make current</button>}
                  <button type="button" className={styles.iconBtn} onClick={() => remove(s)} aria-label={`Delete season ${s.name}`}><Trash2 size={15} strokeWidth={1.5} aria-hidden="true" /></button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <form className="col-lg-5 d-grid gap-4" onSubmit={create} noValidate aria-label="New season">
        <div className="wp-slate"><span className="wp-slate-tab">+</span><h3>New season</h3></div>
        <Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <div className="row g-4">
          <div className="col-6"><Input label="Starts" type="date" value={toLocalInput(form.startDate, false)} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} /></div>
          <div className="col-6"><Input label="Ends" type="date" value={toLocalInput(form.endDate, false)} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} /></div>
        </div>
        <label className="form-check d-flex align-items-center gap-2">
          <input type="checkbox" className="form-check-input mt-0" checked={form.current} onChange={(e) => setForm((f) => ({ ...f, current: e.target.checked }))} />
          <span className="form-check-label">Make this the current season</span>
        </label>
        <div><Button type="submit" icon={Plus} loading={busy}>Create season</Button></div>
      </form>
    </div>
  );
}

export default function Admin() {
  const overview = useFetch(() => adminApi.overview(), []);
  const teams = useFetch(() => teamsApi.list(), []);
  const seasons = useFetch(() => adminApi.seasons(), []);
  const [tab, setTab] = useState('approvals');
  const o = overview.data;

  const refreshAll = () => {
    overview.reload({ quiet: true });
    teams.reload({ quiet: true });
    seasons.reload({ quiet: true });
  };

  return (
    <>
      <PageHeader eyebrow="Admin" title="Club office" />

      <section className={styles.overview} aria-label="Club totals">
        {o ? (
          <>
            <StatBlock size="lg" label="Waiting approval" value={o.pendingCoaches} tone={o.pendingCoaches ? 'accent' : undefined} />
            <StatBlock size="md" label="Accounts" value={o.users} />
            <StatBlock size="md" label="Players" value={o.players} />
            <StatBlock size="md" label="Teams" value={o.teams} />
            <StatBlock size="md" label="Matches" value={o.matches} />
          </>
        ) : (
          <Skeleton rows={1} />
        )}
      </section>

      <Segmented
        label="Section"
        hideLabel
        className="mb-4"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'approvals', label: `Approvals${o?.pendingCoaches ? ` (${o.pendingCoaches})` : ''}` },
          { value: 'users', label: 'Users & roles' },
          { value: 'teams', label: 'Teams' },
          { value: 'seasons', label: 'Seasons' },
        ]}
      />

      {tab === 'approvals' && <Approvals teams={teams.data ?? []} onChange={refreshAll} />}
      {tab === 'users' && <Users teams={teams.data ?? []} />}
      {tab === 'teams' && (teams.loading ? <Skeleton rows={3} /> : <Teams teams={teams.data ?? []} seasons={seasons.data ?? []} reload={refreshAll} />)}
      {tab === 'seasons' && (seasons.loading ? <Skeleton rows={3} /> : <Seasons seasons={seasons.data ?? []} reload={refreshAll} />)}
    </>
  );
}
