# AGENTS.md — Gym Tracker

Guía para agentes (y humanos) que trabajan en este repositorio. La fuente de verdad del producto es `SPEC.md`; este documento resume cómo se implementa.

## Qué es

SPA de registro de entrenamientos de gimnasio desplegada en Cloudflare Worker. Los datos se guardan **en el navegador** con SQLite WASM + OPFS; el servidor (Hono) solo sirve los assets. Multiusuario mediante cuentas locales con password hasheado (argon2id).

Lee `SPEC.md` antes de cualquier cambio funcional. Si este documento y la spec discrepan, corrige el desacuerdo o pregúntalo antes de improvisar.

## Stack y comandos

| Área | Tecnología |
|---|---|
| UI | React 18 + Vite, TypeScript strict |
| Servidor | Hono en Cloudflare Worker (`src/worker/index.ts`) |
| BD | `@sqlite.org/sqlite-wasm` (VFS OPFS) + Drizzle ORM |
| Tests | Vitest |
| Gráficas | Chart.js |
| Deploy | wrangler |

Comandos esperados (crearlos en `package.json` en la fase 1 del scaffold):

```bash
npm run dev        # Vite dev server (con proxy del worker si aplica)
npm run build      # build de producción
npm run test       # Vitest
npm run deploy     # wrangler deploy
npm run typecheck  # tsc --noEmit
```

Ejecuta `typecheck` y `test` antes de dar cualquier cambio por terminado. Si el linter existe, ejecútalo antes de commitear.

## Estructura

```
src/
├── client/            # React (todo lo visual)
│   ├── pages/         # una carpeta por pantalla de SPEC §7
│   ├── components/    # ExerciseFigure, MuscleDiagram, SeriesEditor, ...
│   └── hooks/         # useDb(), useSession(), queries
├── db/
│   ├── schema.ts      # esquema Drizzle — ÚNICA fuente del modelo de datos
│   ├── migrations/    # migraciones embebidas; nunca edites una ya publicada
│   ├── repositories/  # único punto de acceso a datos; impone invariantes de SPEC §3
│   ├── seed.ts        # catálogo global inicial (idempotente)
│   └── client.ts      # apertura OPFS + lock de pestaña (una BD por navegador)
├── library/           # biblioteca embebida de ejercicios (read-only)
│   ├── data/          # dataset tipado: LibraryExercise[]
│   ├── search.ts      # búsqueda fuzzy
│   └── sprites/       # SVG: figuras de movimiento + silueta muscular
├── worker/            # Hono: solo sirve assets y /health
└── shared/            # types.ts, stats.ts (1RM Epley, volumen), export.ts
tests/                 # Vitest
```

### Reglas de ubicación

- La UI no accede a Drizzle directamente: pasa por hooks y repositorios.
- La lógica de cálculo y los tipos compartidos viven en `src/shared/`, no en componentes.
- Los componentes no importan datos de `library/` a través de la BD: la biblioteca es contenido estático embebido.

## Invariantes que no se pueden romper

1. **Aislamiento por usuario**: toda consulta a tablas de dominio filtra por el `user_id` de la sesión activa. Un repositorio que devuelva datos de otro perfil es un bug crítico.
2. **Tipos de log**: pesas ⇒ ≥1 serie con peso/reps y sin `duration_min`/`distance_km`; cardio ⇒ `duration_min` obligatorio y sin series. Se validan en repositorios y se testean.
3. **Una sesión por `(user_id, date)`**: dos entrenamientos el mismo día editan la misma sesión.
4. **`muscle_group` usa el enum `Muscle`** de `src/library/` (o el espejo en `shared/types.ts`); no texto libre.
5. **Datos locales**: no introduzcas llamadas de red que envíen datos de entrenamiento. El único tráfico permitido es la carga de assets y `/health`.
6. **Migraciones**: cambios de esquema = nueva migración + actualización de repositorios y tests. Nunca mutar el esquema sin migración.
7. **OPFS exclusivo**: solo una pestaña abre la BD. `db/client.ts` toma el lock y `db/worker.ts` es el único sitio que abre OPFS/SQLite; los cambios en cualquiera de los dos requieren pruebas de lock.
8. **Plantillas = preset, no sesión**: aplicar una plantilla solo rellena el borrador de la pantalla de sesión; nunca escribe en `sessions`/`exercise_logs`. La validación de logs sigue siendo la única puerta de guardado. Los items respetan el tipo del ejercicio (`series_count` solo en pesas; `duration_min`/`distance_km` solo en cardio) y un ejercicio referenciado por una plantilla cuenta como "en uso" para el soft-hide.

## Convenciones de código

- TypeScript strict, sin `any` salvo justificación en comentario.
- React: componentes función + hooks; sin clases.
- Nombres en inglés para código e identificadores; UI y mensajes de usuario en español.
- Comentarios solo para explicar el porqué.

## Git

- Commits en Conventional Commits, descripción en español imperativo: `feat(session): ...`, `fix(db): ...`, `docs: ...`.
- Un commit, un cambio lógico. No commitees `node_modules`, `dist/`, `.wrangler/` ni `.env`.
- No pushees ni abras PRs salvo petición explícita. El remoto aún no existe.
- Ramas: `tipo/descripcion-corta` en kebab-case.

## Tests

- Repositorios se testean contra SQLite in-memory, no OPFS.
- `shared/stats.ts` (Epley, volumen, agregaciones) y `library/search.ts` tienen cobertura obligatoria.
- Cada invariante de la sección anterior tiene al menos un test que lo protege.

## Fases de implementación

Ver `SPEC.md` §13. Trabajo en curso ordenado por fases; no adelantes una fase si la anterior no está desplegable y usable. Estado actual: **fases 1–7 completas; fase 8 (plantillas) implementada y pendiente de commit**.
