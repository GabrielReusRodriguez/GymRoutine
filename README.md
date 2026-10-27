# Gym Tracker

Aplicación web para registrar entrenamientos de gimnasio: por cada día guarda la duración de cada ejercicio de cardio y el peso y las repeticiones (por series) de cada ejercicio de pesas.

Los datos se guardan **en tu navegador** (SQLite WASM sobre OPFS). El servidor solo sirve la aplicación: no hay base de datos remota ni envío de datos de entrenamiento.

## Características

- **Multiusuario local**: varias cuentas con contraseña (argon2id) dentro del mismo navegador; cada perfil ve solo sus datos.
- **Sesiones por fecha**: cardio (minutos y distancia opcional) y pesas (N series de peso × reps).
- **Biblioteca de ~60 ejercicios de fuerza** con buscador difuso, descripción técnica, figura SVG animada del movimiento y diagrama muscular (músculos primarios y secundarios).
- **Histórico** editable por fecha y **estadísticas**: 1RM estimado (Epley), volumen semanal, minutos y kilómetros de cardio.
- **Export/import JSON** del perfil (única copia de seguridad posible).

## Stack

React 18 + Vite · Hono en Cloudflare Workers · SQLite WASM (`@sqlite.org/sqlite-wasm`) con VFS OPFS · Drizzle ORM (driver `sqlite-proxy`) · Chart.js · Vitest.

La especificación completa está en [`SPEC.md`](./SPEC.md) y las reglas de contribución en [`AGENTS.md`](./AGENTS.md).

## Requisitos

- Node 18 o superior (el paquete `@sqlite.org/sqlite-wasm` avisa de que su tooling pide Node 22; el binario funciona igual en el navegador).
- Navegador moderno con OPFS (Chrome/Edge 86+, Firefox 111+, Safari 15.2+) y contexto seguro (`localhost` o HTTPS).

## Puesta en marcha

```bash
npm install
npm run dev        # http://localhost:5173
```

`predev` copia `sqlite3.wasm` desde `node_modules` a `public/`.

Otros comandos:

```bash
npm run typecheck  # tsc --noEmit
npm test           # Vitest (repositorios con sql.js en memoria, stats y buscador)
npm run build      # typecheck + build de la SPA en dist/client
npm run deploy     # build + wrangler deploy
```

## Arquitectura

```
UI (React) ──> hooks de datos ──> repositorios (Drizzle) ──> ejecutor ──postMessage──> worker (sqlite-wasm / OPFS)
                                     └── invariantes de dominio
Worker (Hono) ── sirve dist/client + /health
```

- `src/db/schema.ts`: esquema Drizzle, única fuente del modelo.
- `src/db/migrations/`: migraciones embebidas aplicadas con `PRAGMA user_version`.
- `src/db/repositories/`: acceso a datos y reglas (aislamiento por usuario, validación cardio/pesas, upsert por fecha, backups).
- `src/db/client.ts`: lock de pestaña con Web Locks y ejecutor que habla con el worker.
- `src/db/worker.ts`: dedicated worker que posee SQLite (migraciones, seed y consultas). El VFS `opfs-sahpool` necesita `createSyncAccessHandle`, disponible solo en workers.
- `src/library/`: biblioteca embebida (dataset + búsqueda + sprites SVG).
- `src/shared/`: tipos, cálculos estadísticos y validación de backups.
- `src/worker/`: Hono.

### Modelo de datos

`users`, `exercises` (globales con `user_id NULL`), `sessions` (única por usuario y fecha), `exercise_logs` (cardio o pesas), `series` (peso/reps por serie).

Los invariantes se validan en los repositorios: un log de pesas necesita ≥1 serie y no admite duración; uno de cardio exige minutos y no admite series; todas las consultas filtran por `user_id`.

## Despliegue en Cloudflare

```bash
npm run deploy
```

`wrangler.toml` publica la SPA como assets con fallback a `index.html` y ejecuta el Worker para `/health` y `/api/sync` (reservado).

## Limitaciones conocidas

- **Una pestaña a la vez**: el VFS OPFS es exclusivo; la segunda pestaña muestra un aviso con reintento.
- **Sin sincronización entre dispositivos**: móvil y ordenador mantienen bases de datos independientes. Usa export/import para mover datos.
- **Sin recuperación de contraseña**: no existe servidor; perder la contraseña de un perfil local implica perder el acceso a ese perfil.
- `POST /api/sync` devuelve 501 a propósito (hook futuro para D1).

## Tests

```bash
npm test
```

Cubren: autenticación y aislamiento entre usuarios, invariantes de sesiones, soft-hide de ejercicios en uso, upsert por fecha, export/import, fórmulas de estadísticas y búsqueda en la biblioteca.
