/**
 * Utilidades de listas compartidas entre pantallas. Viven aquí (y no en un
 * componente) para poder testearlas sin React.
 */

/**
 * Devuelve una copia de `items` con el elemento de la posición `from` movido a
 * la posición `to`. Si algún índice está fuera de rango o son iguales,
 * devuelve la misma lista sin copiarla.
 */
export function reorderItem<T>(items: T[], from: number, to: number): T[] {
  if (
    from === to ||
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length
  ) {
    return items;
  }
  const next = [...items];
  const [moved] = next.splice(from, 1);
  if (moved === undefined) return items;
  next.splice(to, 0, moved);
  return next;
}
