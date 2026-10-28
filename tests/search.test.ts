import { describe, expect, it } from 'vitest';
import {
  getLibraryExercise,
  normalize,
  searchLibrary,
  STRENGTH_LIBRARY,
  STRENGTH_LIBRARY_CA,
} from '../src/library';

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

describe('biblioteca en catalán', () => {
  it('traduce todos los ejercicios de fuerza con contenido completo', () => {
    for (const exercise of STRENGTH_LIBRARY) {
      const translation = STRENGTH_LIBRARY_CA[exercise.id];
      expect(translation, exercise.id).toBeDefined();
      expect(translation!.name.length).toBeGreaterThan(0);
      expect(translation!.description.length).toBeGreaterThan(30);
      expect(translation!.aliases.length).toBeGreaterThan(0);
      expect(translation!.tips.length).toBeGreaterThan(0);
    }
    expect(Object.keys(STRENGTH_LIBRARY_CA)).toHaveLength(STRENGTH_LIBRARY.length);
  });

  it('localiza nombre, descripción y consejos conservando los metadatos', () => {
    const localized = getLibraryExercise('barbell-bench-press', 'ca');
    expect(localized?.name).toBe('Press de banca amb barra');
    expect(localized?.pattern).toBe('push');
    expect(localized?.equipment).toBe('barbell');
    expect(localized?.media.figure).toBe('bench-press');

    const original = getLibraryExercise('barbell-bench-press', 'es');
    expect(original?.name).toBe('Press banca con barra');
    expect(original?.description).not.toBe(localized?.description);
  });

  it('busca por nombre, alias y músculo en catalán', () => {
    const squat = searchLibrary({ query: 'esquat', locale: 'ca' });
    expect(squat.some((exercise) => exercise.id === 'back-squat')).toBe(true);
    expect(squat[0]!.name.toLowerCase()).toContain('esquat');

    const bench = searchLibrary({ query: 'banca', locale: 'ca' });
    expect(bench[0]!.id).toBe('barbell-bench-press');

    const quads = searchLibrary({ query: 'quadriceps', locale: 'ca' });
    expect(quads.some((exercise) => exercise.id === 'leg-extension')).toBe(true);
  });
});
