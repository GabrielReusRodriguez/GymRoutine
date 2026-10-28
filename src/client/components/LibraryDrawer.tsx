import { useEffect } from 'react';
import type { LibraryExercise } from '../../library/types';
import { equipmentLabel, muscleLabel, patternLabel } from '../../library/types';
import { useI18n } from '../i18n';
import { ExerciseFigure } from './ExerciseFigure';
import { MuscleDiagram, MuscleLegend } from './MuscleDiagram';
import { IconPlus, IconX } from './Icons';

interface Props {
  exercise: LibraryExercise;
  onClose: () => void;
  onAdd?: (exercise: LibraryExercise) => void;
}

export function LibraryDrawer({ exercise, onClose, onAdd }: Props) {
  const { t, locale } = useI18n();
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

  return (
    <>
      <div className="overlay" onClick={onClose} aria-hidden />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={exercise.name}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">{t('library.eyebrow')}</div>
            <h2 style={{ marginTop: 3 }}>{exercise.name}</h2>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label={t('common.close')}>
            <IconX />
          </button>
        </div>

        <div className="drawer-body">
          <div className="library-figure" style={{ marginBottom: 14 }}>
            <ExerciseFigure figure={exercise.media.figure} />
          </div>

          <div className="row" style={{ gap: 6 }}>
            <span className="badge badge-accent">{patternLabel(exercise.pattern, locale)}</span>
            <span className="badge">{equipmentLabel(exercise.equipment, locale)}</span>
          </div>

          <div className="detail-section">
            <h3>{t('library.howTo')}</h3>
            <p className="muted small">{exercise.description}</p>
          </div>

          <div className="detail-section">
            <h3>{t('library.muscles')}</h3>
            <div className="row" style={{ gap: 6, marginBottom: 10 }}>
              {exercise.primaryMuscles.map((muscle) => (
                <span key={muscle} className="badge badge-danger">
                  {muscleLabel(muscle, locale)}
                </span>
              ))}
              {exercise.secondaryMuscles.map((muscle) => (
                <span key={muscle} className="badge">
                  {muscleLabel(muscle, locale)}
                </span>
              ))}
            </div>
            <MuscleDiagram
              primary={exercise.primaryMuscles}
              secondary={exercise.secondaryMuscles}
            />
            <div style={{ marginTop: 8 }}>
              <MuscleLegend />
            </div>
          </div>

          {exercise.media.tips && exercise.media.tips.length > 0 ? (
            <div className="detail-section">
              <h3>{t('library.tips')}</h3>
              <ul className="steps">
                {exercise.media.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {onAdd ? (
            <div style={{ paddingTop: 16 }}>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => onAdd(exercise)}>
                <IconPlus /> {t('library.addToSession')}
              </button>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
