import { useEffect, useMemo, useState } from 'react';
import type { Exercise } from '../../db/schema';
import { MUSCLES, MUSCLE_LABELS } from '../../library/types';
import { normalize } from '../../library';
import { IconSearch, IconX } from './Icons';

interface Props {
  exercises: Exercise[];
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
  title?: string;
}

export function ExercisePicker({ exercises, onPick, onClose, title = 'Añadir ejercicio' }: Props) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'all' | 'weights' | 'cardio'>('all');
  const [muscle, setMuscle] = useState('');

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const results = useMemo(() => {
    const q = normalize(query);
    return exercises.filter((exercise) => {
      if (type !== 'all' && exercise.type !== type) return false;
      if (muscle && exercise.muscleGroup !== muscle) return false;
      if (!q) return true;
      return normalize(exercise.name).includes(q);
    });
  }, [exercises, query, type, muscle]);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Cerrar">
            <IconX />
          </button>
        </div>

        <div className="modal-body">
          <div className="stack" style={{ gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 11, top: 9, color: 'var(--text-dim)' }}>
                <IconSearch />
              </span>
              <input
                className="input"
                style={{ paddingLeft: 36 }}
                placeholder="Buscar ejercicio…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoFocus
              />
            </div>

            <div className="row" style={{ gap: 6 }}>
              {(
                [
                  ['all', 'Todos'],
                  ['weights', 'Pesas'],
                  ['cardio', 'Cardio'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  className={`chip ${type === value ? 'active' : ''}`}
                  onClick={() => setType(value)}
                >
                  {label}
                </button>
              ))}
              <select
                className="select"
                style={{ width: 'auto', marginLeft: 'auto' }}
                value={muscle}
                onChange={(event) => setMuscle(event.target.value)}
              >
                <option value="">Todo el cuerpo</option>
                {MUSCLES.map((item) => (
                  <option key={item} value={item}>
                    {MUSCLE_LABELS[item]}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ maxHeight: '46vh', overflow: 'auto', marginTop: 4 }}>
              {results.length === 0 ? (
                <p className="muted small" style={{ padding: 18, textAlign: 'center' }}>
                  Sin resultados. Puedes crear ejercicios propios en Catálogo.
                </p>
              ) : (
                results.map((exercise) => (
                  <button
                    key={exercise.id}
                    className="picker-row"
                    onClick={() => onPick(exercise)}
                  >
                    <span>
                      <strong style={{ fontWeight: 550 }}>{exercise.name}</strong>
                      <span className="dim small" style={{ marginLeft: 8 }}>
                        {exercise.userId !== null ? 'propio' : 'global'}
                      </span>
                    </span>
                    <span className="badge">{exercise.type === 'cardio' ? 'Cardio' : 'Pesas'}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
