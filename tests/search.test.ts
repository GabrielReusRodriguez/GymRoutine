import { describe, expect, it } from 'vitest';
import { normalize, searchLibrary, STRENGTH_LIBRARY } from '../src/library';

describe('biblioteca de ejercicios', () => {
  it('tiene al menos 50 ejercicios con datos completos', () => {
    expect(STRENGTH_LIBRARY.length).toBeGreaterThanOrEqual(50);
    for (const exercise of STRENGTH_LIBRARY) {
      expect(exercise.name.length).toBeGreaterThan(0);
      expect(exercise.description.length).toBeGreaterThan(30);
      expect(exercise.primaryMuscles.length).toBeGreaterThan(0);
      expect(exercise.aliases.length).toBeGreaterThan(0);
    }
    const ids = new Set(STRENGTH_LIBRARY.map((exercise) => exercise.id));
    expect(ids.size).toBe(STRENGTH_LIBRARY.length);
  });

  it('normaliza acentos y mayúsculas', () => {
    expect(normalize('Press Banca Árduo')).toBe('press banca arduo');
  });

  it('encuentra por alias sin acentos', () => {
    const results = searchLibrary({ query: 'banca' });
    expect(results[0]!.id).toBe('barbell-bench-press');

    const accented = searchLibrary({ query: 'pajaros' });
    expect(accented.some((exercise) => exercise.id === 'rear-delt-fly')).toBe(true);
  });

  it('filtra por patrón, equipamiento y músculo', () => {
    const hinge = searchLibrary({ filters: { pattern: 'hinge' } });
    expect(hinge.length).toBeGreaterThan(3);
    expect(hinge.every((exercise) => exercise.pattern === 'hinge')).toBe(true);

    const dumbbell = searchLibrary({ filters: { equipment: 'dumbbell', pattern: 'squat' } });
    expect(dumbbell.every((exercise) => exercise.equipment === 'dumbbell')).toBe(true);

    const glutes = searchLibrary({ filters: { muscle: 'gluteo' } });
    expect(glutes.some((exercise) => exercise.id === 'hip-thrust')).toBe(true);
    expect(glutes.every((exercise) => exercise.primaryMuscles.includes('gluteo') || exercise.secondaryMuscles.includes('gluteo'))).toBe(true);
  });

  it('ordena por relevancia y respeta el límite', () => {
    const results = searchLibrary({ query: 'press', limit: 5 });
    expect(results).toHaveLength(5);
    expect(results[0]!.name.toLowerCase()).toContain('press');
  });

  it('devuelve lista vacía si no hay coincidencias', () => {
    expect(searchLibrary({ query: 'xyz-no-existe' })).toEqual([]);
  });
});
