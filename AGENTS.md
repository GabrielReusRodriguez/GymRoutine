# AGENTS.md — Gym Tracker

Guía para agentes (y humanos) que trabajan en este repositorio. La fuente de verdad del producto es `SPEC.md`; este documento resume cómo se implementa.

## Qué es

SPA de registro de entrenamientos de gimnasio desplegada en Cloudflare Worker. Los datos se guardan **en el navegador** con SQLite WASM + OPFS; el servidor (Hono) solo sirve los assets. Multiusuario mediante cuentas locales con password hasheado (argon2id).

La interfaz debe ser **responsive**: la misma app, usable y legible en móvil, tablet, portátil y escritorio (SPEC §12). El móvil es el caso de uso principal.

Lee `SPEC.md` antes de cualquier cambio funcional. Si este documento y la spec discrepan, corrige el desacuerdo o pregúntalo antes de improvisar.

## Stack y comandos

| Área | Tecnología |
|---|---|
| UI | React 18 + Vite, TypeScript strict |
| Servidor | Hono en Cloudflare Worker (`src/worker/index.ts`) |
| BD | `@sqlite.org/sqlite-wasm` (VFS OPFS) + Drizzle ORM |
| Tests | Vitest |
| Gráficas | Chart.js |
| Diseño | CSS responsive mobile-first (`src/styles.css`), sin framework de UI |
| i18n | Módulo propio (`src/client/i18n`) con diccionarios tipados castellano/catalán |
| Deploy | wrangler |
| Entorno de desarrollo | devcontainer (`.devcontainer/`) con Node 22 |

Comandos esperados (crearlos en `package.json` en la fase 1 del scaffold):

```bash
npm run dev        # Vite dev server (con proxy del worker si aplica)
npm run build      # build de producción
npm run test       # Vitest
npm run deploy     # wrangler deploy
npm run typecheck  # tsc --noEmit
```

Ejecuta `typecheck` y `test` antes de dar cualquier cambio por terminado. Si el linter existe, ejecútalo antes de commitear.

### Entorno de desarrollo (devcontainer)

`.devcontainer/devcontainer.json` define un contenedor con Node 22 y los puertos 5173 (Vite) y 8787 (`wrangler dev`) reenviados. Al crearlo, `postCreateCommand` ejecuta `npm install`, así que las dependencias quedan instaladas y la app se puede ejecutar y probar íntegramente desde dentro del contenedor (VS Code / Dev Containers o `devcontainer up`). Vite se sirve con `host: true` y `strictPort: true` (`vite.config.ts`) para que el reenvío de puertos funcione.

**Node 22 es requisito real del stack**: Vite 8, Vitest 5 y Wrangler 4 no funcionan con Node 18, aunque `npm install` no falle. Si actualizas dependencias que exijan una versión mayor, actualiza también la imagen del devcontainer.

## Estructura

```
src/
├── client/            # React (todo lo visual)
│   ├── pages/         # una carpeta por pantalla de SPEC §7
│   ├── components/    # ExerciseFigure, MuscleDiagram, SeriesEditor, LanguageSwitch, ...
│   ├── hooks/         # useDb(), useSession(), queries
│   ├── i18n/          # I18nProvider/useI18n, persistencia del idioma y diccionarios es/ca
│   └── lib/           # formato de fechas/números, parseo y utilidades
├── db/
│   ├── schema.ts      # esquema Drizzle — ÚNICA fuente del modelo de datos
│   ├── migrations/    # migraciones embebidas; nunca edites una ya publicada
│   ├── repositories/  # único punto de acceso a datos; impone invariantes de SPEC §3
│   ├── seed.ts        # catálogo global inicial (idempotente)
│   └── client.ts      # apertura OPFS + lock de pestaña (una BD por navegador)
├── library/           # biblioteca embebida de ejercicios (read-only)
│   ├── data/          # dataset tipado: LibraryExercise[] + traducción catalana (strength.ca.ts)
│   ├── index.ts       # búsqueda fuzzy, filtros y localización
│   └── sprites/       # SVG: figuras de movimiento + silueta muscular
├── worker/            # Hono: solo sirve assets y /health
└── shared/            # types.ts, stats.ts, locale.ts, errors.ts, export.ts
tests/                 # Vitest
```

### Reglas de ubicación

- La UI no accede a Drizzle directamente: pasa por hooks y repositorios.
- La lógica de cálculo y los tipos compartidos viven en `src/shared/`, no en componentes.
- Los componentes no importan datos de `library/` a través de la BD: la biblioteca es contenido estático embebido.
- Ningún componente escribe texto visible directamente: usa `useI18n()` (`t`, `tError`, `dateLong`, `number`, `weight`). Los repositorios no formatean mensajes de usuario: lanzan claves de `ERROR_KEYS` envueltas en `DomainError`.

## Diseño responsive

La app ha de verse bien y funcionar igual en móvil, tablet y escritorio (SPEC §12). El móvil es el caso de uso principal, así que se diseña **mobile-first**: estilos base para pantalla pequeña y `@media (min-width: ...)` para ampliar.

- Los estilos globales viven en `src/styles.css`; no metas estilos de layout en componentes si pueden ir en una clase reutilizable.
- Breakpoints de referencia: `640px`, `900px` y `1280px`. La navegación pasa a barra inferior en ≤ 900 px y vuelve a lateral en escritorio.
- Nada de anchos fijos que desborden: contenedores fluidos, `min-width: 0` en grid/flex, `max-width: 100%` en imágenes y SVG con `viewBox`.
- Tablas anchas dentro de `.table-wrap` o convertidas en tarjetas; nunca scroll horizontal de página.
- Controles táctiles de ≥ 44 × 44 px, `inputMode` correcto y `font-size` ≥ 16 px en inputs para evitar el zoom de iOS.
- Modales y drawers a pantalla completa en móvil, con cierre por botón, `Escape` y toque fuera.
- Gráficas con `responsive: true` y `maintainAspectRatio: false`; el contenedor marca la altura.
- Usa `100dvh` y `env(safe-area-inset-*)` para las barras del navegador y los notch; nada de `100vh` a secas en pantallas principales.
- Ninguna acción puede depender solo de `hover`; el foco debe ser visible y todo debe funcionar con teclado.

Antes de dar por terminado un cambio de UI, revísalo en 320, 360, 390, 768, 1024 y 1440 px, en vertical y horizontal, con los dos idiomas. Si hay scroll horizontal, contenido cortado o una acción inalcanzable, no está terminado.

## Invariantes que no se pueden romper

1. **Aislamiento por usuario**: toda consulta a tablas de dominio filtra por el `user_id` de la sesión activa. Un repositorio que devuelva datos de otro perfil es un bug crítico.
2. **Tipos de log**: pesas ⇒ ≥1 serie con peso/reps y sin `duration_min`/`distance_km`; cardio ⇒ `duration_min` obligatorio y sin series. Se validan en repositorios y se testean.
3. **Una sesión por `(user_id, date)`**: dos entrenamientos el mismo día editan la misma sesión.
4. **`muscle_group` usa el enum `Muscle`** de `src/library/` (o el espejo en `shared/types.ts`); no texto libre.
5. **Datos locales**: no introduzcas llamadas de red que envíen datos de entrenamiento. El único tráfico permitido es la carga de assets y `/health`.
6. **Migraciones**: cambios de esquema = nueva migración + actualización de repositorios y tests. Nunca mutar el esquema sin migración.
7. **OPFS exclusivo**: solo una pestaña abre la BD. `db/client.ts` toma el lock y `db/worker.ts` es el único sitio que abre OPFS/SQLite; los cambios en cualquiera de los dos requieren pruebas de lock.
8. **Plantillas = preset, no sesión**: aplicar una plantilla solo rellena el borrador de la pantalla de sesión; nunca escribe en `sessions`/`exercise_logs`. La validación de logs sigue siendo la única puerta de guardado. Los items respetan el tipo del ejercicio (`series_count` solo en pesas; `duration_min`/`distance_km` solo en cardio) y un ejercicio referenciado por una plantilla cuenta como "en uso" para el soft-hide.
9. **Idioma**: `es.ts` es la referencia de claves y `ca.ts` se tipa contra él, así que ambos diccionarios deben tener exactamente las mismas claves (paridad verificada por TypeScript y por test). Un error de dominio nuevo exige clave en `ERROR_KEYS`, entrada en los dos diccionarios y tests que comparen con la clave. La preferencia de idioma vive en `localStorage` (global + por perfil), nunca en la BD; los datos del usuario (nombres, notas, seed del catálogo) no se traducen.
10. **Responsive**: ninguna pantalla puede provocar scroll horizontal desde 320 px, ni dejar contenido o acciones inalcanzables en móvil, tablet o escritorio. La navegación, los formularios, las tablas y las gráficas se adaptan según SPEC §12. Un layout que solo funciona en escritorio es un bug.

## Convenciones de código

- TypeScript strict, sin `any` salvo justificación en comentario.
- React: componentes función + hooks; sin clases.
- Nombres en inglés para código e identificadores; la UI se escribe en castellano y catalán a través de los diccionarios, nunca con literales en los componentes.
- Fechas y números siempre con el formateo locale-aware de `client/lib/format.ts` vía `useI18n()`.
- CSS mobile-first: primero el layout de 320 px y luego los `@media (min-width: ...)`; evita `!important`, anchos fijos y posicionamientos absolutos para estructurar la página.
- Comentarios solo para explicar el porqué.

## Git

- Commits en Conventional Commits, descripción en español imperativo: `feat(session): ...`, `fix(db): ...`, `docs: ...`.
- Un commit, un cambio lógico. No commitees `node_modules`, `dist/`, `.wrangler/` ni `.env`.
- No pushees ni abras PRs salvo petición explícita. Remoto: `origin` → `git@github.com:GabrielReusRodriguez/GymRoutine.git`.
- Ramas: `tipo/descripcion-corta` en kebab-case.

## Tests

- Repositorios se testean contra SQLite in-memory, no OPFS.
- `shared/stats.ts` (Epley, volumen, agregaciones), `library/index.ts` (búsqueda fuzzy y localización) e `i18n` tienen cobertura obligatoria.
- Cada invariante de la sección anterior tiene al menos un test que lo protege. Los tests de repositorios comprueban `ERROR_KEYS`, no textos literales.
- El invariante responsive no tiene test automático: se verifica a mano con la checklist de SPEC §12.2 (320, 360, 390, 768, 1024 y 1440 px, vertical y horizontal, dos idiomas).

## Fases de implementación

Ver `SPEC.md` §15. Trabajo en curso ordenado por fases; no adelantes una fase si la anterior no está desplegable y usable. Estado actual: **fases 1–9 completas; la fase 9 (idioma castellano/catalán) está en la rama `feat/interfaz-castellano-catalan`, pendiente de merge; la fase 10 (diseño responsive) está planificada**.
