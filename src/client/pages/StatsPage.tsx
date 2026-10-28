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
import { useI18n } from '../i18n';

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
  const { t, tError, dateShort, number } = useI18n();
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

  const weekLabels = volume.map((point) => dateShort(point.week));

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">{t('stats.eyebrow')}</div>
          <h1>{t('stats.title')}</h1>
          <p>{t('stats.intro')}</p>
        </div>

        <div className="row" style={{ gap: 6 }}>
          {(
            [
              ['30', t('range.days30')],
              ['90', t('range.days90')],
              ['365', t('range.year')],
              ['all', t('common.all')],
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

      {sessions.error ? <div className="alert">{tError(sessions.error)}</div> : null}

      {data.length === 0 && !sessions.loading ? (
        <div className="empty">
          <p style={{ fontWeight: 600, color: 'var(--text)' }}>{t('stats.emptyTitle')}</p>
          <p className="small" style={{ marginTop: 4 }}>
            {t('stats.emptyBody')}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-3" style={{ marginBottom: 16 }}>
            <div className="card card-pad">
              <div className="stat-label">{t('stats.sessions')}</div>
              <div className="stat-value">{data.length}</div>
            </div>
            <div className="card card-pad">
              <div className="stat-label">{t('stats.volume')}</div>
              <div className="stat-value">{number(totalVolume)}</div>
              <div className="small dim">{t('stats.volumeHint')}</div>
            </div>
            <div className="card card-pad">
              <div className="stat-label">{t('stats.cardio')}</div>
              <div className="stat-value">{number(totalCardio)}</div>
              <div className="small dim">{t('stats.cardioHint')}</div>
            </div>
          </div>

          <div className="grid grid-2">
            <div className="card card-pad">
              <div className="row-between" style={{ marginBottom: 10 }}>
                <h2>{t('stats.weeklyVolume')}</h2>
                <span className="badge">{t('stats.sumFormula')}</span>
              </div>
              <div className="chart-box">
                {volume.length === 0 ? (
                  <p className="muted small">{t('stats.noWeights')}</p>
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
                <h2>{t('stats.weeklyCardio')}</h2>
                <span className="badge">{t('stats.cardioUnits')}</span>
              </div>
              <div className="chart-box">
                {minutes.length === 0 && distance.length === 0 ? (
                  <p className="muted small">{t('stats.noCardio')}</p>
                ) : (
                  <Bar
                    data={{
                      labels: minutes.map((point) => dateShort(point.week)),
                      datasets: [
                        {
                          label: t('stats.minutes'),
                          data: minutes.map((point) => point.value),
                          backgroundColor: 'rgba(110, 168, 255, 0.55)',
                          borderColor: BLUE,
                          borderWidth: 1,
                          borderRadius: 5,
                          maxBarThickness: 64,
                          yAxisID: 'y',
                        },
                        {
                          label: t('stats.kilometers'),
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
              <h2>{t('stats.progression')}</h2>
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
              <p className="muted small">{t('stats.noSets')}</p>
            ) : (
              <div className="chart-box">
                <Line
                  data={{
                    labels: progress.map((point) => dateShort(point.date)),
                    datasets: [
                      {
                        label: t('stats.bestRm'),
                        data: progress.map((point) => Math.round(point.best1RM * 10) / 10),
                        borderColor: ACCENT,
                        backgroundColor: 'rgba(198, 242, 78, 0.12)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 3,
                      },
                      {
                        label: t('stats.topWeight'),
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
              <h2>{t('stats.totals')}</h2>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('stats.exercise')}</th>
                    <th>{t('stats.type')}</th>
                    <th>{t('stats.sessionsCol')}</th>
                    <th>{t('stats.volumeCol')}</th>
                    <th>{t('stats.bestRmCol')}</th>
                    <th>{t('stats.minutesCol')}</th>
                  </tr>
                </thead>
                <tbody>
                  {totals.map((item) => (
                    <tr key={item.exerciseId}>
                      <td>{item.exerciseName}</td>
                      <td className="dim">{item.type === 'cardio' ? t('type.cardio') : t('type.weights')}</td>
                      <td>{item.sessions}</td>
                      <td>{item.totalVolume > 0 ? number(item.totalVolume) : '—'}</td>
                      <td>{item.best1RM > 0 ? number(item.best1RM, 1) : '—'}</td>
                      <td>{item.totalMinutes > 0 ? number(item.totalMinutes) : '—'}</td>
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
