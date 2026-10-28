import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Goal, Pencil, Plus, Trash2 } from 'lucide-react';
import Modal from 'react-bootstrap/Modal';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { matchesApi, playersApi } from '../../api/services';
import Button from '../../components/Button/Button';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import EmptyState, { ErrorState } from '../../components/EmptyState/EmptyState';
import Input from '../../components/Input/Input';
import PitchMarkings from '../../components/Pitch/PitchMarkings';
import Scoreline from '../../components/Scoreline/Scoreline';
import Segmented from '../../components/Segmented/Segmented';
import Select from '../../components/Select/Select';
import Skeleton from '../../components/Skeleton/Skeleton';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { cx } from '../../utils/cx';
import { surname } from '../../utils/format';
import { FORMATIONS } from '../../utils/formations';
import { EVENT_LABELS, STATUS_LABELS, toScoreline } from '../../utils/match';
import MatchFormModal from './MatchFormModal';
import styles from './MatchDetail.module.css';

const EVENT_OPTIONS = ['goal', 'assist', 'yellow', 'red', 'sub_in', 'sub_out', 'injury', 'own_goal', 'goal_against'].map((value) => ({
  value,
  label: EVENT_LABELS[value],
}));

function ResultModal({ show, match, onHide, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ for: '', against: '', status: 'ft' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (show) {
      setError('');
      setForm({ for: match.score?.for ?? 0, against: match.score?.against ?? 0, status: match.status === 'scheduled' ? 'ft' : match.status });
    }
  }, [show, match]);

  const submit = async (e) => {
    e.preventDefault();
    if (form.for === '' || form.against === '') return setError('Enter both scores.');
    setBusy(true);
    try {
      const saved = await matchesApi.update(match._id, { status: form.status, score: { for: Number(form.for), against: Number(form.against) } });
      toast.success('Result saved.');
      onSaved(saved);
      onHide();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const usHome = match.homeAway === 'home';
  const usField = <Input label="Us" type="number" min={0} inputMode="numeric" value={form.for} onChange={(e) => setForm((f) => ({ ...f, for: e.target.value }))} />;
  const themField = <Input label={match.opponentShort} type="number" min={0} inputMode="numeric" value={form.against} onChange={(e) => setForm((f) => ({ ...f, against: e.target.value }))} />;

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Enter result</Modal.Title>
      </Modal.Header>
      <form onSubmit={submit} noValidate>
        <Modal.Body className="d-grid gap-4">
          {error && <p className="text-red mb-0" role="alert">{error}</p>}
          <div className={styles.resultInputs}>
            {usHome ? usField : themField}
            <span className={styles.resultDash} aria-hidden="true">–</span>
            {usHome ? themField : usField}
          </div>
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            options={['live', 'ht', 'ft'].map((v) => ({ value: v, label: STATUS_LABELS[v] }))}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" onClick={onHide}>Cancel</Button>
          <Button type="submit" loading={busy}>Save result</Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}

function Timeline({ match, isStaff, squad, onChange }) {
  const toast = useToast();
  const [form, setForm] = useState({ type: 'goal', player: '', minute: '' });
  const [busy, setBusy] = useState(false);
  const needsPlayer = form.type !== 'goal_against';

  const add = async (e) => {
    e.preventDefault();
    const minute = Number(form.minute);
    if (form.minute === '' || minute < 0 || minute > 130) return toast.error('Add the minute (0–130).');
    if (needsPlayer && !form.player) return toast.error('Pick the player.');
    setBusy(true);
    try {
      onChange(await matchesApi.addEvent(match._id, { type: form.type, minute, player: needsPlayer ? form.player : undefined }));
      setForm((f) => ({ ...f, minute: '' }));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (ev) => {
    try {
      onChange(await matchesApi.removeEvent(match._id, ev._id));
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="row g-5">
      <div className={isStaff ? 'col-lg-8' : 'col-12'}>
        {!match.events.length ? (
          <EmptyState compact title="Nothing logged yet.">Goals, cards and changes appear here minute by minute.</EmptyState>
        ) : (
          <ol className={styles.timeline}>
            {match.events.map((ev) => {
              const theirs = ev.type === 'goal_against';
              return (
                <li key={ev._id} className={cx(styles.event, theirs && styles.theirs, styles[ev.type])}>
                  <span className={styles.minute}>{ev.minute}'</span>
                  <span className={styles.eventBody}>
                    <span className={styles.eventType}>
                      <i className={styles.glyph} aria-hidden="true" />
                      {EVENT_LABELS[ev.type]}
                    </span>
                    <span className={styles.eventWho}>{theirs ? match.opponent : ev.player?.name ?? 'Unknown'}</span>
                  </span>
                  {isStaff && (
                    <button type="button" className={styles.eventDelete} onClick={() => remove(ev)} aria-label={`Delete ${EVENT_LABELS[ev.type]} at ${ev.minute} minutes`}>
                      <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
      {isStaff && (
        <form className="col-lg-4" onSubmit={add} noValidate aria-label="Log an event">
          <div className="wp-slate">
            <span className="wp-slate-tab">+</span>
            <h3>Log an event</h3>
          </div>
          <div className="d-grid gap-4">
            <Select label="Event" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} options={EVENT_OPTIONS} />
            {needsPlayer && (
              <Select
                label="Player"
                value={form.player}
                onChange={(e) => setForm((f) => ({ ...f, player: e.target.value }))}
                placeholder="Pick a player"
                options={squad.map((p) => ({ value: p._id, label: `${p.jerseyNumber ?? '–'} ${p.name}` }))}
              />
            )}
            <Input label="Minute" type="number" min={0} max={130} inputMode="numeric" value={form.minute} onChange={(e) => setForm((f) => ({ ...f, minute: e.target.value }))} />
            <Button type="submit" variant="chalk" icon={Plus} loading={busy}>Add to timeline</Button>
          </div>
        </form>
      )}
    </div>
  );
}

function LineupView({ match, isStaff }) {
  const slots = FORMATIONS[match.lineup.formation] ?? [];
  const bySlot = new Map(match.lineup.positions.map((p) => [p.slot, p.player]));
  if (!match.lineup.positions.length) {
    return (
      <EmptyState compact title="No lineup picked." action={isStaff && <Link to={`/lineup/${match._id}`} className="btn btn-primary btn-sm">Open the formation builder</Link>}>
        {isStaff ? 'Drag players onto the pitch to name the starting eleven.' : 'The coach hasn’t named the team yet.'}
      </EmptyState>
    );
  }
  return (
    <div className="row g-5">
      <div className="col-md-7 col-lg-6">
        <div className={styles.pitch} aria-label={`${match.lineup.formation} starting lineup`} role="img">
          <PitchMarkings className={styles.pitchLines} />
          {slots.map((s) => {
            const p = bySlot.get(s.id);
            return (
              <span key={s.id} className={styles.slot} style={{ left: `${s.x}%`, top: `${s.y}%` }}>
                <b>{p?.jerseyNumber ?? '–'}</b>
                <small>{p ? surname(p.name) : s.id}</small>
              </span>
            );
          })}
        </div>
      </div>
      <div className="col-md-5 col-lg-6">
        <p className="wp-label">Formation</p>
        <p className="wp-big-sm">{match.lineup.formation}</p>
        <p className="wp-label mt-4">Starting eleven</p>
        <ol className={styles.sheet}>
          {slots.map((s) => {
            const p = bySlot.get(s.id);
            return p ? (
              <li key={s.id}><span className="wp-num">{p.jerseyNumber}</span><Link to={`/squad/${p._id}`}>{p.name}</Link><span className="wp-label">{s.id}</span></li>
            ) : null;
          })}
        </ol>
        {match.lineup.bench.length > 0 && (
          <>
            <p className="wp-label mt-4">Bench</p>
            <ol className={styles.sheet}>
              {match.lineup.bench.map((p) => (
                <li key={p._id}><span className="wp-num">{p.jerseyNumber}</span><Link to={`/squad/${p._id}`}>{p.name}</Link></li>
              ))}
            </ol>
          </>
        )}
        {isStaff && <Link to={`/lineup/${match._id}`} className="btn btn-chalk btn-sm mt-3">Change lineup</Link>}
      </div>
    </div>
  );
}

const STAT_FIELDS = [
  ['minutes', 'Min', 130],
  ['goals', 'G', 20],
  ['assists', 'A', 20],
  ['shots', 'Sh', 50],
  ['passes', 'Pass', 300],
  ['rating', 'Rtg', 10],
];

function StatsView({ match, isStaff, squad, onChange }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  // Editable rows: everyone with stats, plus anyone in the lineup or bench.
  const startEdit = () => {
    const byId = new Map(match.stats.map((s) => [s.player._id, s]));
    const ids = [...new Set([...match.lineup.positions.map((p) => p.player?._id), ...match.lineup.bench.map((p) => p?._id), ...byId.keys()].filter(Boolean))];
    const list = (ids.length ? ids : squad.map((p) => p._id)).map((id) => {
      const p = squad.find((x) => x._id === id) ?? byId.get(id)?.player;
      const s = byId.get(id) ?? {};
      return { player: id, name: p?.name ?? 'Player', jerseyNumber: p?.jerseyNumber, ...Object.fromEntries(STAT_FIELDS.map(([k]) => [k, s[k] ?? (k === 'rating' ? '' : 0)])) };
    });
    setRows(list);
    setEditing(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      const stats = rows
        .filter((r) => Number(r.minutes) > 0)
        .map((r) => ({ player: r.player, ...Object.fromEntries(STAT_FIELDS.map(([k]) => [k, r[k] === '' ? (k === 'rating' ? null : 0) : Number(r[k])])) }));
      onChange(await matchesApi.saveStats(match._id, stats));
      toast.success('Player stats saved. Players with 0 minutes were left out.');
      setEditing(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <div className="d-grid gap-3">
        <div className="table-responsive">
          <table className="table table-league align-middle">
            <caption className="visually-hidden">Edit player stats</caption>
            <thead>
              <tr>
                <th scope="col" className="col-pos">No.</th>
                <th scope="col">Player</th>
                {STAT_FIELDS.map(([k, label]) => <th key={k} scope="col" className="col-num">{label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.player}>
                  <td className="col-pos">{r.jerseyNumber ?? '–'}</td>
                  <td>{r.name}</td>
                  {STAT_FIELDS.map(([k, label, max]) => (
                    <td key={k} className="col-num">
                      <input
                        className={cx('form-control form-control-sm', styles.statInput)}
                        type="number"
                        min={0}
                        max={max}
                        step={k === 'rating' ? 0.1 : 1}
                        value={r[k]}
                        aria-label={`${label} for ${r.name}`}
                        onChange={(e) => setRows((all) => all.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="d-flex gap-3">
          <Button onClick={save} loading={busy}>Save stats</Button>
          <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </div>
    );
  }

  const stats = [...match.stats].sort((a, b) => b.minutes - a.minutes || (a.player?.jerseyNumber ?? 99) - (b.player?.jerseyNumber ?? 99));
  return (
    <div className="d-grid gap-3">
      {!stats.length ? (
        <EmptyState compact title="No numbers in yet." action={isStaff && match.status !== 'scheduled' && <Button size="sm" variant="chalk" icon={Pencil} onClick={startEdit}>Enter player stats</Button>}>
          Minutes, goals, shots and ratings go here after the match.
        </EmptyState>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-league">
              <caption className="visually-hidden">Player stats</caption>
              <thead>
                <tr>
                  <th scope="col" className="col-pos">No.</th>
                  <th scope="col">Player</th>
                  {STAT_FIELDS.slice(0, 5).map(([k, label]) => <th key={k} scope="col" className="col-num">{label}</th>)}
                  <th scope="col" className="col-pts">Rtg</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s._id}>
                    <td className="col-pos">{s.player?.jerseyNumber ?? '–'}</td>
                    <td><Link to={`/squad/${s.player?._id}`} className={styles.tableLink}>{s.player?.name}</Link></td>
                    {STAT_FIELDS.slice(0, 5).map(([k]) => <td key={k} className="col-num">{s[k]}</td>)}
                    <td className="col-pts">{s.rating?.toFixed(1) ?? '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isStaff && <div><Button size="sm" variant="chalk" icon={Pencil} onClick={startEdit}>Edit player stats</Button></div>}
        </>
      )}
    </div>
  );
}

export default function MatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { team, isStaff } = useAuth();
  const { data: match, loading, error, reload, setData } = useFetch(() => matchesApi.get(id), [id]);
  const squadFetch = useFetch(() => playersApi.list(), [], { skip: !isStaff });
  const [tab, setTab] = useState('timeline');
  const [modal, setModal] = useState(null); // 'result' | 'edit' | 'delete'

  const squad = useMemo(() => squadFetch.data ?? [], [squadFetch.data]);

  if (loading) return <div className="pt-5"><Skeleton rows={5} big label="Loading match" /></div>;
  if (error) return <div className="pt-5"><ErrorState error={error} onRetry={reload} /></div>;

  const remove = async () => {
    try {
      const res = await matchesApi.remove(match._id);
      toast.success(res.message);
      navigate('/fixtures', { replace: true });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const played = match.status !== 'scheduled' && match.status !== 'postponed';

  return (
    <div className={styles.page}>
      <Link to="/fixtures" className={cx('btn btn-ghost btn-sm', styles.back)}>
        <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" /> Fixtures
      </Link>

      <div className="wp-reveal">
        <Scoreline {...toScoreline(match, team)} />
      </div>

      {isStaff && (
        <div className={cx(styles.toolbar, 'wp-reveal')} style={{ '--d': 1 }}>
          <Button icon={Goal} onClick={() => setModal('result')}>{played ? 'Update result' : 'Enter result'}</Button>
          <Link to={`/lineup/${match._id}`} className="btn btn-chalk">Formation builder</Link>
          <Button variant="chalk" icon={Pencil} onClick={() => setModal('edit')}>Edit fixture</Button>
          <Button variant="ghost" icon={Trash2} onClick={() => setModal('delete')}>Delete</Button>
        </div>
      )}

      <Segmented
        label="Section"
        hideLabel
        className="my-4"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'timeline', label: 'Timeline' },
          { value: 'lineup', label: 'Lineup' },
          { value: 'stats', label: 'Player stats' },
        ]}
      />

      {tab === 'timeline' && <Timeline match={match} isStaff={isStaff} squad={squad} onChange={setData} />}
      {tab === 'lineup' && <LineupView match={match} isStaff={isStaff} />}
      {tab === 'stats' && <StatsView match={match} isStaff={isStaff} squad={squad} onChange={setData} />}

      {isStaff && (
        <>
          <ResultModal show={modal === 'result'} match={match} onHide={() => setModal(null)} onSaved={setData} />
          <MatchFormModal show={modal === 'edit'} match={match} onHide={() => setModal(null)} onSaved={() => reload({ quiet: true })} />
          <ConfirmModal show={modal === 'delete'} title="Delete this match?" onHide={() => setModal(null)} onConfirm={remove}>
            <p className="mb-0">The match against {match.opponent}, its lineup, player stats and availability answers are all deleted.</p>
          </ConfirmModal>
        </>
      )}
    </div>
  );
}
