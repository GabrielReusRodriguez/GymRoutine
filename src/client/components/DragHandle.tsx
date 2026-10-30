import type { PointerEvent as ReactPointerEvent } from 'react';
import { IconGrip } from './Icons';

interface Props {
  /** Etiqueta accesible del asa. */
  label: string;
  /** Props de arrastre que devuelve `useDragReorder().handleProps(index)`. */
  dragProps: {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
  };
}

/** Asa para arrastrar una tarjeta y cambiar su posición en la lista. */
export function DragHandle({ label, dragProps }: Props) {
  return (
    <span className="drag-handle" role="img" aria-label={label} title={label} {...dragProps}>
      <IconGrip />
    </span>
  );
}
