import type { FigureId } from '../../library/types';

interface Pose {
  hip: [number, number];
  /** Grados desde la vertical hacia delante (positivo = derecha). */
  torso: number;
  arm: number;
  forearm: number;
  thigh: number;
  shin: number;
}

interface Joints {
  hip: [number, number];
  shoulder: [number, number];
  head: [number, number];
  elbow: [number, number];
  hand: [number, number];
  knee: [number, number];
  foot: [number, number];
}

const rad = (degrees: number) => (degrees * Math.PI) / 180;

function solve(pose: Pose): Joints {
  const [hx, hy] = pose.hip;
  const torsoRad = rad(pose.torso);

  const shoulder: [number, number] = [hx + 55 * Math.sin(torsoRad), hy - 55 * Math.cos(torsoRad)];
  const head: [number, number] = [shoulder[0] + 17 * Math.sin(torsoRad), shoulder[1] - 17 * Math.cos(torsoRad)];

  const armRad = rad(pose.arm);
  const elbow: [number, number] = [shoulder[0] + 30 * Math.sin(armRad), shoulder[1] + 30 * Math.cos(armRad)];

  const foreRad = rad(pose.arm + pose.forearm);
  const hand: [number, number] = [elbow[0] + 27 * Math.sin(foreRad), elbow[1] + 27 * Math.cos(foreRad)];

  const thighRad = rad(pose.thigh);
  const knee: [number, number] = [hx + 36 * Math.sin(thighRad), hy + 36 * Math.cos(thighRad)];

  const shinRad = rad(pose.thigh + pose.shin);
  const foot: [number, number] = [knee[0] + 34 * Math.sin(shinRad), knee[1] + 34 * Math.cos(shinRad)];

  return { hip: [hx, hy], shoulder, head, elbow, hand, knee, foot };
}

const standing = (overrides: Partial<Pose> = {}): Pose => ({
  hip: [92, 118],
  torso: 0,
  arm: 8,
  forearm: 4,
  thigh: 0,
  shin: 0,
  ...overrides,
});

interface Animation {
  from: Pose;
  to: Pose;
  bench?: boolean;
  bar?: boolean;
  /** Punto donde se dibuja la barra: la mano (por defecto) o las caderas. */
  barAt?: 'hand' | 'hip';
  /** Altura de la barra fija (dominadas, jalón). */
  pullupBar?: number;
}

const ANIMATIONS: Record<FigureId, Animation> = {
  'bench-press': {
    from: { hip: [62, 152], torso: 96, arm: 198, forearm: -150, thigh: -60, shin: 65 },
    to: { hip: [62, 152], torso: 96, arm: 178, forearm: -8, thigh: -60, shin: 65 },
    bench: true,
    bar: true,
  },
  'incline-press': {
    from: { hip: [66, 158], torso: 68, arm: 205, forearm: -145, thigh: -75, shin: 60 },
    to: { hip: [66, 158], torso: 68, arm: 165, forearm: -5, thigh: -75, shin: 60 },
    bench: true,
    bar: true,
  },
  'overhead-press': {
    from: standing({ arm: 130, forearm: -105 }),
    to: standing({ torso: -3, arm: 170, forearm: 8 }),
    bar: true,
  },
  'push-up': {
    from: { hip: [100, 176], torso: -78, arm: 8, forearm: 72, thigh: 74, shin: -10 },
    to: { hip: [100, 168], torso: -80, arm: 25, forearm: 40, thigh: 74, shin: -10 },
  },
  dip: {
    from: { hip: [92, 104], torso: 4, arm: 56, forearm: 0, thigh: -16, shin: -22 },
    to: { hip: [92, 120], torso: 6, arm: 40, forearm: 66, thigh: -16, shin: -22 },
    bar: true,
  },
  fly: {
    from: { hip: [62, 152], torso: 96, arm: 200, forearm: -18, thigh: -60, shin: 65 },
    to: { hip: [62, 152], torso: 96, arm: 172, forearm: 0, thigh: -60, shin: 65 },
    bench: true,
  },
  row: {
    from: standing({ torso: 56, arm: 24, forearm: 0 }),
    to: standing({ torso: 56, arm: 208, forearm: 118 }),
    bar: true,
  },
  'pull-up': {
    from: standing({ hip: [92, 138], torso: 2, arm: 150, forearm: 22 }),
    to: standing({ hip: [92, 108], torso: 2, arm: 162, forearm: 8 }),
    pullupBar: 16,
  },
  pulldown: {
    from: { hip: [92, 166], torso: 6, arm: 180, forearm: 0, thigh: 88, shin: -88 },
    to: { hip: [92, 166], torso: 6, arm: 140, forearm: -147, thigh: 88, shin: -88 },
    bench: true,
    bar: true,
    pullupBar: 57,
  },
  curl: {
    from: standing({ arm: 6, forearm: 2 }),
    to: standing({ arm: 16, forearm: 120 }),
    bar: true,
  },
  'lateral-raise': {
    from: standing({ arm: 6, forearm: 2 }),
    to: standing({ arm: 84, forearm: 0 }),
  },
  shrug: {
    from: standing({ arm: 6 }),
    to: standing({ hip: [92, 112], arm: 4 }),
    bar: true,
  },
  squat: {
    from: standing({ arm: 12 }),
    to: standing({ hip: [90, 148], torso: 26, arm: 78, forearm: 4, thigh: 52, shin: -46 }),
    bar: true,
  },
  lunge: {
    from: standing({ arm: 10 }),
    to: standing({ hip: [88, 142], torso: 12, arm: 20, thigh: 48, shin: -44 }),
  },
  'leg-press': {
    from: { hip: [58, 150], torso: 30, arm: 70, forearm: 40, thigh: 76, shin: -66 },
    to: { hip: [58, 150], torso: 30, arm: 70, forearm: 40, thigh: 62, shin: 4 },
  },
  'leg-extension': {
    from: { hip: [78, 142], torso: 8, arm: 20, forearm: 30, thigh: 80, shin: 82 },
    to: { hip: [78, 142], torso: 8, arm: 20, forearm: 30, thigh: 80, shin: 2 },
  },
  'leg-curl': {
    from: { hip: [86, 152], torso: 94, arm: 200, forearm: -20, thigh: -78, shin: 0 },
    to: { hip: [86, 152], torso: 94, arm: 200, forearm: -20, thigh: -78, shin: -70 },
    bench: true,
  },
  'calf-raise': {
    from: standing({}),
    to: standing({ hip: [92, 110] }),
  },
  deadlift: {
    from: standing({ hip: [94, 138], torso: 52, arm: 10, thigh: 46, shin: -44 }),
    to: standing({ torso: 8, arm: 4 }),
    bar: true,
  },
  rdl: {
    from: standing({ torso: 6, arm: 4 }),
    to: standing({ torso: 74, arm: 0, thigh: 14, shin: -10 }),
    bar: true,
  },
  'hip-thrust': {
    from: { hip: [104, 168], torso: -88, arm: 90, forearm: 0, thigh: 88, shin: -88 },
    to: { hip: [104, 150], torso: -107, arm: 90, forearm: 0, thigh: 60, shin: -60 },
    bench: true,
    bar: true,
    barAt: 'hip',
  },
  'good-morning': {
    from: standing({ torso: 6, arm: 150, forearm: -80 }),
    to: standing({ torso: 70, arm: 150, forearm: -80, thigh: 12 }),
    bar: true,
  },
  swing: {
    from: standing({ hip: [94, 128], torso: 42, arm: 26, thigh: 24, shin: -14 }),
    to: standing({ torso: 0, arm: 96, forearm: 0 }),
  },
  triceps: {
    from: standing({ arm: 6, forearm: 118 }),
    to: standing({ arm: 6, forearm: 0 }),
  },
  'skull-crusher': {
    from: { hip: [62, 152], torso: 96, arm: 200, forearm: 0, thigh: -60, shin: 65 },
    to: { hip: [62, 152], torso: 96, arm: 200, forearm: -78, thigh: -60, shin: 65 },
    bench: true,
    bar: true,
  },
  plank: {
    from: { hip: [100, 175], torso: -78, arm: 8, forearm: 82, thigh: 75, shin: -12 },
    to: { hip: [100, 177], torso: -77, arm: 10, forearm: 80, thigh: 74, shin: -12 },
  },
  'side-plank': {
    from: { hip: [100, 172], torso: -70, arm: 172, forearm: 0, thigh: 74, shin: -14 },
    to: { hip: [100, 174], torso: -69, arm: 170, forearm: 4, thigh: 73, shin: -14 },
  },
  crunch: {
    from: { hip: [96, 190], torso: -96, arm: 100, forearm: 10, thigh: 95, shin: -31 },
    to: { hip: [96, 190], torso: -55, arm: 70, forearm: 0, thigh: 95, shin: -31 },
  },
  'leg-raise': {
    from: standing({ hip: [92, 134], arm: 170, forearm: 4, thigh: 0 }),
    to: standing({ hip: [92, 134], arm: 170, forearm: 4, thigh: 84, shin: -6 }),
    pullupBar: 16,
  },
  carry: {
    from: standing({ hip: [92, 116] }),
    to: standing({ hip: [92, 119] }),
  },
  rotation: {
    from: standing({ arm: 60, forearm: 20 }),
    to: standing({ arm: 118, forearm: 10 }),
  },
};

function Skeleton({ pose }: { pose: Pose }) {
  const j = solve(pose);

  return (
    <g
      stroke="#dfe6ee"
      strokeWidth={5}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      <line x1={j.hip[0]} y1={j.hip[1]} x2={j.shoulder[0]} y2={j.shoulder[1]} />
      <line x1={j.shoulder[0]} y1={j.shoulder[1]} x2={j.elbow[0]} y2={j.elbow[1]} />
      <line x1={j.elbow[0]} y1={j.elbow[1]} x2={j.hand[0]} y2={j.hand[1]} />
      <line x1={j.hip[0]} y1={j.hip[1]} x2={j.knee[0]} y2={j.knee[1]} />
      <line x1={j.knee[0]} y1={j.knee[1]} x2={j.foot[0]} y2={j.foot[1]} />
      <line
        x1={j.foot[0]}
        y1={j.foot[1]}
        x2={j.foot[0] + 11}
        y2={j.foot[1]}
        strokeWidth={4}
      />
      <circle cx={j.head[0]} cy={j.head[1]} r={10} fill="#dfe6ee" stroke="none" />
      <circle cx={j.hip[0]} cy={j.hip[1]} r={2.5} fill="#dfe6ee" stroke="none" />
      <circle cx={j.shoulder[0]} cy={j.shoulder[1]} r={2.5} fill="#dfe6ee" stroke="none" />
    </g>
  );
}

function Scene({ animation }: { animation: Animation }) {
  return (
    <>
      <line x1={8} y1={202} x2={192} y2={202} stroke="#2c3641" strokeWidth={2.5} />
      {animation.bench ? (
        <g>
          <rect x={26} y={172} width={104} height={9} rx={3} fill="#2a333d" />
          <line x1={42} y1={181} x2={42} y2={200} stroke="#2a333d" strokeWidth={3} />
          <line x1={114} y1={181} x2={114} y2={200} stroke="#2a333d" strokeWidth={3} />
        </g>
      ) : null}
      {animation.pullupBar === undefined ? null : (
        <line
          x1={40}
          y1={animation.pullupBar}
          x2={164}
          y2={animation.pullupBar}
          stroke="#38434f"
          strokeWidth={5}
          strokeLinecap="round"
        />
      )}
    </>
  );
}

function Barbell({ point }: { point: [number, number] }) {
  return (
    <line
      x1={point[0] - 20}
      y1={point[1]}
      x2={point[0] + 20}
      y2={point[1]}
      stroke="#8b98a6"
      strokeWidth={4}
      strokeLinecap="round"
    />
  );
}

export function ExerciseFigure({
  figure,
  animated = true,
  className,
}: {
  figure: FigureId;
  animated?: boolean;
  className?: string;
}) {
  const animation = ANIMATIONS[figure] ?? ANIMATIONS.squat;
  const fromJoints = solve(animation.from);
  const toJoints = solve(animation.to);
  const barPoint = (j: Joints) => (animation.barAt === 'hip' ? j.hip : j.hand);

  return (
    <svg
      className={`figure-svg ${className ?? ''}`}
      viewBox="0 0 200 210"
      role="img"
      aria-label="Figura esquemática del movimiento"
    >
      <Scene animation={animation} />
      <g className={animated ? 'figure-frame' : undefined}>
        <Skeleton pose={animation.from} />
        {animation.bar ? <Barbell point={barPoint(fromJoints)} /> : null}
      </g>
      <g className={animated ? 'figure-frame figure-frame-b' : undefined} opacity={animated ? undefined : 0}>
        <Skeleton pose={animation.to} />
        {animation.bar ? <Barbell point={barPoint(toJoints)} /> : null}
      </g>
    </svg>
  );
}
