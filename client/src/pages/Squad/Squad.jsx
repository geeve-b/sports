import { useMemo, useState } from 'react';
import { LayoutGrid, Pencil, Plus, Rows3, Search, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { playersApi } from '../../api/services';
import Button from '../../components/Button/Button';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import EmptyState, { ErrorState } from '../../components/EmptyState/EmptyState';
import Input from '../../components/Input/Input';
import PageHeader from '../../components/PageHeader/PageHeader';
import PlayerCard from '../../components/PlayerCard/PlayerCard';
import Segmented from '../../components/Segmented/Segmented';
import Select from '../../components/Select/Select';
import Skeleton from '../../components/Skeleton/Skeleton';
import StatusTag from '../../components/StatusTag/StatusTag';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { POSITION_PLURAL, STATUS_NAMES } from '../../utils/format';
import PlayerFormModal from './PlayerFormModal';
import styles from './Squad.module.css';

const POSITION_FILTERS = [
  { value: '', label: 'All' },
  { value: 'GK', label: 'GK' },
  { value: 'DF', label: 'DF' },
  { value: 'MF', label: 'MF' },
  { value: 'FW', label: 'FW' },
];
const VIEW_KEY = 'wp-squad-view';

function readView() {
  try {
    return localStorage.getItem(VIEW_KEY) === 'table' ? 'table' : 'grid';
  } catch {
    return 'grid';
  }
}

export default function Squad() {
  const { isStaff } = useAuth();
  const toast = useToast();
  const { data: players, loading, error, reload, setData } = useFetch(() => playersApi.list(), []);
  const [q, setQ] = useState('');
  const [position, setPosition] = useState('');
  const [status, setStatus] = useState('');
  const [view, setViewState] = useState(readView);
  const [editing, setEditing] = useState(null); // null | 'new' | player
  const [removing, setRemoving] = useState(null);

  const setView = (v) => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* ignore */
    }
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (players ?? []).filter(
      (p) =>
        (!position || p.position === position) &&
        (!status || p.status === status) &&
        (!needle || p.name.toLowerCase().includes(needle) || String(p.jerseyNumber ?? '') === needle),
    );
  }, [players, q, position, status]);

  const groups = useMemo(
    () => ['GK', 'DF', 'MF', 'FW'].map((pos) => ({ pos, players: filtered.filter((p) => p.position === pos) })).filter((g) => g.players.length),
    [filtered],
  );

  const onSaved = (saved) =>
    setData((list) => {
      const rest = (list ?? []).filter((p) => p._id !== saved._id);
      return [...rest, { stats: list?.find((p) => p._id === saved._id)?.stats, ...saved }].sort(
        (a, b) => 'GKDFMFFW'.indexOf(a.position) - 'GKDFMFFW'.indexOf(b.position) || (a.jerseyNumber ?? 100) - (b.jerseyNumber ?? 100),
      );
    });

  const remove = async () => {
    try {
      const res = await playersApi.remove(removing._id);
      setData((list) => list.filter((p) => p._id !== removing._id));
      toast.success(res.message);
      setRemoving(null);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const counts = useMemo(() => {
    const c = { fit: 0, injured: 0 };
    for (const p of players ?? []) {
      if (p.status === 'fit') c.fit += 1;
      if (p.status === 'injured') c.injured += 1;
    }
    return c;
  }, [players]);

  let cardIndex = 0;

  return (
    <>
      <PageHeader
        eyebrow="Squad"
        title="First team"
        meta={
          players && (
            <>
              <span>{players.length} players</span>
              <span>{counts.fit} fit</span>
              {counts.injured > 0 && <span className="text-red">{counts.injured} injured</span>}
            </>
          )
        }
        actions={isStaff && <Button icon={Plus} cut onClick={() => setEditing('new')}>Add player</Button>}
      />

      <div className={styles.toolbar} role="search">
        <div className={styles.search}>
          <Input label="Search" placeholder="Name or shirt number" value={q} onChange={(e) => setQ(e.target.value)} suffix={<Search size={15} strokeWidth={1.5} aria-hidden="true" />} />
        </div>
        <Segmented label="Position" value={position} onChange={setPosition} options={POSITION_FILTERS} size="sm" />
        <div className={styles.status}>
          <Select label="Fitness" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Any" options={Object.entries(STATUS_NAMES).map(([value, label]) => ({ value, label }))} />
        </div>
        <Segmented
          label="View"
          hideLabel
          className={styles.viewToggle}
          value={view}
          onChange={setView}
          size="sm"
          options={[
            { value: 'grid', label: 'Cards', icon: LayoutGrid, iconOnly: true },
            { value: 'table', label: 'Table', icon: Rows3, iconOnly: true },
          ]}
        />
      </div>

      <p className="visually-hidden" aria-live="polite">{players ? `${filtered.length} players shown` : ''}</p>

      {loading ? (
        <Skeleton rows={6} label="Loading squad" />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !players.length ? (
        <EmptyState title="Nobody’s signed yet." action={isStaff && <Button icon={Plus} onClick={() => setEditing('new')}>Add the first player</Button>}>
          The dressing room is empty. {isStaff ? 'Add players and they’ll get a login to the portal.' : 'Your coach adds players here.'}
        </EmptyState>
      ) : !filtered.length ? (
        <EmptyState compact title="No one matches that.">Try another name, or clear the filters.</EmptyState>
      ) : view === 'grid' ? (
        groups.map((g) => (
          <section key={g.pos} className={styles.group} aria-labelledby={`grp-${g.pos}`}>
            <div className="wp-slate">
              <span className="wp-slate-tab">{g.pos}</span>
              <h2 id={`grp-${g.pos}`}>{POSITION_PLURAL[g.pos]}</h2>
              <span className="wp-slate-end wp-label">{g.players.length}</span>
            </div>
            <div className={styles.grid}>
              {g.players.map((p) => (
                <PlayerCard key={p._id} player={p} to={`/squad/${p._id}`} index={cardIndex++} />
              ))}
            </div>
          </section>
        ))
      ) : (
        <div className="table-responsive">
          <table className="table table-league align-middle">
            <caption className="visually-hidden">Squad list</caption>
            <thead>
              <tr>
                <th scope="col" className="col-pos">No.</th>
                <th scope="col">Player</th>
                <th scope="col">Pos</th>
                <th scope="col">Fitness</th>
                <th scope="col" className="col-num">Apps</th>
                <th scope="col" className="col-num">Mins</th>
                <th scope="col" className="col-num">G</th>
                <th scope="col" className="col-num">A</th>
                <th scope="col" className="col-pts">Avg</th>
                {isStaff && <th scope="col"><span className="visually-hidden">Actions</span></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p._id}>
                  <td className="col-pos">{p.jerseyNumber ?? '–'}</td>
                  <td><Link to={`/squad/${p._id}`} className={styles.tableName}>{p.name}</Link></td>
                  <td>{p.position}</td>
                  <td><StatusTag status={p.status} /></td>
                  <td className="col-num">{p.stats.apps}</td>
                  <td className="col-num">{p.stats.minutes}</td>
                  <td className="col-num">{p.stats.goals}</td>
                  <td className="col-num">{p.stats.assists}</td>
                  <td className="col-pts">{p.stats.rating?.toFixed(1) ?? '–'}</td>
                  {isStaff && (
                    <td className={styles.rowActions}>
                      <button type="button" className={styles.iconAction} onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`}>
                        <Pencil size={15} strokeWidth={1.5} aria-hidden="true" />
                      </button>
                      <button type="button" className={styles.iconAction} onClick={() => setRemoving(p)} aria-label={`Remove ${p.name}`}>
                        <Trash2 size={15} strokeWidth={1.5} aria-hidden="true" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PlayerFormModal show={Boolean(editing)} player={editing === 'new' ? null : editing} onHide={() => setEditing(null)} onSaved={onSaved} />
      <ConfirmModal show={Boolean(removing)} title="Remove player?" confirmLabel="Remove from squad" onHide={() => setRemoving(null)} onConfirm={remove}>
        {removing && (
          <p className="mb-0">
            {removing.name} loses their login, and their match stats and availability answers are deleted. This can’t be undone.
          </p>
        )}
      </ConfirmModal>
    </>
  );
}
