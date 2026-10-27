import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Equipment, LibraryExercise, MovementPattern, Muscle } from '../../library/types';
import {
  EQUIPMENT_LABELS,
  MUSCLES,
  MUSCLE_LABELS,
  PATTERN_LABELS,
  muscleLabel,
  searchLibrary,
} from '../../library';
import { ExerciseFigure } from '../components/ExerciseFigure';
import { LibraryDrawer } from '../components/LibraryDrawer';
import { IconSearch } from '../components/Icons';

export function LibraryPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [pattern, setPattern] = useState<MovementPattern | ''>('');
  const [equipment, setEquipment] = useState<Equipment | ''>('');
  const [muscle, setMuscle] = useState<Muscle | ''>('');
  const [selected, setSelected] = useState<LibraryExercise | null>(null);

  const results = useMemo(
    () =>
      searchLibrary({
        query,
        filters: {
          pattern: pattern || undefined,
          equipment: equipment || undefined,
          muscle: muscle || undefined,
        },
      }),
    [query, pattern, equipment, muscle],
  );

  const addToSession = (exercise: LibraryExercise) => {
    navigate(`/session?add=${encodeURIComponent(exercise.id)}`);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Biblioteca · {results.length} ejercicios</div>
          <h1>Técnica y músculos</h1>
          <p>Consulta cómo se ejecuta cada ejercicio y qué musculatura trabaja.</p>
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <div className="stack" style={{ gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 11, top: 9, color: 'var(--text-dim)' }}>
              <IconSearch />
            </span>
            <input
              className="input"
              style={{ paddingLeft: 36 }}
              placeholder="Buscar por nombre, alias o músculo (p. ej. “banca”, “glúteo”)…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="row" style={{ gap: 8 }}>
            <select
              className="select"
              style={{ width: 'auto' }}
              value={pattern}
              onChange={(event) => setPattern(event.target.value as MovementPattern | '')}
            >
              <option value="">Todo patrón</option>
              {Object.entries(PATTERN_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              className="select"
              style={{ width: 'auto' }}
              value={equipment}
              onChange={(event) => setEquipment(event.target.value as Equipment | '')}
            >
              <option value="">Todo material</option>
              {Object.entries(EQUIPMENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              className="select"
              style={{ width: 'auto' }}
              value={muscle}
              onChange={(event) => setMuscle(event.target.value as Muscle | '')}
            >
              <option value="">Todo músculo</option>
              {MUSCLES.map((value) => (
                <option key={value} value={value}>
                  {MUSCLE_LABELS[value]}
                </option>
              ))}
            </select>

            {(query || pattern || equipment || muscle) ? (
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  setQuery('');
                  setPattern('');
                  setEquipment('');
                  setMuscle('');
                }}
              >
                Limpiar
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="empty">
          <p style={{ fontWeight: 600, color: 'var(--text)' }}>Sin resultados</p>
          <p className="small" style={{ marginTop: 4 }}>
            Prueba con otro nombre, músculo o material.
          </p>
        </div>
      ) : (
        <div className="library-grid">
          {results.map((exercise) => (
            <button className="library-card" key={exercise.id} onClick={() => setSelected(exercise)}>
              <div className="library-figure">
                <ExerciseFigure figure={exercise.media.figure} animated={false} />
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{exercise.name}</div>
                <div className="small dim" style={{ marginTop: 2 }}>
                  {PATTERN_LABELS[exercise.pattern]} · {EQUIPMENT_LABELS[exercise.equipment]}
                </div>
              </div>
              <div className="row" style={{ gap: 4 }}>
                {exercise.primaryMuscles.slice(0, 2).map((item) => (
                  <span key={item} className="badge badge-accent">
                    {muscleLabel(item)}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      {selected ? (
        <LibraryDrawer
          exercise={selected}
          onClose={() => setSelected(null)}
          onAdd={addToSession}
        />
      ) : null}
    </>
  );
}
