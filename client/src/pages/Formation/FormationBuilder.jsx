import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutGroup } from 'framer-motion';
import { Eraser, Save, Sparkles } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { availabilityApi, matchesApi, playersApi } from '../../api/services';
import Button from '../../components/Button/Button';
import EmptyState, { ErrorState } from '../../components/EmptyState/EmptyState';
import PageHeader from '../../components/PageHeader/PageHeader';
import PitchMarkings from '../../components/Pitch/PitchMarkings';
import Segmented from '../../components/Segmented/Segmented';
import Select from '../../components/Select/Select';
import Skeleton from '../../components/Skeleton/Skeleton';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { cx } from '../../utils/cx';
import { fmtDate, POSITION_PLURAL, surname } from '../../utils/format';
import { BENCH_SIZE, FORMATION_NAMES, FORMATIONS, SLOT_NAMES } from '../../utils/formations';
import PlayerToken from './PlayerToken';
import styles from './FormationBuilder.module.css';

const INSTRUCTIONS_ID = 'formation-instructions';

/** Which drop zone is under a page point. Zones carry data-drop="slot:ST" | "bench" | "pool". */
function dropTargetAt(point) {
  const els = document.elementsFromPoint(point.x - window.scrollX, point.y - window.scrollY);
  const zone = els.find((el) => el.dataset?.drop);
  if (!zone) return null;
  const [type, id] = zone.dataset.drop.split(':');
  return { type, id };
}

const sameTarget = (a, b) => a?.type === b?.type && a?.id === b?.id;

function Builder({ match, squad, availability }) {
  const toast = useToast();
  const [formation, setFormation] = useState(match.lineup?.formation ?? '4-3-3');
  const [slots, setSlots] = useState(() => Object.fromEntries((match.lineup?.positions ?? []).map((p) => [p.slot, p.player?._id ?? p.player])));
  const [bench, setBench] = useState(() => (match.lineup?.bench ?? []).map((p) => p?._id ?? p));
  const [held, setHeld] = useState(null);
  const [over, setOver] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedKey, setSavedKey] = useState(() => JSON.stringify([match.lineup?.formation ?? '4-3-3', match.lineup?.positions?.length ? Object.fromEntries(match.lineup.positions.map((p) => [p.slot, p.player?._id ?? p.player])) : {}, (match.lineup?.bench ?? []).map((p) => p?._id ?? p)]));

  const byId = useMemo(() => new Map(squad.map((p) => [p._id, p])), [squad]);
  const name = (id) => {
    const p = byId.get(id);
    return p ? `#${p.jerseyNumber ?? '–'} ${surname(p.name)}` : 'Player';
  };
  const layout = FORMATIONS[formation];
  const slotOf = useCallback((id) => Object.keys(slots).find((k) => slots[k] === id), [slots]);
  const assigned = new Set([...Object.values(slots), ...bench]);
  const pool = squad.filter((p) => !assigned.has(p._id));
  const dirty = JSON.stringify([formation, slots, bench]) !== savedKey;
  const startersCount = Object.keys(slots).length;

  const announce = (msg) => setAnnouncement(msg);

  const locationLabel = (id) => {
    const s = slotOf(id);
    if (s) return `On the pitch at ${SLOT_NAMES[s]}`;
    if (bench.includes(id)) return 'On the bench';
    return 'In the squad list';
  };

  /** Move a player to a target, swapping with whoever is there. */
  const place = (id, target) => {
    if (!target) return false;
    const fromSlot = slotOf(id);
    const fromBench = bench.includes(id);
    const nextSlots = { ...slots };
    let nextBench = bench.filter((b) => b !== id);
    if (fromSlot) delete nextSlots[fromSlot];

    if (target.type === 'slot') {
      if (target.id === fromSlot) return false;
      const occupant = nextSlots[target.id];
      nextSlots[target.id] = id;
      if (occupant) {
        if (fromSlot) nextSlots[fromSlot] = occupant;
        else if (fromBench) nextBench = [...bench.map((b) => (b === id ? occupant : b))];
      }
      announce(
        occupant
          ? `${name(id)} to ${SLOT_NAMES[target.id]}. ${name(occupant)} moves ${fromSlot ? `to ${SLOT_NAMES[fromSlot]}` : fromBench ? 'to the bench' : 'back to the squad list'}.`
          : `${name(id)} placed at ${SLOT_NAMES[target.id]}.`,
      );
    } else if (target.type === 'bench') {
      if (fromBench) return false;
      if (nextBench.length >= BENCH_SIZE) {
        announce(`The bench is full. It holds ${BENCH_SIZE}.`);
        toast.info(`The bench holds ${BENCH_SIZE} players.`);
        return false;
      }
      nextBench.push(id);
      announce(`${name(id)} moved to the bench.`);
    } else if (target.type === 'pool') {
      if (!fromSlot && !fromBench) return false;
      announce(`${name(id)} back in the squad list.`);
    }
    setSlots(nextSlots);
    setBench(nextBench);
    return true;
  };

  // Keyboard / tap flow: pick up a token, then choose where it goes.
  const pick = (id) => {
    if (held === id) {
      setHeld(null);
      announce(`Put ${name(id)} down.`);
      return;
    }
    if (held) {
      const s = slotOf(id);
      if (s) {
        place(held, { type: 'slot', id: s });
        setHeld(null);
        return;
      }
    }
    setHeld(id);
    announce(`Picked up ${name(id)}. Choose a position on the pitch, the bench, or the squad list. Escape to cancel.`);
  };

  const chooseZone = (target) => {
    if (!held) {
      announce('Pick a player first, then choose where they go.');
      return;
    }
    place(held, target);
    setHeld(null);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && held) {
        setHeld(null);
        announce('Cancelled.');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const onDragMove = (point) => {
    const t = dropTargetAt(point);
    if (!sameTarget(t, over)) setOver(t);
  };
  const onDrop = (id, point) => {
    setOver(null);
    setHeld(null);
    place(id, dropTargetAt(point));
  };

  const changeFormation = (next) => {
    // Keep players in the same order of slots, so the back line stays the back line.
    const oldIds = FORMATIONS[formation].map((s) => slots[s.id]);
    const nextSlots = {};
    FORMATIONS[next].forEach((s, i) => {
      if (oldIds[i]) nextSlots[s.id] = oldIds[i];
    });
    setFormation(next);
    setSlots(nextSlots);
    announce(`Formation changed to ${next}.`);
  };

  const usable = (p) => p.status !== 'injured' && p.status !== 'suspended' && availability.get(p._id) !== false;

  const autoFill = () => {
    const nextSlots = { ...slots };
    const taken = new Set([...Object.values(nextSlots), ...bench]);
    const candidates = squad.filter((p) => usable(p) && !taken.has(p._id));
    for (const s of layout) {
      if (nextSlots[s.id]) continue;
      const i = candidates.findIndex((p) => p.position === s.group);
      const pickIdx = i >= 0 ? i : candidates.findIndex((p) => p.position !== 'GK' || s.group === 'GK');
      if (pickIdx >= 0) nextSlots[s.id] = candidates.splice(pickIdx, 1)[0]._id;
    }
    const nextBench = [...bench];
    // Always try to carry a back-up keeper.
    const gk = candidates.findIndex((p) => p.position === 'GK');
    if (gk >= 0 && nextBench.length < BENCH_SIZE) nextBench.push(candidates.splice(gk, 1)[0]._id);
    while (nextBench.length < Math.min(7, BENCH_SIZE) && candidates.length) nextBench.push(candidates.shift()._id);
    setSlots(nextSlots);
    setBench(nextBench);
    announce('Empty positions filled with available players.');
  };

  const clear = () => {
    setSlots({});
    setBench([]);
    setHeld(null);
    announce('Lineup cleared.');
  };

  const save = async () => {
    setSaving(true);
    try {
      await matchesApi.saveLineup(match._id, {
        formation,
        positions: layout.filter((s) => slots[s.id]).map((s) => ({ slot: s.id, player: slots[s.id] })),
        bench,
      });
      setSavedKey(JSON.stringify([formation, slots, bench]));
      toast.success(`${startersCount} starters and ${bench.length} subs saved for ${match.opponent}.`, 'Lineup saved');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const tokenProps = (p, variant) => ({

    player: p,
    variant,
    available: availability.get(p._id) ?? null,
    held: held === p._id,
    onPick: pick,
    onDragMove,
    onDrop,
    locationLabel: locationLabel(p._id),
    describedBy: INSTRUCTIONS_ID,
  });

  const zoneState = (target) => cx(sameTarget(over, target) && styles.over, held && styles.armed);

  return (
    <LayoutGroup>
      <p id={INSTRUCTIONS_ID} className="visually-hidden">
        Drag a player onto a position, or press Enter to pick them up and then choose a position, the bench, or the squad list.
      </p>
      <div className="visually-hidden" aria-live="polite" role="status">{announcement}</div>

      <div className={styles.toolbar}>
        <Segmented label="Formation" value={formation} onChange={changeFormation} size="sm" options={FORMATION_NAMES.map((f) => ({ value: f, label: f }))} />
        <div className={styles.toolbarActions}>
          <span className={cx('wp-label', dirty && 'text-accent')} aria-live="polite">
            {dirty ? 'Unsaved changes' : 'Saved'} · {startersCount}/11 · Bench {bench.length}/{BENCH_SIZE}
          </span>
          <Button variant="ghost" size="sm" icon={Sparkles} onClick={autoFill}>Auto-fill</Button>
          <Button variant="ghost" size="sm" icon={Eraser} onClick={clear}>Clear</Button>
          <Button icon={Save} cut loading={saving} onClick={save} disabled={!dirty}>Save lineup</Button>
        </div>
      </div>

      <div className={styles.layout}>
        {/* Pitch */}
        <section className={styles.pitchWrap} aria-label={`Pitch, ${formation}`}>
          <div className={styles.pitch}>
            <PitchMarkings className={styles.lines} />
            {layout.map((s) => {
              const id = slots[s.id];
              const p = id && byId.get(id);
              const target = { type: 'slot', id: s.id };
              return (
                <div
                  key={s.id}
                  className={cx(styles.slot, !p && styles.empty, zoneState(target))}
                  style={{ left: `${s.x}%`, top: `${s.y}%` }}
                  data-drop={`slot:${s.id}`}
                >
                  {p ? (
                    <PlayerToken key={p._id} {...tokenProps(p, 'shirt')} />
                  ) : (
                    <button type="button" className={styles.slotBtn} onClick={() => chooseZone(target)} aria-label={`${SLOT_NAMES[s.id]}, empty${held ? `. Place ${name(held)} here` : ''}`}>
                      <span aria-hidden="true">{s.id}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Bench + squad */}
        <div className={styles.side}>
          <section aria-labelledby="bench-h">
            <div className="wp-slate">
              <span className="wp-slate-tab">SUB</span>
              <h2 id="bench-h">Bench</h2>
              <span className="wp-slate-end wp-label">{bench.length}/{BENCH_SIZE}</span>
            </div>
            <div className={cx(styles.zone, styles.benchZone, zoneState({ type: 'bench' }))} data-drop="bench">
              {bench.map((id) => byId.get(id) && <PlayerToken key={id} {...tokenProps(byId.get(id), 'chip')} />)}
              <button type="button" className={styles.zoneBtn} onClick={() => chooseZone({ type: 'bench' })} disabled={!held} aria-label={held ? `Move ${name(held)} to the bench` : 'Bench. Pick a player first.'}>
                {held ? 'Move here' : bench.length ? 'Drop to add' : 'Drag substitutes here'}
              </button>
            </div>
          </section>

          <section aria-labelledby="pool-h" className="mt-4">
            <div className="wp-slate">
              <span className="wp-slate-tab">SQ</span>
              <h2 id="pool-h">Squad</h2>
              <span className="wp-slate-end wp-label">{pool.length} unpicked</span>
            </div>
            <div className={cx(styles.zone, styles.poolZone, zoneState({ type: 'pool' }))} data-drop="pool">
              {held && (slotOf(held) || bench.includes(held)) && (
                <button type="button" className={styles.zoneBtn} onClick={() => chooseZone({ type: 'pool' })}>
                  Return {name(held)} to the squad
                </button>
              )}
              {pool.length === 0 ? (
                <p className="wp-meta mb-0">Everyone has a place.</p>
              ) : (
                ['GK', 'DF', 'MF', 'FW'].map((pos) => {
                  const group = pool.filter((p) => p.position === pos);
                  if (!group.length) return null;
                  return (
                    <div key={pos} className={styles.poolGroup}>
                      <p className="wp-label mb-1">{POSITION_PLURAL[pos]}</p>
                      <div className={styles.poolList}>{group.map((p) => <PlayerToken key={p._id} {...tokenProps(p, 'chip')} />)}</div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </LayoutGroup>
  );
}

export default function FormationBuilder() {
  const { matchId } = useParams();
  const navigate = useNavigate();

  const matches = useFetch(() => matchesApi.list(), []);
  const squad = useFetch(() => playersApi.list(), []);

  // No id in the URL: open the next scheduled match.
  const fallbackId = useMemo(() => {
    const list = matches.data ?? [];
    return (list.find((m) => m.status === 'scheduled' && new Date(m.date) > new Date()) ?? list[list.length - 1])?._id;
  }, [matches.data]);
  const activeId = matchId ?? fallbackId;

  const match = useFetch(() => matchesApi.get(activeId), [activeId], { skip: !activeId });
  const avail = useFetch(() => availabilityApi.forMatch(activeId), [activeId], { skip: !activeId });

  const availability = useMemo(() => new Map((avail.data?.squad ?? []).map((r) => [r.player._id, r.available])), [avail.data]);

  const loading = matches.loading || squad.loading || (activeId && (match.loading || avail.loading));
  const error = matches.error || squad.error || match.error;

  return (
    <>
      <PageHeader
        eyebrow="Formation builder"
        title="Pick the XI"
        meta={
          match.data && (
            <>
              <span>{match.data.homeAway === 'home' ? 'v' : 'at'} {match.data.opponent}</span>
              <span>{fmtDate(match.data.date)}</span>
              <Link to={`/fixtures/${match.data._id}`} className="text-reset">Match page</Link>
            </>
          )
        }
        actions={
          matches.data?.length > 0 && (
            <div style={{ minWidth: 260 }}>
              <Select
                label="Match"
                value={activeId ?? ''}
                onChange={(e) => navigate(`/lineup/${e.target.value}`)}
                options={matches.data.map((m) => ({
                  value: m._id,
                  label: `${fmtDate(m.date, { day: '2-digit', month: 'short' })} · ${m.homeAway === 'home' ? 'v' : '@'} ${m.opponent}`,
                }))}
              />
            </div>
          )
        }
      />

      {loading ? (
        <Skeleton rows={8} big label="Loading formation builder" />
      ) : error ? (
        <ErrorState error={error} onRetry={() => { matches.reload(); squad.reload(); match.reload(); }} />
      ) : !activeId ? (
        <EmptyState title="No fixtures yet. The pitch is quiet." action={<Link to="/fixtures" className="btn btn-primary">Add a fixture</Link>}>
          Lineups belong to a match. Add one first.
        </EmptyState>
      ) : !squad.data.length ? (
        <EmptyState title="No players to pick." action={<Link to="/squad" className="btn btn-primary">Build the squad</Link>}>
          Add players to the squad and they’ll appear here.
        </EmptyState>
      ) : (
        <Builder key={activeId} match={match.data} squad={squad.data} availability={availability} />
      )}
    </>
  );
}
