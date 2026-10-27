import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { Exercise } from '../../db/schema';
import type { SetEntry } from '../../shared/types';
import type { LibraryExercise } from '../../library/types';
import { getLibraryExercise } from '../../library';
import { getSessionByDate, saveSession } from '../../db/repositories/sessions';
import { listVisibleExercises } from '../../db/repositories/exercises';
import { useAuth } from '../hooks/useAuth';
import { useDbHandle } from '../hooks/useDb';
import { useAsync } from '../hooks/useAsync';
import { ExercisePicker } from '../components/ExercisePicker';
import { LibraryDrawer } from '../components/LibraryDrawer';
import { SeriesEditor } from '../components/SeriesEditor';
import { IconInfo, IconPlus, IconTrash } from '../components/Icons';
import {
  formatDateLong,
  isValidISODate,
  parseNullableNumber,
  todayISO,
} from '../lib/format';

interface Draft {
  key: string;
  exerciseId: number;
  name: string;
  type: 'cardio' | 'weights';
  libraryId: string | null;
  duration: string;
  distance: string;
  sets: SetEntry[];
}

function newKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function draftFromExercise(exercise: Exercise): Draft {
  return {
    key: newKey(),
    exerciseId: exercise.id,
    name: exercise.name,
    type: exercise.type,
    libraryId: exercise.libraryId,
    duration: '',
    distance: '',
    sets: exercise.type === 'weights' ? [{ weightKg: null, reps: null }] : [],
  };
}

export function SessionPage() {
  const { user } = useAuth();
  const handle = useDbHandle();
  const params = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const date = isValidISODate(params.date) ? params.date : todayISO();

  const catalog = useAsync(
    () => listVisibleExercises(handle, user!.id),
    [handle, user!.id],
  );

  const session = useAsync(
    () => getSessionByDate(handle, user!.id, date),
    [handle, user!.id, date],
  );

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [notes, setNotes] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [drawer, setDrawer] = useState<LibraryExercise | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const loadedSignature = useRef<string | null>(null);

  useEffect(() => {
    if (session.loading) return;
    const signature = `${date}:${session.data?.id ?? 'nueva'}`;
    if (loadedSignature.current === signature) return;
    loadedSignature.current = signature;

    const logs = session.data?.logs ?? [];
    setDrafts(
      logs.map((log) => ({
        key: `log-${log.id}`,
        exerciseId: log.exerciseId,
        name: log.exerciseName,
        type: log.exerciseType,
        libraryId: log.libraryId,
        duration: log.durationMin === null ? '' : String(log.durationMin),
        distance: log.distanceKm === null ? '' : String(log.distanceKm),
        sets: log.sets.map((set) => ({ weightKg: set.weightKg, reps: set.reps })),
      })),
    );
    setNotes(session.data?.notes ?? '');
    setError(null);
  }, [date, session.data, session.loading]);

  // "Añadir a la sesión de hoy" desde la biblioteca (?add=<libraryId>).
  useEffect(() => {
    const libraryId = searchParams.get('add');
    if (!libraryId || !catalog.data) return;

    const exercise = catalog.data.find((item) => item.libraryId === libraryId);
    if (exercise) {
      setDrafts((previous) =>
        previous.some((draft) => draft.exerciseId === exercise.id)
          ? previous
          : [...previous, draftFromExercise(exercise)],
      );
    }
    setSearchParams({}, { replace: true });
  }, [searchParams, catalog.data, setSearchParams]);

  const addExercise = (exercise: Exercise) => {
    setDrafts((previous) => [...previous, draftFromExercise(exercise)]);
    setPickerOpen(false);
    setSuccess(null);
  };

  const updateDraft = (key: string, patch: Partial<Draft>) => {
    setDrafts((previous) =>
      previous.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)),
    );
    setSuccess(null);
  };

  const removeDraft = (key: string) => {
    setDrafts((previous) => previous.filter((draft) => draft.key !== key));
    setSuccess(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await saveSession(handle, user!.id, {
        date,
        notes: notes.trim() || null,
        logs: drafts.map((draft) => ({
          exerciseId: draft.exerciseId,
          durationMin: draft.type === 'cardio' ? parseNullableNumber(draft.duration) : null,
          distanceKm: draft.type === 'cardio' ? parseNullableNumber(draft.distance) : null,
          sets: draft.type === 'weights' ? draft.sets : [],
        })),
      });
      setSuccess('Sesión guardada.');
      loadedSignature.current = null;
      session.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  const isToday = date === todayISO();

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Registro</div>
          <h1>{isToday ? 'Sesión de hoy' : 'Editar sesión'}</h1>
          <p>{formatDateLong(date)}</p>
        </div>
        <div className="date-hero">
          <input
            type="date"
            className="input"
            style={{ width: 'auto' }}
            value={date}
            onChange={(event) => navigate(`/session/${event.target.value}`)}
          />
          {!isToday ? (
            <Link className="btn btn-sm" to="/session">
              Ir a hoy
            </Link>
          ) : null}
        </div>
      </div>

      {session.error ? <div className="alert" style={{ marginBottom: 16 }}>{session.error}</div> : null}

      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <div className="field">
          <label htmlFor="notes">Notas de la sesión (opcional)</label>
          <textarea
            id="notes"
            className="textarea"
            placeholder="Sensaciones, energía, molestias…"
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value);
              setSuccess(null);
            }}
          />
        </div>
      </div>

      <div className="stack" style={{ gap: 14 }}>
        {drafts.length === 0 ? (
          <div className="empty">
            <p style={{ fontWeight: 600, color: 'var(--text)' }}>Todavía no hay ejercicios</p>
            <p className="small" style={{ marginTop: 4 }}>
              Añade cardio (minutos) y pesas (peso × reps por serie).
            </p>
          </div>
        ) : null}

        {drafts.map((draft) => (
          <div className="log-card" key={draft.key}>
            <div className="log-head">
              <div>
                <div className="log-title">{draft.name}</div>
                <div className="small dim">{draft.type === 'cardio' ? 'Cardio' : 'Pesas'}</div>
              </div>
              <div className="row" style={{ marginLeft: 'auto', gap: 4 }}>
                {draft.libraryId ? (
                  <button
                    className="btn btn-ghost btn-icon"
                    onClick={() => {
                      const library = getLibraryExercise(draft.libraryId!);
                      if (library) setDrawer(library);
                    }}
                    aria-label="Ver técnica en la biblioteca"
                    title="Ver técnica"
                  >
                    <IconInfo />
                  </button>
                ) : null}
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={() => removeDraft(draft.key)}
                  aria-label="Quitar ejercicio"
                >
                  <IconTrash />
                </button>
              </div>
            </div>

            <div className="log-body">
              {draft.type === 'cardio' ? (
                <div className="row" style={{ gap: 14 }}>
                  <div className="field" style={{ width: 130 }}>
                    <label>Minutos</label>
                    <input
                      className="input mono"
                      inputMode="decimal"
                      placeholder="30"
                      value={draft.duration}
                      onChange={(event) => updateDraft(draft.key, { duration: event.target.value })}
                    />
                  </div>
                  <div className="field" style={{ width: 130 }}>
                    <label>Distancia (km)</label>
                    <input
                      className="input mono"
                      inputMode="decimal"
                      placeholder="opcional"
                      value={draft.distance}
                      onChange={(event) => updateDraft(draft.key, { distance: event.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <SeriesEditor
                  key={draft.key}
                  sets={draft.sets}
                  onChange={(sets) => updateDraft(draft.key, { sets })}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="row" style={{ marginTop: 18, gap: 10, flexWrap: 'wrap' }}>
        <button className="btn" onClick={() => setPickerOpen(true)}>
          <IconPlus /> Añadir ejercicio
        </button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar sesión'}
        </button>
        {success ? <span className="badge badge-accent">{success}</span> : null}
      </div>

      {error ? <div className="alert" style={{ marginTop: 14 }}>{error}</div> : null}

      {pickerOpen && catalog.data ? (
        <ExercisePicker
          exercises={catalog.data}
          onPick={addExercise}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}

      {drawer ? <LibraryDrawer exercise={drawer} onClose={() => setDrawer(null)} /> : null}
    </>
  );
}
