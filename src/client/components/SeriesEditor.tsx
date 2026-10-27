import { useState } from 'react';
import type { SetEntry } from '../../shared/types';
import { IconPlus, IconTrash } from './Icons';

interface RawSet {
  weight: string;
  reps: string;
}

function toRaw(sets: SetEntry[]): RawSet[] {
  if (sets.length === 0) return [{ weight: '', reps: '' }];
  return sets.map((set) => ({
    weight: set.weightKg === null ? '' : String(set.weightKg),
    reps: set.reps === null ? '' : String(set.reps),
  }));
}

function parseNumber(value: string): number | null {
  const trimmed = value.replace(',', '.').trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

interface Props {
  sets: SetEntry[];
  onChange: (sets: SetEntry[]) => void;
}

export function SeriesEditor({ sets, onChange }: Props) {
  const [rows, setRows] = useState<RawSet[]>(() => toRaw(sets));

  const commit = (next: RawSet[]) => {
    setRows(next);
    onChange(
      next.map((row) => ({
        weightKg: parseNumber(row.weight),
        reps: parseNumber(row.reps),
      })),
    );
  };

  const update = (index: number, field: keyof RawSet, value: string) => {
    commit(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
  };

  return (
    <div>
      <table className="sets-table">
        <thead>
          <tr>
            <th style={{ width: 34 }}>#</th>
            <th>Peso (kg)</th>
            <th>Reps</th>
            <th style={{ width: 32 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              <td className="set-index">{index + 1}</td>
              <td>
                <input
                  className="set-input"
                  inputMode="decimal"
                  placeholder="0"
                  value={row.weight}
                  onChange={(event) => update(index, 'weight', event.target.value)}
                  aria-label={`Peso serie ${index + 1}`}
                />
              </td>
              <td>
                <input
                  className="set-input"
                  inputMode="numeric"
                  placeholder="0"
                  value={row.reps}
                  onChange={(event) => update(index, 'reps', event.target.value)}
                  aria-label={`Repeticiones serie ${index + 1}`}
                />
              </td>
              <td>
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={() => commit(rows.filter((_, rowIndex) => rowIndex !== index))}
                  disabled={rows.length === 1}
                  aria-label="Quitar serie"
                >
                  <IconTrash width={15} height={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        className="btn btn-sm"
        style={{ marginTop: 6 }}
        onClick={() => commit([...rows, { weight: rows.at(-1)?.weight ?? '', reps: rows.at(-1)?.reps ?? '' }])}
      >
        <IconPlus width={15} height={15} /> Añadir serie
      </button>
    </div>
  );
}
