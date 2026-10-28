import { useState } from 'react';
import { Pencil, Send, Trash2 } from 'lucide-react';
import { announcementsApi } from '../../api/services';
import Button from '../../components/Button/Button';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import EmptyState, { ErrorState } from '../../components/EmptyState/EmptyState';
import Input from '../../components/Input/Input';
import PageHeader from '../../components/PageHeader/PageHeader';
import Segmented from '../../components/Segmented/Segmented';
import Skeleton from '../../components/Skeleton/Skeleton';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { cx } from '../../utils/cx';
import { fmtDate, fmtRelative } from '../../utils/format';
import styles from './Announcements.module.css';

const PRIORITIES = [
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];
const EMPTY = { title: '', body: '', priority: 'normal' };

function Composer({ editing, onSaved, onCancel }) {
  const toast = useToast();
  const [form, setForm] = useState(editing ? { title: editing.title, body: editing.body, priority: editing.priority } : EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (form.title.trim().length < 3) next.title = 'Write a headline of at least 3 characters.';
    if (form.body.trim().length < 3) next.body = 'Add the message.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const saved = editing ? await announcementsApi.update(editing._id, form) : await announcementsApi.create(form);
      onSaved(saved);
      toast.success(editing ? 'Announcement updated.' : 'Posted. It’s on the ticker now.');
      if (!editing) setForm(EMPTY);
    } catch (err) {
      setErrors(err.fields ?? {});
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={styles.composer} onSubmit={submit} noValidate aria-label={editing ? 'Edit announcement' : 'New announcement'}>
      <Input label="Headline" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} error={errors.title} maxLength={90} />
      <Input label="Message" as="textarea" rows={4} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} error={errors.body} maxLength={2000} />
      <div className={styles.composerFoot}>
        <Segmented label="Priority" value={form.priority} onChange={(priority) => setForm((f) => ({ ...f, priority }))} options={PRIORITIES} size="sm" />
        <div className="d-flex gap-2">
          {editing && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
          <Button type="submit" icon={Send} cut loading={busy}>{editing ? 'Save' : 'Post'}</Button>
        </div>
      </div>
    </form>
  );
}

export default function Announcements() {
  const { isStaff, user } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload, setData } = useFetch(() => announcementsApi.list(), []);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const onSaved = (saved) =>
    setData((list) => {
      const exists = list?.some((p) => p._id === saved._id);
      setEditing(null);
      return exists ? list.map((p) => (p._id === saved._id ? saved : p)) : [saved, ...(list ?? [])];
    });

  const remove = async () => {
    try {
      await announcementsApi.remove(deleting._id);
      setData((list) => list.filter((p) => p._id !== deleting._id));
      setDeleting(null);
      toast.success('Announcement removed.');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const [lead, ...rest] = data ?? [];

  return (
    <>
      <PageHeader eyebrow="Announcements" title="Programme notes" meta={data && <span>{data.length} notices</span>} />

      <div className="row g-5">
        <div className={isStaff ? 'col-lg-8' : 'col-12'}>
          {loading ? (
            <Skeleton rows={6} />
          ) : error ? (
            <ErrorState error={error} onRetry={reload} />
          ) : !data.length ? (
            <EmptyState title="No announcements. Quiet week.">{isStaff ? 'Post the first notice. It also runs on the ticker.' : 'Notices from the coaching staff appear here.'}</EmptyState>
          ) : (
            <ol className={styles.feed}>
              {[lead, ...rest].map((p, i) => {
                const canEdit = user.role === 'admin' || p.author?._id === user._id;
                return (
                  <li key={p._id} className={cx(styles.post, i === 0 && styles.lead, styles[p.priority], 'wp-reveal')} style={{ '--d': Math.min(i, 6) }}>
                    {editing?._id === p._id ? (
                      <Composer editing={p} onSaved={onSaved} onCancel={() => setEditing(null)} />
                    ) : (
                      <>
                        <header className={styles.postHead}>
                          {p.priority !== 'normal' && <span className={styles.prio}>{p.priority}</span>}
                          <span className="wp-label">
                            {p.author?.name} · {p.author?.role} · <time dateTime={p.createdAt} title={fmtDate(p.createdAt, { dateStyle: 'full' })}>{fmtRelative(p.createdAt)}</time>
                          </span>
                          {isStaff && canEdit && (
                            <span className={styles.postActions}>
                              <button type="button" onClick={() => setEditing(p)} aria-label={`Edit ${p.title}`}><Pencil size={14} strokeWidth={1.5} aria-hidden="true" /></button>
                              <button type="button" onClick={() => setDeleting(p)} aria-label={`Delete ${p.title}`}><Trash2 size={14} strokeWidth={1.5} aria-hidden="true" /></button>
                            </span>
                          )}
                        </header>
                        <h2 className={styles.title}>{p.title}</h2>
                        <p className={styles.body}>{p.body}</p>
                      </>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
        {isStaff && (
          <aside className="col-lg-4" aria-labelledby="compose-h">
            <div className={styles.sticky}>
              <div className="wp-slate">
                <span className="wp-slate-tab">NEW</span>
                <h2 id="compose-h">Post a notice</h2>
              </div>
              <Composer onSaved={onSaved} />
              <p className="wp-meta mt-3 mb-0">Posts go to the whole team and run on the ticker. Urgent posts show in red.</p>
            </div>
          </aside>
        )}
      </div>

      <ConfirmModal show={Boolean(deleting)} title="Delete this notice?" onHide={() => setDeleting(null)} onConfirm={remove}>
        <p className="mb-0">“{deleting?.title}” is removed from the feed and the ticker.</p>
      </ConfirmModal>
    </>
  );
}
