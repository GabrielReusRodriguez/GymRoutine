import type { Muscle } from '../../library/types';
import { useI18n } from '../i18n';

interface Props {
  primary: Muscle[];
  secondary: Muscle[];
  className?: string;
}

export function MuscleDiagram({ primary, secondary, className }: Props) {
  const { t } = useI18n();
  const primarySet = new Set(primary);
  const secondarySet = new Set(secondary);

  const cls = (muscle: Muscle): string => {
    if (primarySet.has(muscle)) return 'muscle-region is-primary';
    if (secondarySet.has(muscle)) return 'muscle-region is-secondary';
    return 'muscle-region';
  };

  return (
    <svg className={`muscle-svg ${className ?? ''}`} viewBox="0 0 360 240" role="img" aria-label={t('muscleDiagram.aria')}>
      {/* ── Vista frontal ── */}
      <g>
        <text x={80} y={12} textAnchor="middle" className="figure-label">
          {t('muscleDiagram.front')}
        </text>
        <path
          className="body-outline"
          d="M64 44 Q85 37 106 44 L112 74 L107 92 L105 126 L65 126 L63 92 L58 74 Z"
        />
        <circle cx={85} cy={0} r={0} className="body-outline" />
        <circle cx={85} cy={26} r={13} className="body-outline" />
        <rect x={78} y={36} width={14} height={10} className="body-outline" />
        <rect x={48} y={48} width={12} height={52} rx={6} className="body-outline" />
        <rect x={110} y={48} width={12} height={52} rx={6} className="body-outline" />
        <rect x={58} y={126} width={18} height={70} rx={8} className="body-outline" />
        <rect x={94} y={126} width={18} height={70} rx={8} className="body-outline" />

        {/* deltoides */}
        <circle cx={62} cy={50} r={8} className={cls('deltoides-anterior')} />
        <circle cx={108} cy={50} r={8} className={cls('deltoides-anterior')} />
        <circle cx={52} cy={56} r={6} className={cls('deltoides-lateral')} />
        <circle cx={118} cy={56} r={6} className={cls('deltoides-lateral')} />
        {/* pectorales */}
        <ellipse cx={76} cy={63} rx={12} ry={9} className={cls('pectorales')} />
        <ellipse cx={94} cy={63} rx={12} ry={9} className={cls('pectorales')} />
        {/* brazos */}
        <ellipse cx={54} cy={78} rx={6} ry={12} className={cls('biceps')} />
        <ellipse cx={116} cy={78} rx={6} ry={12} className={cls('biceps')} />
        <ellipse cx={52} cy={104} rx={5} ry={11} className={cls('antebrazo')} />
        <ellipse cx={118} cy={104} rx={5} ry={11} className={cls('antebrazo')} />
        {/* abdomen */}
        <rect x={74} y={80} width={22} height={42} rx={5} className={cls('recto-abdominal')} />
        <rect x={66} y={84} width={6} height={34} rx={3} className={cls('oblicuos')} />
        <rect x={98} y={84} width={6} height={34} rx={3} className={cls('oblicuos')} />
        {/* piernas */}
        <ellipse cx={67} cy={152} rx={8} ry={23} className={cls('cuadriceps')} />
        <ellipse cx={103} cy={152} rx={8} ry={23} className={cls('cuadriceps')} />
        <ellipse cx={76} cy={156} rx={4} ry={18} className={cls('aductores')} />
        <ellipse cx={94} cy={156} rx={4} ry={18} className={cls('aductores')} />
        <ellipse cx={66} cy={186} rx={5} ry={11} className={cls('gemelo')} />
        <ellipse cx={104} cy={186} rx={5} ry={11} className={cls('gemelo')} />
      </g>

      {/* ── Vista trasera ── */}
      <g transform="translate(180 0)">
        <text x={80} y={12} textAnchor="middle" className="figure-label">
          {t('muscleDiagram.back')}
        </text>
        <path
          className="body-outline"
          d="M64 44 Q85 37 106 44 L112 74 L107 92 L105 126 L65 126 L63 92 L58 74 Z"
        />
        <circle cx={85} cy={26} r={13} className="body-outline" />
        <rect x={78} y={36} width={14} height={10} className="body-outline" />
        <rect x={48} y={48} width={12} height={52} rx={6} className="body-outline" />
        <rect x={110} y={48} width={12} height={52} rx={6} className="body-outline" />
        <rect x={58} y={126} width={18} height={70} rx={8} className="body-outline" />
        <rect x={94} y={126} width={18} height={70} rx={8} className="body-outline" />

        {/* hombros posteriores */}
        <circle cx={62} cy={50} r={8} className={cls('deltoides-posterior')} />
        <circle cx={108} cy={50} r={8} className={cls('deltoides-posterior')} />
        {/* trapecio */}
        <path d="M70 42 L85 38 L100 42 L96 60 L85 66 L74 60 Z" className={cls('trapecio')} />
        {/* dorsal */}
        <ellipse cx={72} cy={78} rx={10} ry={16} className={cls('dorsal')} />
        <ellipse cx={98} cy={78} rx={10} ry={16} className={cls('dorsal')} />
        {/* tríceps y antebrazo */}
        <ellipse cx={54} cy={78} rx={6} ry={12} className={cls('triceps')} />
        <ellipse cx={116} cy={78} rx={6} ry={12} className={cls('triceps')} />
        <ellipse cx={52} cy={104} rx={5} ry={11} className={cls('antebrazo')} />
        <ellipse cx={118} cy={104} rx={5} ry={11} className={cls('antebrazo')} />
        {/* erectores */}
        <rect x={75} y={96} width={20} height={24} rx={4} className={cls('erectores')} />
        {/* glúteos */}
        <ellipse cx={74} cy={130} rx={10} ry={9} className={cls('gluteo')} />
        <ellipse cx={96} cy={130} rx={10} ry={9} className={cls('gluteo')} />
        {/* isquios */}
        <ellipse cx={67} cy={158} rx={7} ry={20} className={cls('isquios')} />
        <ellipse cx={103} cy={158} rx={7} ry={20} className={cls('isquios')} />
        {/* gemelos */}
        <ellipse cx={66} cy={186} rx={5} ry={11} className={cls('gemelo')} />
        <ellipse cx={104} cy={186} rx={5} ry={11} className={cls('gemelo')} />
      </g>
    </svg>
  );
}

export function MuscleLegend() {
  const { t } = useI18n();
  return (
    <div className="row small muted" style={{ gap: 18 }}>
      <span>
        <span className="legend-dot" style={{ background: 'var(--primary-muscle)' }} />
        {t('muscleDiagram.primary')}
      </span>
      <span>
        <span className="legend-dot" style={{ background: 'var(--secondary-muscle)' }} />
        {t('muscleDiagram.secondary')}
      </span>
    </div>
  );
}
