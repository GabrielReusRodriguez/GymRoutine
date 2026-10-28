import { useRef, useState, type FormEvent } from 'react';
import { backupFileName, parseBackup } from '../../shared/export';
import { exportUserData, importUserData } from '../../db/repositories/backup';
import { changePassword, deleteUser } from '../../db/repositories/users';
import { useAuth } from '../hooks/useAuth';
import { useDbHandle } from '../hooks/useDb';
import { useI18n } from '../i18n';
import { IconDownload, IconUpload } from '../components/Icons';
import { LanguageSwitch } from '../components/LanguageSwitch';

export function SettingsPage() {
  const { user, logout } = useAuth();
  const handle = useDbHandle();
  const { t, tError } = useI18n();

  const fileInput = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [dataMessage, setDataMessage] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const exportData = async () => {
    setDataError(null);
    setDataMessage(null);
    setBusy(true);
    try {
      const backup = await exportUserData(handle, user!.id);
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = backupFileName();
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setDataMessage(t('settings.exported'));
    } catch (cause) {
      setDataError(tError(cause));
    } finally {
      setBusy(false);
    }
  };

  const importData = async (file: File) => {
    setDataError(null);
    setDataMessage(null);
    setBusy(true);
    try {
      const raw = await file.text();
      const backup = parseBackup(raw);

      const confirmed = window.confirm(
        t('settings.importConfirm', {
          name: user!.name,
          sessions: backup.sessions.length,
          templates: backup.templates?.length ?? 0,
        }),
      );
      if (!confirmed) return;

      await importUserData(handle, user!.id, backup);
      setDataMessage(
        t('settings.imported', {
          sessions: backup.sessions.length,
          templates: backup.templates?.length ?? 0,
        }),
      );
      window.setTimeout(() => window.location.reload(), 900);
    } catch (cause) {
      setDataError(tError(cause));
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordError(t('settings.passwordMismatch'));
      return;
    }

    setBusy(true);
    try {
      await changePassword(handle, user!.id, currentPassword, newPassword);
      setPasswordMessage(t('settings.passwordUpdated'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (cause) {
      setPasswordError(tError(cause));
    } finally {
      setBusy(false);
    }
  };

  const removeProfile = async () => {
    if (!window.confirm(t('settings.deleteConfirm', { email: user!.email }))) {
      return;
    }
    if (!window.confirm(t('settings.deleteFinal'))) {
      return;
    }

    try {
      await deleteUser(handle, user!.id);
      logout();
    } catch (cause) {
      window.alert(tError(cause));
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">{t('settings.eyebrow')}</div>
          <h1>{t('settings.title')}</h1>
          <p>
            {user!.name} · {user!.email}
          </p>
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <h2>{t('settings.language')}</h2>
        <p className="muted small" style={{ marginTop: 4, marginBottom: 14 }}>
          {t('settings.languageHelp')}
        </p>
        <LanguageSwitch />
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="card card-pad">
          <h2>{t('settings.backupTitle')}</h2>
          <p className="muted small" style={{ marginTop: 4, marginBottom: 14 }}>
            {t('settings.backupHelp')}
          </p>

          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-primary" onClick={exportData} disabled={busy}>
              <IconDownload /> {t('settings.export')}
            </button>
            <button className="btn" onClick={() => fileInput.current?.click()} disabled={busy}>
              <IconUpload /> {t('settings.import')}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importData(file);
              }}
            />
          </div>

          <p className="dim small" style={{ marginTop: 12 }}>
            {t('settings.importReplaces')}
          </p>

          {dataMessage ? <div className="alert alert-success" style={{ marginTop: 12 }}>{dataMessage}</div> : null}
          {dataError ? <div className="alert" style={{ marginTop: 12 }}>{dataError}</div> : null}
        </div>

        <div className="card card-pad">
          <h2>{t('settings.passwordTitle')}</h2>
          <form className="stack" style={{ marginTop: 12 }} onSubmit={submitPassword}>
            <div className="field">
              <label htmlFor="current-password">{t('settings.currentPassword')}</label>
              <input
                id="current-password"
                className="input"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="new-password">{t('settings.newPassword')}</label>
              <input
                id="new-password"
                className="input"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="confirm-password">{t('settings.repeatPassword')}</label>
              <input
                id="confirm-password"
                className="input"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>

            {passwordError ? <div className="alert">{passwordError}</div> : null}
            {passwordMessage ? <div className="alert alert-success">{passwordMessage}</div> : null}

            <button className="btn" type="submit" disabled={busy}>
              {t('settings.updatePassword')}
            </button>
          </form>
        </div>
      </div>

      <div className="card card-pad" style={{ marginTop: 16, borderColor: 'rgba(255,107,107,0.25)' }}>
        <h2>{t('settings.dangerTitle')}</h2>
        <p className="muted small" style={{ marginTop: 4, marginBottom: 14 }}>
          {t('settings.dangerHelp')}
        </p>
        <button className="btn btn-danger" onClick={removeProfile}>
          {t('settings.deleteProfile')}
        </button>
      </div>
    </>
  );
}
