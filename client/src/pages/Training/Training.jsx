import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Pencil, Plus, Trash2, UserCheck } from 'lucide-react';
import Offcanvas from 'react-bootstrap/Offcanvas';
import { playersApi, trainingApi } from '../../api/services';
import Button from '../../components/Button/Button';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import EmptyState, { ErrorState } from '../../components/EmptyState/EmptyState';
import PageHeader from '../../components/PageHeader/PageHeader';
import Skeleton from '../../components/Skeleton/Skeleton';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { cx } from '../../utils/cx';
import { fmtDate, fmtTime } from '../../utils/format';
import SessionFormModal from './SessionFormModal';
import styles from './Training.module.css';

const DAY = 86400000;
function mondayOf(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

function Register({ session, squad, onSaved }) {
  const toast = useToast();
  const [marks, setMarks] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMarks(Object.fromEntries(session.attendance.map((a) => [a.player, a.present])));
  }, [session]);

  const present = squad.filter((p) => marks[p._id]).length;

  const save = async () => {
    setBusy(true);
    try {
      const saved = await trainingApi.setAttendance(session._id, squad.map((p) => ({ player: p._id, present: Boolean(marks[p._id]) })));
      toast.success(`${present} of ${squad.length} marked present.`, 'Register saved');
      onSaved(saved);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="d-grid gap-3">
      <div className="d-flex align-items-baseline justify-content-between">
        <p className="wp-label mb-0">Register · {present}/{squad.length}</p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMarks(Object.fromEntries(squad.map((p) => [p._id, true])))}>
          Mark everyone in
        </button>
      </div>
      <ul className={styles.register}>
        {squad.map((p) => (
          <li key={p._id}>
            <label className={styles.registerRow}>
              <input
                type="checkbox"
                className="form-check-input mt-0"
                checked={Boolean(marks[p._id])}
                onChange={(e) => setMarks((m) => ({ ...m, [p._id]: e.target.checked }))}
              />
              <span className="wp-num">{p.jerseyNumber ?? '–'}</span>
              <span className={styles.registerName}>{p.name}</span>
              {p.status === 'injured' && <span className="wp-label text-red">Injured</span>}
            </label>
          </li>
        ))}
      </ul>
      <Button onClick={save} loading={busy}>Save register</Button>
    </div>
  );
}

function SessionDrawer({ session, show, onHide, isStaff, myPlayerId, squad, onSaved, onEdit, onDelete }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (!session) return null;

  const mine = session.attendance.find((a) => a.player === myPlayerId);
  const start = new Date(session.date);
  const end = new Date(start.getTime() + session.duration * 60000);
  const windowOpen = Date.now() >= start.getTime() - 2 * 3600e3 && Date.now() <= end.getTime() + 2 * 3600e3;

  const checkIn = async () => {
    setBusy(true);
    try {
      onSaved(await trainingApi.checkIn(session._id));
      toast.success('You’re checked in.', 'See you out there');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Offcanvas show={show} onHide={onHide} placement="end" className={styles.drawer}>
      <Offcanvas.Header closeButton>
        <Offcanvas.Title className="wp-label">{fmtDate(session.date, { weekday: 'long', day: 'numeric', month: 'long' })}</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body className="d-grid gap-4 align-content-start">
        <div>
          <p className={styles.drawerTime}>{fmtTime(start)}–{fmtTime(end)}</p>
          <h2 className={styles.drawerFocus}>{session.focus}</h2>
          <p className="wp-label mb-0 d-flex align-items-center gap-2">
            <MapPin size={13} strokeWidth={1.5} aria-hidden="true" /> {session.location} · {session.duration} min
          </p>
        </div>

        {session.drills?.length > 0 && (
          <div>
            <p className="wp-label">Drills</p>
            <ol className={styles.drills}>
              {session.drills.map((d) => <li key={d}>{d}</li>)}
            </ol>
          </div>
        )}

        {isStaff ? (
          <>
            <Register session={session} squad={squad} onSaved={onSaved} />
            <div className="d-flex gap-3">
              <Button variant="chalk" size="sm" icon={Pencil} onClick={onEdit}>Edit</Button>
              <Button variant="ghost" size="sm" icon={Trash2} onClick={onDelete}>Delete</Button>
            </div>
          </>
        ) : (
          <div className="d-grid gap-2">
            <p className="wp-label mb-0">Your attendance</p>
            {mine?.present ? (
              <p className={styles.checkedIn}>
                <UserCheck size={18} strokeWidth={1.5} aria-hidden="true" /> Checked in {mine.checkedInAt ? `at ${fmtTime(mine.checkedInAt)}` : ''}
              </p>
            ) : windowOpen ? (
              <Button icon={UserCheck} loading={busy} onClick={checkIn}>Check in</Button>
            ) : (
              <p className="wp-meta mb-0">
                {Date.now() < start.getTime() ? 'Check-in opens 2 hours before the start.' : session.attendance.length ? 'Marked absent.' : 'No register taken.'}
              </p>
            )}
          </div>
        )}
      </Offcanvas.Body>
    </Offcanvas>
  );
}

export default function Training() {
  const { isStaff, player } = useAuth();
  const toast = useToast();
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const weekEnd = new Date(weekStart.getTime() + 7 * DAY);
  const { data, loading, error, reload, setData } = useFetch(
    () => trainingApi.list({ from: weekStart.toISOString(), to: weekEnd.toISOString() }),
    [weekStart.getTime()],
  );
  const squad = useFetch(() => playersApi.list(), [], { skip: !isStaff });
  const [openId, setOpenId] = useState(null);
  const [form, setForm] = useState(null); // null | { session?, date? }
  const [deleting, setDeleting] = useState(null);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * DAY)), [weekStart]);
  const sessions = data ?? [];
  const open = sessions.find((s) => s._id === openId);
  const totalMins = sessions.reduce((sum, s) => sum + s.duration, 0);

  const replace = (saved) =>
    setData((list) => {
      const inWeek = new Date(saved.date) >= weekStart && new Date(saved.date) < weekEnd;
      const rest = (list ?? []).filter((s) => s._id !== saved._id);
      return (inWeek ? [...rest, saved] : rest).sort((a, b) => new Date(a.date) - new Date(b.date));
    });

  const remove = async () => {
    try {
      await trainingApi.remove(deleting._id);
      setData((list) => list.filter((s) => s._id !== deleting._id));
      setOpenId(null);
      setDeleting(null);
      toast.success('Session removed.');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const isThisWeek = sameDay(weekStart, mondayOf(new Date()));

  return (
    <>
      <PageHeader
        eyebrow="Training"
        title="The week"
        meta={
          <>
            <span>{fmtDate(weekStart, { day: 'numeric', month: 'short' })} – {fmtDate(new Date(weekEnd.getTime() - DAY), { day: 'numeric', month: 'short' })}</span>
            <span>{sessions.length} sessions</span>
            <span>{Math.round(totalMins / 6) / 10} hrs on the grass</span>
          </>
        }
        actions={isStaff && <Button icon={Plus} cut onClick={() => setForm({})}>Add session</Button>}
      />

      <div className={styles.weekNav}>
        <Button variant="chalk" size="sm" icon={ChevronLeft} onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * DAY))}>Previous</Button>
        <Button variant="ghost" size="sm" disabled={isThisWeek} onClick={() => setWeekStart(mondayOf(new Date()))}>This week</Button>
        <Button variant="chalk" size="sm" icon={ChevronRight} iconPosition="end" onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * DAY))}>Next</Button>
      </div>

      {loading ? (
        <Skeleton rows={6} label="Loading the week" />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <>
          {!sessions.length && (
            <EmptyState compact title="Rest week. Nothing on the board." className="mb-4">
              {isStaff ? 'Add a session, or pick a day below.' : 'No sessions are planned for this week.'}
            </EmptyState>
          )}
          <ol className={styles.week}>
            {days.map((d, i) => {
              const today = sameDay(d, new Date());
              const daySessions = sessions.filter((s) => sameDay(s.date, d));
              return (
                <li key={d.toISOString()} className={cx(styles.day, today && styles.today, 'wp-reveal')} style={{ '--d': i }}>
                  <div className={styles.dayHead}>
                    <span className="wp-label">{fmtDate(d, { weekday: 'short' })}</span>
                    <span className={styles.dayNum}>{fmtDate(d, { day: '2-digit' })}</span>
                    {today && <span className={styles.todayTag}>Today</span>}
                  </div>
                  <div className={styles.dayBody}>
                    {daySessions.map((s) => {
                      const present = s.attendance.filter((a) => a.present).length;
                      const mine = player && s.attendance.find((a) => a.player === player._id);
                      return (
                        <button key={s._id} type="button" className={styles.session} onClick={() => setOpenId(s._id)}>
                          <span className={styles.sessionTime}>{fmtTime(s.date)} · {s.duration}′</span>
                          <span className={styles.sessionFocus}>{s.focus}</span>
                          <span className={styles.sessionMeta}>
                            {s.location}
                            {s.attendance.length > 0 && (isStaff ? ` · ${present}/${s.attendance.length} in` : mine?.present ? ' · You attended' : '')}
                          </span>
                        </button>
                      );
                    })}
                    {isStaff && (
                      <button
                        type="button"
                        className={styles.addHere}
                        onClick={() => {
                          const at = new Date(d);
                          at.setHours(18, 30, 0, 0);
                          setForm({ date: at });
                        }}
                        aria-label={`Add a session on ${fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' })}`}
                      >
                        <Plus size={14} strokeWidth={1.5} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}

      <SessionDrawer
        session={open}
        show={Boolean(open)}
        onHide={() => setOpenId(null)}
        isStaff={isStaff}
        myPlayerId={player?._id}
        squad={squad.data ?? []}
        onSaved={replace}
        onEdit={() => setForm({ session: open })}
        onDelete={() => setDeleting(open)}
      />
      <SessionFormModal show={Boolean(form)} session={form?.session} defaultDate={form?.date} onHide={() => setForm(null)} onSaved={replace} />
      <ConfirmModal show={Boolean(deleting)} title="Delete this session?" onHide={() => setDeleting(null)} onConfirm={remove}>
        <p className="mb-0">{deleting?.focus} on {deleting && fmtDate(deleting.date)} and its register are deleted.</p>
      </ConfirmModal>
    </>
  );
}
