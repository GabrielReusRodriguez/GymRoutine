import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Exercise } from '../../db/schema';
import type { TemplateDetail, TemplateInput, TemplateSummary } from '../../shared/types';
import {
  createTemplate,
  deleteTemplate,
  duplicateTemplate,
  getTemplate,
  listTemplates,
  updateTemplate,
} from '../../db/repositories/templates';
import { listVisibleExercises } from '../../db/repositories/exercises';
import { useAuth } from '../hooks/useAuth';
import { useDbHandle } from '../hooks/useDb';
import { useAsync } from '../hooks/useAsync';
import { ExercisePicker } from '../components/ExercisePicker';
import { IconEdit, IconPlus, IconTrash } from '../components/Icons';
import { parseNullableNumber, plural } from '../lib/format';

interface ItemDraft {
  key: string;
  exerciseId: number;
  name: string;
  type: 'cardio' | 'weights';
  series: string;
  weight: string;
  reps: string;
  duration: string;
  distance: string;
}

interface EditorState {
  id: number | null;
  name: string;
  notes: string;
  items: ItemDraft[];
}

const DEFAULT_SERIES = '3';

function newKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function itemFromExercise(exercise: Exercise): ItemDraft {
  return {
    key: newKey(),
    exerciseId: exercise.id,
    name: exercise.name,
    type: exercise.type,
    series: exercise.type === 'weights' ? DEFAULT_SERIES : '',
    weight: '',
    reps: '',
    duration: '',
    distance: '',
  };
}

function itemFromDetail(detail: TemplateDetail['items'][number]): ItemDraft {
  return {
    key: newKey(),
    exerciseId: detail.exerciseId,
    name: detail.exerciseName,
    type: detail.exerciseType,
    series: detail.seriesCount === null ? '' : String(detail.seriesCount),
    weight: detail.defaultWeightKg === null ? '' : String(detail.defaultWeightKg),
    reps: detail.defaultReps === null ? '' : String(detail.defaultReps),
    duration: detail.durationMin === null ? '' : String(detail.durationMin),
    distance: detail.distanceKm === null ? '' : String(detail.distanceKm),
  };
}

export function TemplatesPage() {
  const { user } = useAuth();
  const handle = useDbHandle();
  const navigate = useNavigate();

  const templates = useAsync(() => listTemplates(handle, user!.id), [handle, user!.id]);
  const catalog = useAsync(() => listVisibleExercises(handle, user!.id), [handle, user!.id]);

  const [editor, setEditor] = useState<EditorState | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const startNew = () => {
    setEditor({ id: null, name: '', notes: '', items: [] });
    setError(null);
    setMessage(null);
  };

  const startEdit = async (templateId: number) => {
    setError(null);
    setMessage(null);
    try {
      const detail = await getTemplate(handle, user!.id, templateId);
      setEditor({
        id: detail.id,
        name: detail.name,
        notes: detail.notes ?? '',
        items: detail.items.map(itemFromDetail),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const updateItem = (key: string, patch: Partial<ItemDraft>) => {
    setEditor((previous) =>
      previous
        ? {
            ...previous,
            items: previous.items.map((item) => (item.key === key ? { ...item, ...patch } : item)),
          }
        : previous,
    );
  };

  const addExercise = (exercise: Exercise) => {
    setEditor((previous) => {
      if (!previous) return previous;
      if (previous.items.some((item) => item.exerciseId === exercise.id)) return previous;
      return { ...previous, items: [...previous.items, itemFromExercise(exercise)] };
    });
    setPickerOpen(false);
  };

  const removeItem = (key: string) => {
    setEditor((previous) =>
      previous ? { ...previous, items: previous.items.filter((item) => item.key !== key) } : previous,
    );
  };

  const moveItem = (key: string, delta: number) => {
    setEditor((previous) => {
      if (!previous) return previous;
      const index = previous.items.findIndex((item) => item.key === key);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= previous.items.length) return previous;
      const items = [...previous.items];
      const [moved] = items.splice(index, 1);
      if (!moved) return previous;
      items.splice(target, 0, moved);
      return { ...previous, items };
    });
  };

  const save = async () => {
    if (!editor) return;
    setSaving(true);
    setError(null);
    setMessage(null);

    const input: TemplateInput = {
      name: editor.name,
      notes: editor.notes.trim() || null,
      items: editor.items.map((item) => ({
        exerciseId: item.exerciseId,
        seriesCount: item.type === 'weights' ? parseNullableNumber(item.series) : null,
        defaultWeightKg: item.type === 'weights' ? parseNullableNumber(item.weight) : null,
        defaultReps: item.type === 'weights' ? parseNullableNumber(item.reps) : null,
        durationMin: item.type === 'cardio' ? parseNullableNumber(item.duration) : null,
        distanceKm: item.type === 'cardio' ? parseNullableNumber(item.distance) : null,
      })),
    };

    try {
      if (editor.id === null) {
        await createTemplate(handle, user!.id, input);
      } else {
        await updateTemplate(handle, user!.id, editor.id, input);
      }
      setEditor(null);
      setMessage('Plantilla guardada.');
      templates.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (template: TemplateSummary) => {
    if (!window.confirm(`¿Borrar la plantilla "${template.name}"?`)) return;
    setError(null);
    setMessage(null);
    try {
      await deleteTemplate(handle, user!.id, template.id);
      setMessage('Plantilla borrada.');
      templates.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const duplicate = async (template: TemplateSummary) => {
    setError(null);
    setMessage(null);
    try {
      await duplicateTemplate(handle, user!.id, template.id);
      setMessage(`Copia creada a partir de "${template.name}".`);
      templates.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const data = templates.data ?? [];

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Entrenamiento</div>
          <h1>Plantillas</h1>
          <p>
            Listas reutilizables de ejercicios. Al aplicarlas se cargan en la sesión con el peso y las
            repeticiones de tu último registro: solo tienes que ajustar los números.
          </p>
        </div>
        {editor ? null : (
          <button className="btn btn-primary" onClick={startNew}>
            <IconPlus /> Nueva plantilla
          </button>
        )}
      </div>

      {message ? <div className="badge badge-accent" style={{ marginBottom: 14 }}>{message}</div> : null}
      {error ? <div className="alert" style={{ marginBottom: 14 }}>{error}</div> : null}

      {editor ? (
        <div className="stack" style={{ gap: 14 }}>
          <div className="card card-pad">
            <div className="row" style={{ gap: 14, flexWrap: 'wrap' }}>
              <div className="field" style={{ flex: '1 1 240px' }}>
                <label htmlFor="template-name">Nombre</label>
                <input
                  id="template-name"
                  className="input"
                  placeholder="Día de empuje, Pierna, Full body…"
                  value={editor.name}
                  onChange={(event) => setEditor({ ...editor, name: event.target.value })}
                  autoFocus
                />
              </div>
              <div className="field" style={{ flex: '2 1 320px' }}>
                <label htmlFor="template-notes">Notas (opcional)</label>
                <input
                  id="template-notes"
                  className="input"
                  placeholder="Objetivo del día, progresión…"
                  value={editor.notes}
                  onChange={(event) => setEditor({ ...editor, notes: event.target.value })}
                />
              </div>
            </div>
          </div>

          {editor.items.length === 0 ? (
            <div className="empty">
              <p style={{ fontWeight: 600, color: 'var(--text)' }}>La plantilla está vacía</p>
              <p className="small" style={{ marginTop: 4 }}>
                Añade los ejercicios en el orden en que los haces.
              </p>
            </div>
          ) : null}

          {editor.items.map((item, index) => (
            <div className="log-card" key={item.key}>
              <div className="log-head">
                <div>
                  <div className="log-title">{item.name}</div>
                  <div className="small dim">
                    {item.type === 'cardio' ? 'Cardio' : 'Pesas'}
                    {index === 0 ? ' · primero' : ''}
                  </div>
                </div>
                <div className="row" style={{ marginLeft: 'auto', gap: 4 }}>
                  <button
                    className="btn btn-ghost btn-icon"
                    onClick={() => moveItem(item.key, -1)}
                    disabled={index === 0}
                    aria-label="Subir"
                    title="Subir"
                  >
                    <span aria-hidden>↑</span>
                  </button>
                  <button
                    className="btn btn-ghost btn-icon"
                    onClick={() => moveItem(item.key, 1)}
                    disabled={index === editor.items.length - 1}
                    aria-label="Bajar"
                    title="Bajar"
                  >
                    <span aria-hidden>↓</span>
                  </button>
                  <button
                    className="btn btn-ghost btn-icon"
                    onClick={() => removeItem(item.key)}
                    aria-label="Quitar ejercicio"
                    title="Quitar"
                  >
                    <IconTrash />
                  </button>
                </div>
              </div>

              <div className="log-body">
                {item.type === 'cardio' ? (
                  <div className="row" style={{ gap: 14 }}>
                    <div className="field" style={{ width: 130 }}>
                      <label>Minutos (opcional)</label>
                      <input
                        className="input mono"
                        inputMode="decimal"
                        placeholder="30"
                        value={item.duration}
                        onChange={(event) => updateItem(item.key, { duration: event.target.value })}
                      />
                    </div>
                    <div className="field" style={{ width: 130 }}>
                      <label>Distancia (km)</label>
                      <input
                        className="input mono"
                        inputMode="decimal"
                        placeholder="opcional"
                        value={item.distance}
                        onChange={(event) => updateItem(item.key, { distance: event.target.value })}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="row" style={{ gap: 14 }}>
                    <div className="field" style={{ width: 110 }}>
                      <label>Series</label>
                      <input
                        className="input mono"
                        inputMode="numeric"
                        value={item.series}
                        onChange={(event) => updateItem(item.key, { series: event.target.value })}
                      />
                    </div>
                    <div className="field" style={{ width: 120 }}>
                      <label>Peso por defecto</label>
                      <input
                        className="input mono"
                        inputMode="decimal"
                        placeholder="opcional"
                        value={item.weight}
                        onChange={(event) => updateItem(item.key, { weight: event.target.value })}
                      />
                    </div>
                    <div className="field" style={{ width: 120 }}>
                      <label>Reps por defecto</label>
                      <input
                        className="input mono"
                        inputMode="numeric"
                        placeholder="opcional"
                        value={item.reps}
                        onChange={(event) => updateItem(item.key, { reps: event.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="row" style={{ gap: 10 }}>
            <button className="btn" onClick={() => setPickerOpen(true)}>
              <IconPlus /> Añadir ejercicio
            </button>
            <button
              className="btn btn-primary"
              onClick={save}
              disabled={saving || !editor.name.trim() || editor.items.length === 0}
            >
              {saving ? 'Guardando…' : 'Guardar plantilla'}
            </button>
            <button className="btn btn-ghost" onClick={() => setEditor(null)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="stack" style={{ gap: 12 }}>
          {data.length === 0 && !templates.loading ? (
            <div className="empty">
              <p style={{ fontWeight: 600, color: 'var(--text)' }}>Todavía no hay plantillas</p>
              <p className="small" style={{ marginTop: 4 }}>
                Crea una aquí o guarda la sesión de hoy como plantilla desde la pantalla de registro.
              </p>
            </div>
          ) : null}

          {data.map((template) => (
            <div className="card card-pad" key={template.id}>
              <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div className="log-title">{template.name}</div>
                  <div className="small dim">
                    {plural(template.itemCount, 'ejercicio', 'ejercicios')}
                    {template.notes ? ` · ${template.notes}` : ''}
                  </div>
                </div>
                <div className="row" style={{ marginLeft: 'auto', gap: 6 }}>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => navigate(`/session?template=${template.id}`)}
                  >
                    Aplicar a hoy
                  </button>
                  <button className="btn btn-sm" onClick={() => void startEdit(template.id)}>
                    <IconEdit width={15} height={15} /> Editar
                  </button>
                  <button className="btn btn-sm btn-ghost" onClick={() => void duplicate(template)}>
                    Duplicar
                  </button>
                  <button
                    className="btn btn-sm btn-ghost btn-icon"
                    onClick={() => void remove(template)}
                    aria-label="Borrar plantilla"
                    title="Borrar"
                  >
                    <IconTrash width={15} height={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pickerOpen && catalog.data ? (
        <ExercisePicker
          exercises={catalog.data.filter(
            (exercise) => !editor?.items.some((item) => item.exerciseId === exercise.id),
          )}
          onPick={addExercise}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}
    </>
  );
}
