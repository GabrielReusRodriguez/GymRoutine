import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { SessionDetail } from '../../shared/types';
import { listSessionDetails, deleteSession } from '../../db/repositories/sessions';
import { useAuth } from '../hooks/useAuth';
import { useDbHandle } from '../hooks/useDb';
import { useAsync } from '../hooks/useAsync';
import { formatDateLong, formatNumber, plural, todayISO } from '../lib/format';
import { IconChevron, IconEdit, IconTrash } from '../components/Icons';

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function sessionTotals(session: SessionDetail) {
  let volume = 0;
  let minutes = 0;
  let distance = 0;
  for (const log of session.logs) {
    if (log.exerciseType === 'cardio') {
      minutes += log.durationMin ?? 0;
      distance += log.distanceKm ?? 0;
    } else {
      for (const set of log.sets) volume += (set.weightKg ?? 0) * (set.reps ?? 0);
    }
  }
  return { volume, minutes, distance };
}

export function HistoryPage() {
  const { user } = useAuth();
  const handle = useDbHandle();
  const [range, setRange] = useState<'30' | '90' | 'all'>('90');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState<number | null>(null);

  const from = range === 'all' ? undefined : daysAgo(Number(range));

  const sessions = useAsync(
    () => listSessionDetails(handle, user!.id, from ? { from } : {}),
    [handle, user!.id, from],
  );

  const totalVolume = useMemo(
    () => (sessions.data ?? []).reduce((sum, session) => sum + sessionTotals(session).volume, 0),
    [sessions.data],
  );

  const toggle = (id: number) => {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const remove = async (session: SessionDetail) => {
    if (!window.confirm(`¿Borrar la sesión del ${formatDateLong(session.date)}?`)) return;
    setBusy(session.id);
    try {
      await deleteSession(handle, user!.id, session.id);
      sessions.reload();
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Histórico</div>
          <h1>Tus entrenamientos</h1>
          <p>
            {sessions.data ? plural(sessions.data.length, 'sesión', 'sesiones') : 'Cargando…'} ·
            volumen acumulado <span className="mono">{formatNumber(totalVolume)} kg</span>
          </p>
        </div>

        <div className="row" style={{ gap: 6 }}>
          {(
            [
              ['30', '30 días'],
              ['90', '90 días'],
              ['all', 'Todo'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              className={`chip ${range === value ? 'active' : ''}`}
              onClick={() => setRange(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {sessions.error ? <div className="alert">{sessions.error}</div> : null}

      {sessions.loading && !sessions.data ? (
        <div className="empty">Cargando histórico…</div>
      ) : (sessions.data ?? []).length === 0 ? (
        <div className="empty">
          <p style={{ fontWeight: 600, color: 'var(--text)' }}>Aún no hay sesiones guardadas</p>
          <p className="small" style={{ marginTop: 4 }}>
            Empieza registrando el entrenamiento de hoy.
          </p>
          <Link className="btn btn-primary" to="/session" style={{ marginTop: 16 }}>
            Ir a la sesión de hoy
          </Link>
        </div>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          {(sessions.data ?? []).map((session) => {
            const totals = sessionTotals(session);
            const isOpen = expanded.has(session.id);

            return (
              <div className="session-item" key={session.id}>
                <button className="session-summary" onClick={() => toggle(session.id)}>
                  <span className="session-date">{session.date === todayISO() ? 'Hoy' : formatDateLong(session.date)}</span>
                  <span className="row small muted" style={{ gap: 14 }}>
                    <span>{plural(session.logs.length, 'ejercicio', 'ejercicios')}</span>
                    {totals.volume > 0 ? <span className="mono">{formatNumber(totals.volume)} kg</span> : null}
                    {totals.minutes > 0 ? <span className="mono">{totals.minutes} min</span> : null}
                    {totals.distance > 0 ? <span className="mono">{totals.distance} km</span> : null}
                  </span>
                  <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <IconChevron
                      width={16}
                      height={16}
                      style={{ transform: isOpen ? 'rotate(90deg)' : undefined, transition: 'transform .15s' }}
                    />
                  </span>
                </button>

                {isOpen ? (
                  <div className="session-body">
                    {session.notes ? (
                      <p className="small muted" style={{ padding: '10px 0' }}>
                        “{session.notes}”
                      </p>
                    ) : null}

                    {session.logs.map((log) => (
                      <div className="log-line" key={log.id}>
                        <span>
                          {log.exerciseName}{' '}
                          <span className="dim small">
                            {log.exerciseType === 'cardio' ? 'cardio' : 'pesas'}
                          </span>
                        </span>
                        <span className="mono small muted" style={{ textAlign: 'right' }}>
                          {log.exerciseType === 'cardio'
                            ? `${log.durationMin ?? 0} min${log.distanceKm ? ` · ${log.distanceKm} km` : ''}`
                            : log.sets
                                .map((set) => `${set.weightKg ?? '—'}×${set.reps ?? '—'}`)
                                .join(' · ')}
                        </span>
                      </div>
                    ))}

                    <div className="row" style={{ marginTop: 14, gap: 8 }}>
                      <Link className="btn btn-sm" to={`/session/${session.date}`}>
                        <IconEdit width={15} height={15} /> Editar
                      </Link>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => remove(session)}
                        disabled={busy === session.id}
                      >
                        <IconTrash width={15} height={15} /> Borrar
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
