import { describe, expect, it } from 'vitest';
import { reorderItem } from '../src/shared/list';

describe('reorderItem', () => {
  const base = ['a', 'b', 'c', 'd'];

  it('mueve un elemento hacia abajo', () => {
    expect(reorderItem(base, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('mueve un elemento hacia arriba', () => {
    expect(reorderItem(base, 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('mueve al inicio y al final', () => {
    expect(reorderItem(base, 2, 0)).toEqual(['c', 'a', 'b', 'd']);
    expect(reorderItem(base, 0, 3)).toEqual(['b', 'c', 'd', 'a']);
  });

  it('no muta la lista original', () => {
    const copy = [...base];
    reorderItem(base, 0, 3);
    expect(base).toEqual(copy);
  });

  it('devuelve la misma lista si el movimiento es nulo o inválido', () => {
    expect(reorderItem(base, 1, 1)).toBe(base);
    expect(reorderItem(base, -1, 2)).toBe(base);
    expect(reorderItem(base, 0, 4)).toBe(base);
    expect(reorderItem(base, 0.5, 2)).toBe(base);
    expect(reorderItem([], 0, 1)).toEqual([]);
  });
});
