import { useRef, useState, type FormEvent } from 'react';
import { backupFileName, parseBackup } from '../../shared/export';
import { exportUserData, importUserData } from '../../db/repositories/backup';
import { changePassword, deleteUser } from '../../db/repositories/users';
import { useAuth } from '../hooks/useAuth';
import { useDbHandle } from '../hooks/useDb';
import { IconDownload, IconUpload } from '../components/Icons';

export function SettingsPage() {
  const { user, logout } = useAuth();
  const handle = useDbHandle();

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
      setDataMessage('Copia de seguridad descargada.');
    } catch (cause) {
      setDataError(cause instanceof Error ? cause.message : String(cause));
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
        `Se reemplazarán TODOS los datos de ${user!.name} por los de la copia (${backup.sessions.length} sesiones, ${backup.templates?.length ?? 0} plantillas). Esta acción no se puede deshacer. ¿Continuar?`,
      );
      if (!confirmed) return;

      await importUserData(handle, user!.id, backup);
      setDataMessage(
        `Importadas ${backup.sessions.length} sesiones y ${backup.templates?.length ?? 0} plantillas. Recargando…`,
      );
      window.setTimeout(() => window.location.reload(), 900);
    } catch (cause) {
      setDataError(cause instanceof Error ? cause.message : String(cause));
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
      setPasswordError('La confirmación no coincide.');
      return;
    }

    setBusy(true);
    try {
      await changePassword(handle, user!.id, currentPassword, newPassword);
      setPasswordMessage('Contraseña actualizada.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (cause) {
      setPasswordError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  const removeProfile = async () => {
    if (
      !window.confirm(
        `Se borrarán la cuenta ${user!.email} y todos sus entrenamientos de este navegador. ¿Continuar?`,
      )
    ) {
      return;
    }
    if (!window.confirm('Última confirmación: esta acción es irreversible. ¿Borrar el perfil?')) {
      return;
    }

    try {
      await deleteUser(handle, user!.id);
      logout();
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Ajustes</div>
          <h1>Tu cuenta y tus datos</h1>
          <p>
            {user!.name} · {user!.email}
          </p>
        </div>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="card card-pad">
          <h2>Copia de seguridad</h2>
          <p className="muted small" style={{ marginTop: 4, marginBottom: 14 }}>
            Tus datos solo existen en este navegador. Exporta un JSON con regularidad: es la única
            forma de recuperarlos si borras los datos del navegador o cambias de dispositivo.
          </p>

          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-primary" onClick={exportData} disabled={busy}>
              <IconDownload /> Exportar JSON
            </button>
            <button className="btn" onClick={() => fileInput.current?.click()} disabled={busy}>
              <IconUpload /> Importar JSON
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
            La importación reemplaza los datos del perfil activo (no hace merge).
          </p>

          {dataMessage ? <div className="alert alert-success" style={{ marginTop: 12 }}>{dataMessage}</div> : null}
          {dataError ? <div className="alert" style={{ marginTop: 12 }}>{dataError}</div> : null}
        </div>

        <div className="card card-pad">
          <h2>Cambiar contraseña</h2>
          <form className="stack" style={{ marginTop: 12 }} onSubmit={submitPassword}>
            <div className="field">
              <label htmlFor="current-password">Contraseña actual</label>
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
              <label htmlFor="new-password">Nueva contraseña</label>
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
              <label htmlFor="confirm-password">Repite la nueva contraseña</label>
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
              Actualizar contraseña
            </button>
          </form>
        </div>
      </div>

      <div className="card card-pad" style={{ marginTop: 16, borderColor: 'rgba(255,107,107,0.25)' }}>
        <h2>Zona de peligro</h2>
        <p className="muted small" style={{ marginTop: 4, marginBottom: 14 }}>
          Borrar el perfil elimina la cuenta y todos sus entrenamientos de este navegador. El
          catálogo global se conserva. No hay vuelta atrás sin una copia de seguridad.
        </p>
        <button className="btn btn-danger" onClick={removeProfile}>
          Borrar mi perfil y mis datos
        </button>
      </div>
    </>
  );
}
