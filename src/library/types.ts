import type { Locale } from '../shared/locale';

/**
 * Vocabulario compartido entre la biblioteca embebida, el catálogo del
 * usuario y el diagrama muscular.
 *
 * `cardio` es un centinela: los ejercicios de cardio no tienen grupo muscular
 * real, pero la columna muscle_group es NOT NULL (Spec §3).
 */
export type Muscle =
  | 'pectorales'
  | 'deltoides-anterior'
  | 'deltoides-lateral'
  | 'deltoides-posterior'
  | 'biceps'
  | 'triceps'
  | 'antebrazo'
  | 'recto-abdominal'
  | 'oblicuos'
  | 'erectores'
  | 'gluteo'
  | 'cuadriceps'
  | 'isquios'
  | 'gemelo'
  | 'trapecio'
  | 'dorsal'
  | 'aductores'
  | 'cardio';

export const MUSCLES: Muscle[] = [
  'pectorales',
  'deltoides-anterior',
  'deltoides-lateral',
  'deltoides-posterior',
  'biceps',
  'triceps',
  'antebrazo',
  'recto-abdominal',
  'oblicuos',
  'erectores',
  'gluteo',
  'cuadriceps',
  'isquios',
  'gemelo',
  'trapecio',
  'dorsal',
  'aductores',
];

export const MUSCLE_LABELS: Record<Locale, Record<Muscle, string>> = {
  es: {
    pectorales: 'Pectorales',
    'deltoides-anterior': 'Deltoides anterior',
    'deltoides-lateral': 'Deltoides lateral',
    'deltoides-posterior': 'Deltoides posterior',
    biceps: 'Bíceps',
    triceps: 'Tríceps',
    antebrazo: 'Antebrazo',
    'recto-abdominal': 'Recto abdominal',
    oblicuos: 'Oblicuos',
    erectores: 'Erectores espinales',
    gluteo: 'Glúteos',
    cuadriceps: 'Cuádriceps',
    isquios: 'Isquiotibiales',
    gemelo: 'Gemelos',
    trapecio: 'Trapecio',
    dorsal: 'Dorsal ancho',
    aductores: 'Aductores',
    cardio: 'Cardio',
  },
  ca: {
    pectorales: 'Pectorals',
    'deltoides-anterior': 'Deltoides anterior',
    'deltoides-lateral': 'Deltoides lateral',
    'deltoides-posterior': 'Deltoides posterior',
    biceps: 'Bíceps',
    triceps: 'Tríceps',
    antebrazo: 'Avantbraç',
    'recto-abdominal': 'Recte abdominal',
    oblicuos: 'Oblics',
    erectores: 'Erectors espinals',
    gluteo: 'Glutis',
    cuadriceps: 'Quàdriceps',
    isquios: 'Isquiotibials',
    gemelo: 'Bessons',
    trapecio: 'Trapezi',
    dorsal: 'Dorsal ample',
    aductores: 'Adductors',
    cardio: 'Cardio',
  },
};

export type MovementPattern = 'push' | 'pull' | 'squat' | 'hinge' | 'carry' | 'core';

export const PATTERN_LABELS: Record<Locale, Record<MovementPattern, string>> = {
  es: {
    push: 'Empuje',
    pull: 'Tracción',
    squat: 'Sentadilla',
    hinge: 'Bisagra de cadera',
    carry: 'Carga',
    core: 'Core',
  },
  ca: {
    push: 'Impuls',
    pull: 'Tracció',
    squat: 'Esquat',
    hinge: 'Frontissa de maluc',
    carry: 'Càrrega',
    core: 'Core',
  },
};

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell';

export const EQUIPMENT_LABELS: Record<Locale, Record<Equipment, string>> = {
  es: {
    barbell: 'Barra',
    dumbbell: 'Mancuernas',
    machine: 'Máquina',
    cable: 'Polea',
    bodyweight: 'Peso corporal',
    kettlebell: 'Kettlebell',
  },
  ca: {
    barbell: 'Barra',
    dumbbell: 'Mancuernes',
    machine: 'Màquina',
    cable: 'Politja',
    bodyweight: 'Pes corporal',
    kettlebell: 'Kettlebell',
  },
};

/** Identificadores de figura disponibles en src/client/components/ExerciseFigure.tsx. */
export type FigureId =
  | 'bench-press'
  | 'incline-press'
  | 'overhead-press'
  | 'push-up'
  | 'dip'
  | 'fly'
  | 'row'
  | 'pull-up'
  | 'pulldown'
  | 'curl'
  | 'lateral-raise'
  | 'shrug'
  | 'squat'
  | 'lunge'
  | 'leg-press'
  | 'leg-extension'
  | 'leg-curl'
  | 'calf-raise'
  | 'deadlift'
  | 'rdl'
  | 'hip-thrust'
  | 'good-morning'
  | 'swing'
  | 'triceps'
  | 'skull-crusher'
  | 'plank'
  | 'side-plank'
  | 'crunch'
  | 'leg-raise'
  | 'carry'
  | 'rotation';

export interface LibraryExercise {
  id: string;
  name: string;
  aliases: string[];
  pattern: MovementPattern;
  equipment: Equipment;
  /** Técnica paso a paso. */
  description: string;
  primaryMuscles: Muscle[];
  secondaryMuscles: Muscle[];
  media: {
    figure: FigureId;
    tips?: string[];
  };
}

/** Ejercicios de cardio que se siembran en el catálogo global. */
export interface CardioSeed {
  name: string;
  aliases: string[];
  notes?: string;
}

/** Contenido localizado de un ejercicio de la biblioteca. */
export interface LibraryTranslation {
  name: string;
  aliases: string[];
  description: string;
  tips: string[];
}

export function muscleLabel(muscle: Muscle, locale: Locale = 'es'): string {
  return MUSCLE_LABELS[locale][muscle] ?? muscle;
}

export function patternLabel(pattern: MovementPattern, locale: Locale = 'es'): string {
  return PATTERN_LABELS[locale][pattern] ?? pattern;
}

export function equipmentLabel(equipment: Equipment, locale: Locale = 'es'): string {
  return EQUIPMENT_LABELS[locale][equipment] ?? equipment;
}
