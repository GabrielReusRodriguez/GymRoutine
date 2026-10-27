import { useMemo, useState } from 'react';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { listSessionDetails } from '../../db/repositories/sessions';
import {
  exerciseProgress,
  exerciseTotals,
  weeklyCardioDistance,
  weeklyCardioMinutes,
  weeklyStrengthVolume,
} from '../../shared/stats';
import { useAuth } from '../hooks/useAuth';
import { useDbHandle } from '../hooks/useDb';
import { useAsync } from '../hooks/useAsync';
import { formatDateShort, formatNumber } from '../lib/format';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
);

const ACCENT = '#c6f24e';
const ORANGE = '#ffab4a';
const BLUE = '#6ea8ff';
const GRID = 'rgba(255,255,255,0.06)';
const TICK = '#93a1b0';

const baseOptions: ChartOptions<'bar' | 'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: TICK, boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } },
    },
    tooltip: {
      backgroundColor: '#141a21',
      borderColor: '#35424f',
      borderWidth: 1,
      titleColor: '#e8edf2',
      bodyColor: '#c5cfda',
    },
  },
  scales: {
    x: { grid: { color: GRID }, ticks: { color: TICK, font: { size: 10 } } },
    y: { grid: { color: GRID }, ticks: { color: TICK, font: { size: 10 } }, beginAtZero: true },
  },
};

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function StatsPage() {
  const { user } = useAuth();
  const handle = useDbHandle();
  const [range, setRange] = useState<'30' | '90' | '365' | 'all'>('90');
  const [exerciseId, setExerciseId] = useState<number | null>(null);

  const from = range === 'all' ? undefined : daysAgo(Number(range));

  const sessions = useAsync(
    () => listSessionDetails(handle, user!.id, from ? { from } : {}),
    [handle, user!.id, from],
  );

  const data = sessions.data ?? [];

  const volume = useMemo(() => weeklyStrengthVolume(data), [data]);
  const minutes = useMemo(() => weeklyCardioMinutes(data), [data]);
  const distance = useMemo(() => weeklyCardioDistance(data), [data]);
  const totals = useMemo(() => exerciseTotals(data), [data]);
  const weightExercises = useMemo(
    () => totals.filter((item) => item.type === 'weights'),
    [totals],
  );

  const activeExerciseId = exerciseId ?? weightExercises[0]?.exerciseId ?? 0;
  const progress = useMemo(
    () => (activeExerciseId ? exerciseProgress(data, activeExerciseId) : []),
    [data, activeExerciseId],
  );

  const totalVolume = data.reduce(
    (sum, session) =>
      sum +
      session.logs.reduce(
        (logSum, log) =>
          logSum +
          (log.exerciseType === 'weights'
            ? log.sets.reduce((setSum, set) => setSum + (set.weightKg ?? 0) * (set.reps ?? 0), 0)
            : 0),
        0,
      ),
    0,
  );

  const totalCardio = data.reduce(
    (sum, session) =>
      sum +
      session.logs.reduce(
        (logSum, log) => logSum + (log.exerciseType === 'cardio' ? (log.durationMin ?? 0) : 0),
        0,
      ),
    0,
  );

  const weekLabels = volume.map((point) => formatDateShort(point.week));

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Estadísticas</div>
          <h1>Progreso</h1>
          <p>Volumen, 1RM estimado (Epley) y cardio por semana.</p>
        </div>

        <div className="row" style={{ gap: 6 }}>
          {(
            [
              ['30', '30 días'],
              ['90', '90 días'],
              ['365', '1 año'],
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

      {data.length === 0 && !sessions.loading ? (
        <div className="empty">
          <p style={{ fontWeight: 600, color: 'var(--text)' }}>Sin datos en este periodo</p>
          <p className="small" style={{ marginTop: 4 }}>
            Registra sesiones para ver tu progreso.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-3" style={{ marginBottom: 16 }}>
            <div className="card card-pad">
              <div className="stat-label">Sesiones</div>
              <div className="stat-value">{data.length}</div>
            </div>
            <div className="card card-pad">
              <div className="stat-label">Volumen de pesas</div>
              <div className="stat-value">{formatNumber(totalVolume)}</div>
              <div className="small dim">kg levantados en total</div>
            </div>
            <div className="card card-pad">
              <div className="stat-label">Cardio</div>
              <div className="stat-value">{formatNumber(totalCardio)}</div>
              <div className="small dim">minutos acumulados</div>
            </div>
          </div>

          <div className="grid grid-2">
            <div className="card card-pad">
              <div className="row-between" style={{ marginBottom: 10 }}>
                <h2>Volumen semanal</h2>
                <span className="badge">Σ peso × reps</span>
              </div>
              <div className="chart-box">
                {volume.length === 0 ? (
                  <p className="muted small">Sin sesiones de pesas en el periodo.</p>
                ) : (
                  <Bar
                    data={{
                      labels: weekLabels,
                      datasets: [
                        {
                          label: 'kg',
                          data: volume.map((point) => Math.round(point.value)),
                          backgroundColor: 'rgba(198, 242, 78, 0.55)',
                          borderColor: ACCENT,
                          borderWidth: 1,
                          borderRadius: 5,
                          maxBarThickness: 64,
                        },
                      ],
                    }}
                    options={baseOptions as ChartOptions<'bar'>}
                  />
                )}
              </div>
            </div>

            <div className="card card-pad">
              <div className="row-between" style={{ marginBottom: 10 }}>
                <h2>Cardio semanal</h2>
                <span className="badge">min · km</span>
              </div>
              <div className="chart-box">
                {minutes.length === 0 && distance.length === 0 ? (
                  <p className="muted small">Sin cardio en el periodo.</p>
                ) : (
                  <Bar
                    data={{
                      labels: minutes.map((point) => formatDateShort(point.week)),
                      datasets: [
                        {
                          label: 'Minutos',
                          data: minutes.map((point) => point.value),
                          backgroundColor: 'rgba(110, 168, 255, 0.55)',
                          borderColor: BLUE,
                          borderWidth: 1,
                          borderRadius: 5,
                          maxBarThickness: 64,
                          yAxisID: 'y',
                        },
                        {
                          label: 'Kilómetros',
                          data: minutes.map(
                            (point) =>
                              distance.find((item) => item.week === point.week)?.value ?? 0,
                          ),
                          backgroundColor: 'rgba(255, 171, 74, 0.5)',
                          borderColor: ORANGE,
                          borderWidth: 1,
                          borderRadius: 5,
                          maxBarThickness: 64,
                          yAxisID: 'y1',
                        },
                      ],
                    }}
                    options={
                      {
                        ...baseOptions,
                        scales: {
                          x: { grid: { color: GRID }, ticks: { color: TICK, font: { size: 10 } } },
                          y: {
                            position: 'left',
                            grid: { color: GRID },
                            ticks: { color: TICK, font: { size: 10 } },
                            beginAtZero: true,
                          },
                          y1: {
                            position: 'right',
                            grid: { drawOnChartArea: false },
                            ticks: { color: TICK, font: { size: 10 } },
                            beginAtZero: true,
                          },
                        },
                      } as ChartOptions<'bar'>
                    }
                  />
                )}
              </div>
            </div>
          </div>

          <div className="card card-pad" style={{ marginTop: 16 }}>
            <div className="row-between" style={{ marginBottom: 10 }}>
              <h2>Progresión por ejercicio</h2>
              {weightExercises.length > 0 ? (
                <select
                  className="select"
                  style={{ width: 'auto', maxWidth: '100%' }}
                  value={activeExerciseId}
                  onChange={(event) => setExerciseId(Number(event.target.value))}
                >
                  {weightExercises.map((item) => (
                    <option key={item.exerciseId} value={item.exerciseId}>
                      {item.exerciseName}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>

            {progress.length === 0 ? (
              <p className="muted small">Sin series registradas de este ejercicio en el periodo.</p>
            ) : (
              <div className="chart-box">
                <Line
                  data={{
                    labels: progress.map((point) => formatDateShort(point.date)),
                    datasets: [
                      {
                        label: '1RM estimado (kg)',
                        data: progress.map((point) => Math.round(point.best1RM * 10) / 10),
                        borderColor: ACCENT,
                        backgroundColor: 'rgba(198, 242, 78, 0.12)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 3,
                      },
                      {
                        label: 'Peso máximo (kg)',
                        data: progress.map((point) => point.topWeight),
                        borderColor: ORANGE,
                        backgroundColor: 'transparent',
                        tension: 0.3,
                        pointRadius: 3,
                        borderDash: [5, 4],
                      },
                    ],
                  }}
                  options={baseOptions as ChartOptions<'line'>}
                />
              </div>
            )}
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-pad" style={{ paddingBottom: 6 }}>
              <h2>Totales por ejercicio</h2>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ejercicio</th>
                    <th>Tipo</th>
                    <th>Sesiones</th>
                    <th>Volumen (kg)</th>
                    <th>Mejor 1RM</th>
                    <th>Minutos</th>
                  </tr>
                </thead>
                <tbody>
                  {totals.map((item) => (
                    <tr key={item.exerciseId}>
                      <td>{item.exerciseName}</td>
                      <td className="dim">{item.type === 'cardio' ? 'Cardio' : 'Pesas'}</td>
                      <td>{item.sessions}</td>
                      <td>{item.totalVolume > 0 ? formatNumber(item.totalVolume) : '—'}</td>
                      <td>{item.best1RM > 0 ? formatNumber(item.best1RM, 1) : '—'}</td>
                      <td>{item.totalMinutes > 0 ? formatNumber(item.totalMinutes) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
