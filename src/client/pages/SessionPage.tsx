import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { Exercise } from '../../db/schema';
import type { SetEntry, TemplateInput, TemplateItemPrefill } from '../../shared/types';
import type { LibraryExercise } from '../../library/types';
import { getLibraryExercise } from '../../library';
import { getSessionByDate, saveSession } from '../../db/repositories/sessions';
import { listVisibleExercises } from '../../db/repositories/exercises';
import { applyTemplate, createTemplate, listTemplates } from '../../db/repositories/templates';
import { useAuth } from '../hooks/useAuth';
import { useDbHandle } from '../hooks/useDb';
import { useAsync } from '../hooks/useAsync';
import { useI18n } from '../i18n';
import { ExercisePicker } from '../components/ExercisePicker';
import { TemplatePicker } from '../components/TemplatePicker';
import { LibraryDrawer } from '../components/LibraryDrawer';
import { SeriesEditor } from '../components/SeriesEditor';
import { IconInfo, IconPlus, IconTemplate, IconTrash, IconX } from '../components/Icons';
import { isValidISODate, parseNullableNumber, todayISO } from '../lib/format';

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
  const { t, tError, dateLong, locale } = useI18n();
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

  const templates = useAsync(() => listTemplates(handle, user!.id), [handle, user!.id]);

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [notes, setNotes] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
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

  /** Fusiona los ejercicios de una plantilla con lo ya cargado (sin duplicar). */
  const mergeTemplate = (items: TemplateItemPrefill[]) => {
    setDrafts((previous) => {
      const existing = new Set(previous.map((draft) => draft.exerciseId));
      const added = items
        .filter((item) => !existing.has(item.exerciseId))
        .map<Draft>((item) => ({
          key: newKey(),
          exerciseId: item.exerciseId,
          name: item.name,
          type: item.type,
          libraryId: item.libraryId,
          duration: item.durationMin === null ? '' : String(item.durationMin),
          distance: item.distanceKm === null ? '' : String(item.distanceKm),
          sets: item.sets,
        }));
      return added.length === 0 ? previous : [...previous, ...added];
    });
  };

  const loadTemplate = async (templateId: number) => {
    setError(null);
    setSuccess(null);
    try {
      const application = await applyTemplate(handle, user!.id, templateId);
      mergeTemplate(application.items);
      setTemplatePickerOpen(false);
      setSuccess(t('session.templateLoaded', { name: application.name }));
      if (application.skipped.length > 0) {
        setError(t('session.templateSkipped', { names: application.skipped.join(', ') }));
      }
    } catch (cause) {
      setError(tError(cause));
    }
  };

  // "Aplicar a hoy" desde la pantalla de plantillas (?template=<id>).
  useEffect(() => {
    const raw = searchParams.get('template');
    if (!raw || session.loading) return;
    setSearchParams({}, { replace: true });
    const templateId = Number(raw);
    if (Number.isInteger(templateId) && templateId > 0) void loadTemplate(templateId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, session.loading]);

  const saveAsTemplate = async () => {
    const name = templateName.trim();
    if (!name) return;
    setSavingTemplate(true);
    setTemplateError(null);

    const seen = new Set<number>();
    const items: TemplateInput['items'] = [];
    for (const draft of drafts) {
      if (seen.has(draft.exerciseId)) continue;
      seen.add(draft.exerciseId);
      const first = draft.sets[0];
      items.push({
        exerciseId: draft.exerciseId,
        seriesCount: draft.type === 'weights' ? Math.max(draft.sets.length, 1) : null,
        defaultWeightKg: draft.type === 'weights' ? (first?.weightKg ?? null) : null,
        defaultReps: draft.type === 'weights' ? (first?.reps ?? null) : null,
        durationMin: draft.type === 'cardio' ? parseNullableNumber(draft.duration) : null,
        distanceKm: draft.type === 'cardio' ? parseNullableNumber(draft.distance) : null,
      });
    }

    try {
      await createTemplate(handle, user!.id, { name, notes: notes.trim() || null, items });
      setSaveTemplateOpen(false);
      setTemplateName('');
      setSuccess(t('session.templateSaved'));
      templates.reload();
    } catch (cause) {
      setTemplateError(tError(cause));
    } finally {
      setSavingTemplate(false);
    }
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
      setSuccess(t('session.saved'));
      loadedSignature.current = null;
      session.reload();
    } catch (cause) {
      setError(tError(cause));
    } finally {
      setSaving(false);
    }
  };

  const isToday = date === todayISO();

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">{t('session.eyebrow')}</div>
          <h1>{isToday ? t('session.today') : t('session.edit')}</h1>
          <p>{dateLong(date)}</p>
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
              {t('session.goToday')}
            </Link>
          ) : null}
        </div>
      </div>

      {session.error ? <div className="alert" style={{ marginBottom: 16 }}>{tError(session.error)}</div> : null}

      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <div className="field">
          <label htmlFor="notes">{t('session.notes')}</label>
          <textarea
            id="notes"
            className="textarea"
            placeholder={t('session.notesPlaceholder')}
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
            <p style={{ fontWeight: 600, color: 'var(--text)' }}>{t('session.emptyTitle')}</p>
            <p className="small" style={{ marginTop: 4 }}>
              {t('session.emptyBody')}
            </p>
          </div>
        ) : null}

        {drafts.map((draft) => (
          <div className="log-card" key={draft.key}>
            <div className="log-head">
              <div>
                <div className="log-title">{draft.name}</div>
                <div className="small dim">{draft.type === 'cardio' ? t('type.cardio') : t('type.weights')}</div>
              </div>
              <div className="row" style={{ marginLeft: 'auto', gap: 4 }}>
                {draft.libraryId ? (
                  <button
                    className="btn btn-ghost btn-icon"
                    onClick={() => {
                      const library = getLibraryExercise(draft.libraryId!, locale);
                      if (library) setDrawer(library);
                    }}
                    aria-label={t('session.viewTechniqueAria')}
                    title={t('session.viewTechnique')}
                  >
                    <IconInfo />
                  </button>
                ) : null}
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={() => removeDraft(draft.key)}
                  aria-label={t('session.removeExerciseAria')}
                >
                  <IconTrash />
                </button>
              </div>
            </div>

            <div className="log-body">
              {draft.type === 'cardio' ? (
                <div className="row" style={{ gap: 14 }}>
                  <div className="field" style={{ width: 130 }}>
                    <label>{t('session.minutes')}</label>
                    <input
                      className="input mono"
                      inputMode="decimal"
                      placeholder="30"
                      value={draft.duration}
                      onChange={(event) => updateDraft(draft.key, { duration: event.target.value })}
                    />
                  </div>
                  <div className="field" style={{ width: 130 }}>
                    <label>{t('session.distance')}</label>
                    <input
                      className="input mono"
                      inputMode="decimal"
                      placeholder={t('common.optional')}
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
          <IconPlus /> {t('session.addExercise')}
        </button>
        <button className="btn" onClick={() => setTemplatePickerOpen(true)} disabled={templates.loading}>
          <IconTemplate /> {t('session.loadTemplate')}
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => {
            setTemplateError(null);
            setSaveTemplateOpen(true);
          }}
          disabled={drafts.length === 0}
          title={drafts.length === 0 ? t('session.addFirst') : undefined}
        >
          {t('session.saveAsTemplate')}
        </button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? t('common.saving') : t('session.save')}
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

      {templatePickerOpen ? (
        <TemplatePicker
          templates={templates.data ?? []}
          onPick={(templateId) => void loadTemplate(templateId)}
          onClose={() => setTemplatePickerOpen(false)}
        />
      ) : null}

      {saveTemplateOpen ? (
        <div className="overlay" onClick={() => setSaveTemplateOpen(false)}>
          <div
            className="modal"
            style={{ width: 'min(460px, 92vw)' }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-head">
              <h2>{t('session.saveAsTemplate')}</h2>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setSaveTemplateOpen(false)}
                aria-label={t('common.close')}
              >
                <IconX />
              </button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label htmlFor="template-name-session">{t('session.templateName')}</label>
                <input
                  id="template-name-session"
                  className="input"
                  placeholder={t('session.templateNamePlaceholder')}
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void saveAsTemplate();
                  }}
                  autoFocus
                />
              </div>
              <p className="dim small" style={{ marginTop: 8 }}>
                {t('session.saveTemplateHelp')}
              </p>
              {templateError ? (
                <div className="alert" style={{ marginTop: 12 }}>
                  {templateError}
                </div>
              ) : null}
              <div className="row" style={{ marginTop: 16, gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setSaveTemplateOpen(false)}>
                  {t('common.cancel')}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => void saveAsTemplate()}
                  disabled={savingTemplate || templateName.trim().length < 2}
                >
                  {savingTemplate ? t('common.saving') : t('session.saveTemplate')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {drawer ? <LibraryDrawer exercise={drawer} onClose={() => setDrawer(null)} /> : null}
    </>
  );
}
