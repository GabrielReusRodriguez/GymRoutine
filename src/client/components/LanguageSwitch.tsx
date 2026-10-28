import { LOCALES, LOCALE_LABELS } from '../../shared/locale';
import { useI18n } from '../i18n';

interface Props {
  /** Sin etiqueta: solo los botones (p. ej. en la cabecera del login). */
  compact?: boolean;
}

/** Selector de idioma de la interfaz (castellano / catalán). */
export function LanguageSwitch({ compact = false }: Props) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="lang-switch" role="group" aria-label={t('settings.language')}>
      {!compact ? <span className="small muted">{t('settings.language')}</span> : null}
      {LOCALES.map((value) => (
        <button
          key={value}
          type="button"
          className={`chip ${locale === value ? 'active' : ''}`}
          onClick={() => setLocale(value)}
          aria-pressed={locale === value}
          lang={value}
        >
          {LOCALE_LABELS[value]}
        </button>
      ))}
    </div>
  );
}
