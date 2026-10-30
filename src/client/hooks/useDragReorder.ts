import { useCallback, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefCallback } from 'react';

interface DragReorder {
  /** Índice del elemento que se está arrastrando, o `null`. */
  dragIndex: number | null;
  /** Índice donde caería el elemento si se suelta ahora, o `null`. */
  overIndex: number | null;
  /** Ref para cada tarjeta, en el mismo orden que la lista. */
  itemRef: (index: number) => RefCallback<HTMLElement>;
  /** Props del asa de arrastre de la tarjeta `index`. */
  handleProps: (index: number) => {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
  };
  /** Props de la tarjeta `index` (clases de estado). */
  itemProps: (index: number) => { className: string };
}

/**
 * Reordena una lista arrastrando sus tarjetas. Usa Pointer Events en lugar del
 * drag & drop HTML5 nativo porque este último no funciona en pantallas
 * táctiles, y el móvil es el caso de uso principal. El destino se calcula
 * comparando la Y del puntero con el centro de cada tarjeta.
 */
export function useDragReorder(count: number, onReorder: (from: number, to: number) => void): DragReorder {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const itemElements = useRef<(HTMLElement | null)[]>([]);
  const dragIndexRef = useRef<number | null>(null);
  const overIndexRef = useRef<number | null>(null);

  const itemRef = useCallback(
    (index: number): RefCallback<HTMLElement> => (element) => {
      itemElements.current[index] = element;
    },
    [],
  );

  const indexAt = useCallback((clientY: number): number | null => {
    const elements = itemElements.current.slice(0, count);
    for (let index = 0; index < elements.length; index += 1) {
      const element = elements[index];
      if (!element) continue;
      const rect = element.getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return index;
    }
    return elements.length > 0 ? elements.length - 1 : null;
  }, [count]);

  const finish = useCallback(
    (commit: boolean) => {
      const from = dragIndexRef.current;
      const to = overIndexRef.current;
      dragIndexRef.current = null;
      overIndexRef.current = null;
      setDragIndex(null);
      setOverIndex(null);
      if (commit && from !== null && to !== null && from !== to) onReorder(from, to);
    },
    [onReorder],
  );

  const handleProps = useCallback(
    (index: number) => ({
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        dragIndexRef.current = index;
        overIndexRef.current = index;
        setDragIndex(index);
        setOverIndex(index);
      },
      onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
        if (dragIndexRef.current === null) return;
        const next = indexAt(event.clientY);
        if (next !== null && next !== overIndexRef.current) {
          overIndexRef.current = next;
          setOverIndex(next);
        }
      },
      onPointerUp: () => finish(true),
      onPointerCancel: () => finish(false),
    }),
    [finish, indexAt],
  );

  const itemProps = useCallback(
    (index: number) => {
      const classes = ['log-card'];
      if (dragIndex === index) classes.push('dragging');
      if (dragIndex !== null && overIndex === index && dragIndex !== index) classes.push('drop-target');
      return { className: classes.join(' ') };
    },
    [dragIndex, overIndex],
  );

  return { dragIndex, overIndex, itemRef, handleProps, itemProps };
}
