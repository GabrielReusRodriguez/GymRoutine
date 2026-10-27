import type { CardioSeed } from '../types';

/** Ejercicios de cardio del catálogo global (Spec §4, seed). */
export const CARDIO_SEED: CardioSeed[] = [
  { name: 'Cinta de correr', aliases: ['cinta', 'treadmill', 'correr'], notes: 'Velocidad e inclinación a gusto' },
  { name: 'Bicicleta estática', aliases: ['bici', 'bike', 'ciclo indoor'], notes: 'Resistencia y cadencia' },
  { name: 'Elíptica', aliases: ['elíptica', 'elliptical', 'cross trainer'] },
  { name: 'Remo ergómetro', aliases: ['remo cardio', 'rowing machine', 'ergómetro'] },
  { name: 'Natación', aliases: ['piscina', 'nadar', 'swimming'] },
  { name: 'Escalador', aliases: ['stair climber', 'escalera', 'stepper'], notes: 'Escaleras mecánicas' },
  { name: 'Saltar la cuerda', aliases: ['comba', 'jump rope', 'cuerda'] },
  { name: 'Carrera al aire libre', aliases: ['running', 'correr fuera', 'trote'] },
  { name: 'Caminata inclinada', aliases: ['incline walk', 'cinta inclinada', 'caminar'] },
  { name: 'Circuito HIIT', aliases: ['hiit', 'circuito', 'intervalos'] },
];
