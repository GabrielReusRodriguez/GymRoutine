import { describe, expect, it } from 'vitest';
import {
  epley1RM,
  exerciseProgress,
  exerciseTotals,
  weekStart,
  weeklyCardioDistance,
  weeklyCardioMinutes,
  weeklyStrengthVolume,
} from '../src/shared/stats';
import type { SessionDetail } from '../src/shared/types';

function session(date: string, logs: SessionDetail['logs']): SessionDetail {
  return { id: 1, date, notes: null, logs };
}

const benchLog = (date = '2026-01-05'): SessionDetail =>
  session(date, [
    {
      id: 1,
      exerciseId: 10,
      exerciseName: 'Press banca',
      exerciseType: 'weights',
      libraryId: 'barbell-bench-press',
      order: 0,
      durationMin: null,
      distanceKm: null,
      sets: [
        { id: 1, setNumber: 1, weightKg: 80, reps: 5 },
        { id: 2, setNumber: 2, weightKg: 85, reps: 3 },
      ],
    },
  ]);

describe('epley1RM', () => {
  it('estima 1RM y descarta valores no válidos', () => {
    expect(epley1RM(100, 1)).toBeCloseTo(103.33, 2);
    expect(epley1RM(80, 5)).toBeCloseTo(93.33, 2);
    expect(epley1RM(null, 5)).toBeNull();
    expect(epley1RM(80, null)).toBeNull();
    expect(epley1RM(0, 5)).toBeNull();
    expect(epley1RM(80, 0)).toBeNull();
  });
});

describe('semanas', () => {
  it('calcula el lunes de la semana ISO', () => {
    expect(weekStart('2026-01-05')).toBe('2026-01-05'); // lunes
    expect(weekStart('2026-01-11')).toBe('2026-01-05'); // domingo
    expect(weekStart('2026-01-12')).toBe('2026-01-12');
  });
});

describe('agregaciones', () => {
  it('suma volumen semanal de pesas y separa por semana', () => {
    const points = weeklyStrengthVolume([
      benchLog('2026-01-05'),
      benchLog('2026-01-09'),
      benchLog('2026-01-12'),
    ]);

    const volume = 80 * 5 + 85 * 3;
    expect(points).toEqual([
      { week: '2026-01-05', value: volume * 2 },
      { week: '2026-01-12', value: volume },
    ]);
  });

  it('suma minutos y distancia de cardio por semana', () => {
    const cardio = (date: string, minutes: number, km: number | null): SessionDetail =>
      session(date, [
        {
          id: 2,
          exerciseId: 20,
          exerciseName: 'Cinta',
          exerciseType: 'cardio',
          libraryId: null,
          order: 0,
          durationMin: minutes,
          distanceKm: km,
          sets: [],
        },
      ]);

    const sessions = [cardio('2026-01-05', 30, 5), cardio('2026-01-07', 20, 3), cardio('2026-01-13', 40, null)];

    expect(weeklyCardioMinutes(sessions)).toEqual([
      { week: '2026-01-05', value: 50 },
      { week: '2026-01-12', value: 40 },
    ]);
    expect(weeklyCardioDistance(sessions)).toEqual([{ week: '2026-01-05', value: 8 }]);
  });

  it('calcula el progreso por ejercicio (1RM, peso máximo y volumen)', () => {
    const progress = exerciseProgress([benchLog('2026-01-12'), benchLog('2026-01-05')], 10);

    expect(progress.map((point) => point.date)).toEqual(['2026-01-05', '2026-01-12']);
    expect(progress[0]!.topWeight).toBe(85);
    expect(progress[0]!.best1RM).toBeCloseTo(93.53, 1);
    expect(progress[0]!.volume).toBe(80 * 5 + 85 * 3);
  });

  it('resume totales por ejercicio', () => {
    const totals = exerciseTotals([benchLog('2026-01-05'), benchLog('2026-01-12')]);
    expect(totals).toHaveLength(1);
    expect(totals[0]!.sessions).toBe(2);
    expect(totals[0]!.totalVolume).toBe((80 * 5 + 85 * 3) * 2);
  });
});
