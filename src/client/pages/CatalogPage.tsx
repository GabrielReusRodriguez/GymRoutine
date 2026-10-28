import { useMemo, useState, type FormEvent } from 'react';
import type { Exercise } from '../../db/schema';
import type { ExerciseType } from '../../shared/types';
import type { Muscle } from '../../library/types';
import { MUSCLES, MUSCLE_LABELS, muscleLabel } from '../../library/types';
import { normalize } from '../../library';
import {
  createExercise,
  deleteExercise,
  listVisibleExercises,
  updateExercise,
} from '../../db/repositories/exercises';
import { useAuth } from '../hooks/useAuth';
import { useDbHandle } from '../hooks/useDb';
import { useAsync } from '../hooks/useAsync';
import { useI18n } from '../i18n';
import { IconEdit, IconPlus, IconSearch, IconTrash } from '../components/Icons';

interface FormState {
  name: string;
  type: ExerciseType;
  muscleGroup: Muscle;
  notes: string;
}

const EMPTY_FORM: FormState = { name: '', type: 'weights', muscleGroup: 'pectorales', notes: '' };

export function CatalogPage() {
  const { user } = useAuth();
  const handle = useDbHandle();
  const { t, tError, locale } = useI18n();

  const catalog = useAsync(
    () => listVisibleExercises(handle, user!.id),
    [handle, user!.id],
  );

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ExerciseType>('all');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = normalize(query);
    return (catalog.data ?? []).filter((exercise) => {
      if (typeFilter !== 'all' && exercise.type !== typeFilter) return false;
      if (!q) return true;
      return normalize(exercise.name).includes(q) || normalize(muscleLabel(exercise.muscleGroup as Muscle, locale)).includes(q);
    });
  }, [catalog.data, query, typeFilter, locale]);

  const own = filtered.filter((exercise) => exercise.userId !== null);
  const global = filtered.filter((exercise) => exercise.userId === null);

  const startEdit = (exercise: Exercise) => {
    setEditingId(exercise.id);
    setForm({
      name: exercise.name,
      type: exercise.type,
      muscleGroup: exercise.muscleGroup as Muscle,
      notes: exercise.notes ?? '',
    });
    setError(null);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const input = {
        name: form.name,
        type: form.type,
        muscleGroup: form.type === 'cardio' ? ('cardio' as Muscle) : form.muscleGroup,
        notes: form.notes || null,
      };

      if (editingId !== null) {
        await updateExercise(handle, user!.id, editingId, input);
        setMessage(t('catalog.updated'));
      } else {
        await createExercise(handle, user!.id, input);
        setMessage(t('catalog.created'));
      }
      resetForm();
      catalog.reload();
    } catch (cause) {
      setError(tError(cause));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (exercise: Exercise) => {
    if (!window.confirm(t('catalog.deleteConfirm', { name: exercise.name }))) return;
    setError(null);
    setMessage(null);
    try {
      const result = await deleteExercise(handle, user!.id, exercise.id);
      setMessage(result === 'hidden' ? t('catalog.hidden') : t('catalog.deleted'));
      if (editingId === exercise.id) resetForm();
      catalog.reload();
    } catch (cause) {
      setError(tError(cause));
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">{t('catalog.eyebrow')}</div>
          <h1>{t('catalog.title')}</h1>
          <p>{t('catalog.intro')}</p>
        </div>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="card card-pad">
          <div className="row-between" style={{ marginBottom: 14 }}>
            <h2>{editingId ? t('catalog.editTitle') : t('catalog.newTitle')}</h2>
            {editingId ? (
              <button className="btn btn-sm btn-ghost" onClick={resetForm}>
                {t('common.cancel')}
              </button>
            ) : null}
          </div>

          <form className="stack" onSubmit={submit}>
            <div className="field">
              <label htmlFor="exercise-name">{t('catalog.name')}</label>
              <input
                id="exercise-name"
                className="input"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
                minLength={2}
              />
            </div>

            <div className="row" style={{ gap: 10 }}>
              <div className="field" style={{ flex: 1 }}>
                <label htmlFor="exercise-type">{t('catalog.type')}</label>
                <select
                  id="exercise-type"
                  className="select"
                  value={form.type}
                  onChange={(event) => setForm({ ...form, type: event.target.value as ExerciseType })}
                >
                  <option value="weights">{t('type.weights')}</option>
                  <option value="cardio">{t('type.cardio')}</option>
                </select>
              </div>

              {form.type === 'weights' ? (
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor="exercise-muscle">{t('catalog.mainMuscle')}</label>
                  <select
                    id="exercise-muscle"
                    className="select"
                    value={form.muscleGroup}
                    onChange={(event) => setForm({ ...form, muscleGroup: event.target.value as Muscle })}
                  >
                    {MUSCLES.map((muscle) => (
                      <option key={muscle} value={muscle}>
                        {MUSCLE_LABELS[locale][muscle]}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            <div className="field">
              <label htmlFor="exercise-notes">{t('catalog.notes')}</label>
              <textarea
                id="exercise-notes"
                className="textarea"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </div>

            {error ? <div className="alert">{error}</div> : null}
            {message ? <div className="alert alert-success">{message}</div> : null}

            <button className="btn btn-primary" type="submit" disabled={busy}>
              <IconPlus /> {editingId ? t('catalog.saveChanges') : t('catalog.create')}
            </button>
          </form>
        </div>

        <div className="card card-pad">
          <div className="stack" style={{ gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 11, top: 9, color: 'var(--text-dim)' }}>
                <IconSearch />
              </span>
              <input
                className="input"
                style={{ paddingLeft: 36 }}
                placeholder={t('catalog.searchPlaceholder')}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className="row" style={{ gap: 6 }}>
              {(
                [
                  ['all', t('common.all')],
                  ['weights', t('type.weights')],
                  ['cardio', t('type.cardio')],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  className={`chip ${typeFilter === value ? 'active' : ''}`}
                  onClick={() => setTypeFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            {catalog.loading && !catalog.data ? (
              <p className="muted small">{t('common.loading')}</p>
            ) : (
              <>
                <div>
                  <div className="eyebrow" style={{ marginBottom: 6 }}>
                    {t('catalog.ownTitle')} · {own.length}
                  </div>
                  {own.length === 0 ? (
                    <p className="dim small">{t('catalog.ownEmpty')}</p>
                  ) : (
                    <div className="stack" style={{ gap: 2 }}>
                      {own.map((exercise) => (
                        <div key={exercise.id} className="picker-row" style={{ cursor: 'default' }}>
                          <span>
                            <strong style={{ fontWeight: 550 }}>{exercise.name}</strong>
                            <span className="dim small" style={{ marginLeft: 8 }}>
                              {exercise.type === 'cardio' ? t('type.cardio') : muscleLabel(exercise.muscleGroup as Muscle, locale)}
                            </span>
                          </span>
                          <span className="row" style={{ gap: 2 }}>
                            <button
                              className="btn btn-ghost btn-icon"
                              onClick={() => startEdit(exercise)}
                              aria-label={t('catalog.editAria', { name: exercise.name })}
                            >
                              <IconEdit width={15} height={15} />
                            </button>
                            <button
                              className="btn btn-ghost btn-icon"
                              onClick={() => remove(exercise)}
                              aria-label={t('catalog.deleteAria', { name: exercise.name })}
                            >
                              <IconTrash width={15} height={15} />
                            </button>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <hr className="divider" />

                <div>
                  <div className="eyebrow" style={{ marginBottom: 6 }}>
                    {t('catalog.globalTitle')} · {global.length}
                  </div>
                  <div style={{ maxHeight: 340, overflow: 'auto' }}>
                    {global.map((exercise) => (
                      <div key={exercise.id} className="picker-row" style={{ cursor: 'default' }}>
                        <span>{exercise.name}</span>
                        <span className="badge">
                          {exercise.type === 'cardio' ? t('type.cardio') : muscleLabel(exercise.muscleGroup as Muscle, locale)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
