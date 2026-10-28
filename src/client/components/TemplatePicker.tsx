import { useEffect } from 'react';
import type { TemplateSummary } from '../../shared/types';
import { useI18n } from '../i18n';
import { IconChevron, IconX } from './Icons';

interface Props {
  templates: TemplateSummary[];
  onPick: (templateId: number) => void;
  onClose: () => void;
}

/** Modal para cargar una plantilla en la sesión abierta. */
export function TemplatePicker({ templates, onPick, onClose }: Props) {
  const { t, plural } = useI18n();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>{t('templatePicker.title')}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label={t('common.close')}>
            <IconX />
          </button>
        </div>

        <div className="modal-body">
          {templates.length === 0 ? (
            <p className="muted small" style={{ padding: 18, textAlign: 'center' }}>
              {t('templatePicker.empty')}
            </p>
          ) : (
            <div style={{ maxHeight: '52vh', overflow: 'auto' }}>
              {templates.map((template) => (
                <button
                  key={template.id}
                  className="picker-row"
                  onClick={() => onPick(template.id)}
                >
                  <span>
                    <strong style={{ fontWeight: 550 }}>{template.name}</strong>
                    <span className="dim small" style={{ marginLeft: 8 }}>
                      {plural(template.itemCount, t('common.exercise'), t('common.exercises'))}
                    </span>
                  </span>
                  <IconChevron width={15} height={15} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
