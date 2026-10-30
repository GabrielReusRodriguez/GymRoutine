# Gym Tracker — Especificación técnica

**Versión:** 2.5 · **Fecha:** 2026-10-30 · **Estado:** implementada (fases 1–10 en `main`); reordenar ejercicios arrastrando (fase 11) validada en la rama `feat/reordenar-ejercicios-arrastrando`, pendiente de merge

Aplicación web para registrar entrenamientos de gimnasio: por cada día de entrenamiento se guarda la duración de cada ejercicio de cardio y el peso y las repeticiones (por series) de cada ejercicio de pesas. Desplegada en Cloudflare, con persistencia local en el navegador mediante SQLite WASM + OPFS y multiusuario mediante cuentas locales con contraseña.

---

## 1. Decisiones de diseño (resumen)

| Decisión | Elección | Justificación |
|---|---|---|
| Despliegue | Cloudflare Worker + assets estáticos | Sin servidores que mantener, cold starts nulos |
| Backend | Hono (TypeScript), mínimo | Solo sirve la SPA; sin lógica de negocio en v1 |
| Persistencia | SQLite WASM (`@sqlite.org/sqlite-wasm`) + VFS OPFS | Datos locales, funcionan offline, sin BD remota |
| Multiusuario | Cuentas locales con password (argon2id) | Cada perfil, dentro de la BD del navegador, ve solo sus datos |
| UI | React 18 + Vite (SPA) | Formularios dinámicos de series, ecosistema amplio |
| ORM | Drizzle ORM (driver sqlite-wasm) | Tipado + migraciones |
| Contenido de ejercicios | Catálogo embebido (~60–80 ejercicios de fuerza) | Offline, sin API keys, mantenible |
| Media del catálogo | SVG (figura del movimiento + diagrama muscular) | Ligero, offline, estilo consistente |
| Idioma de la interfaz | Castellano (por defecto) y catalán, conmutables; entrada forzada con `?lang=es\|ca` | Preferencia por perfil en `localStorage` + parámetro de URL, sin dependencias |
| Diseño de interfaz | Responsive mobile-first, de 320 px a escritorio | Se usa en el móvil durante el entrenamiento y en escritorio para análisis |

### Consecuencias aceptadas
- **Los datos viven en el navegador**: cada navegador/dispositivo tiene su propia BD. No hay sync multi-dispositivo en v1; el export/import JSON es el puente manual.
- Si el usuario limpia los datos del navegador, pierde todo → el export JSON es obligatorio y visible en Ajustes.
- La BD en OPFS requiere contexto seguro (HTTPS — Cloudflare lo garantiza) y acceso exclusivo: **solo una pestaña puede tener la BD abierta** a la vez.

---

## 2. Stack

| Capa | Tecnología |
|---|---|
| UI | React 18 + Vite (SPA compilada a estáticos) |
| Servidor | Hono en Cloudflare Worker, binding `assets`, sirve la SPA |
| BD | `@sqlite.org/sqlite-wasm` con VFS OPFS (persistente) |
| ORM | Drizzle ORM (driver sqlite-wasm) + migraciones embebidas |
| Auth | Hash `argon2id` (WASM) del password; sesión activa en memoria + `localStorage` |
| Gráficas | Chart.js (CDN) |
| i18n | Módulo propio `client/i18n` con diccionarios tipados (`es`, `ca`) | Sin dependencias nuevas; interfaz y errores en el idioma activo |
| Tests | Vitest (repositorios sobre SQLite in-memory; lógica de stats; búsqueda fuzzy; i18n) |
| Entorno | devcontainer (`.devcontainer/`) con Node 22 y dependencias instaladas | Node 22 es requisito real de Vite 8, Vitest 5 y Wrangler 4 |

### 2.1 Entorno de desarrollo

El repo incluye `.devcontainer/devcontainer.json` con la imagen `mcr.microsoft.com/devcontainers/typescript-node:22`. `postCreateCommand` ejecuta `npm install`, así que el proyecto se ejecuta y se prueba íntegramente dentro del contenedor: `npm run dev` (puerto 5173), `npm run worker:dev` (puerto 8787), `npm run test` y `npm run typecheck`. Vite se sirve con `host: true` y `strictPort: true` para que el reenvío de puertos funcione. No hace falta instalar Node ni dependencias en el host; con Node 18 `npm install` funciona pero Vite 8, Vitest 5 y Wrangler 4 no arrancan.

---

## 3. Modelo de datos

```sql
users(
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

exercises(
  id INTEGER PRIMARY KEY,
  user_id INTEGER NULL REFERENCES users(id) ON DELETE CASCADE, -- NULL = catálogo global (seed)
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cardio','weights')),
  muscle_group TEXT NOT NULL,        -- enum Muscle de la biblioteca (sección 6)
  library_id TEXT NULL,              -- enlace opcional a la biblioteca embebida
  notes TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, name)
);

sessions(
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,                -- ISO yyyy-mm-dd, una sesión por día
  notes TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, date)
);

exercise_logs(
  id INTEGER PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  "order" INTEGER NOT NULL,          -- orden dentro de la sesión
  duration_min REAL NULL,            -- solo cardio
  distance_km REAL NULL              -- solo cardio (opcional)
);

series(
  id INTEGER PRIMARY KEY,
  exercise_log_id INTEGER NOT NULL REFERENCES exercise_logs(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  weight_kg REAL NULL,
  reps INTEGER NULL
);

templates(
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                -- único por usuario
  notes TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, name)
);

template_items(
  id INTEGER PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  "order" INTEGER NOT NULL,
  series_count INTEGER NULL,         -- solo pesas: filas a precrear
  default_weight_kg REAL NULL,       -- solo pesas: reserva si no hay historial
  default_reps INTEGER NULL,         -- solo pesas
  duration_min REAL NULL,            -- solo cardio
  distance_km REAL NULL              -- solo cardio
);
```

### Invariantes (a nivel de repositorio, cubiertos por tests)
- Log de **pesas**: `type` del ejercicio referenciado es `weights` ⇒ tiene ≥1 serie con peso y/o reps; no puede tener `duration_min` ni `distance_km`.
- Log de **cardio**: `type` es `cardio` ⇒ `duration_min` obligatorio, `distance_km` opcional, sin series asociadas.
- Todo acceso a datos filtra por el `user_id` de la sesión activa (véase sección 5).
- Una sesión por `(user_id, date)`: si el usuario va dos veces el mismo día, edita la misma sesión.
- Borrado de un ejercicio del catálogo global solo si ningún log lo usa; si está en uso, soft-hide.
- `muscle_group` referencia el enum `Muscle` de la biblioteca (sección 6), no texto libre.
- **Plantillas**: `series_count` solo en items de pesas (≥1) y `duration_min`/`distance_km` solo en items de cardio; un ejercicio no se repite dentro de la misma plantilla y el nombre es único por usuario. Aplicar una plantilla **no escribe en `sessions`**: solo rellena el borrador de la pantalla de sesión, así que la validación de logs sigue siendo la única puerta de guardado. Una plantilla que referencia un ejercicio cuenta como uso: ese ejercicio se oculta, no se borra.

---

## 4. Arquitectura client-side

```
UI (React) ──> hooks (sesión activa, queries) ──> Repositories (Drizzle)
                                             ──> sqlite-wasm / OPFS
```

- `src/db/client.ts`: abre OPFS, ejecuta las migraciones embebidas y expone la instancia única de BD. La BD se abre tras el login de un perfil (una BD local compartida, filas aisladas por `user_id`).
- **Lock de pestaña**: el VFS OPFS exclusivo solo admite un propietario. Si otra pestaña ya tiene la BD abierta, la nueva muestra una pantalla "La app está abierta en otra pestaña".
- **Seed idempotente** al primer arranque: catálogo global de ejercicios (cardio: cinta, bici estática, elíptica, remo, natación, escalador…; pesas: sentadilla, press banca, peso muerto, press militar, remo con barra, jalón al pecho, curl de bíceps, extensión de tríceps, prensa, elevaciones laterales, etc.), derivado de la biblioteca embebida.

---

## 5. Auth local

- **Registro**: email + nombre + password. El password se hashea con `argon2id` (WASM); nunca se guarda en claro.
- **Login**: verificación del hash; la sesión activa (id de usuario) se mantiene en memoria + `localStorage` para restaurar al recargar.
- **Cuentas múltiples** en la misma BD local: todas las tablas de dominio llevan `user_id`; los repositorios imponen el filtro automáticamente.
- **Cambiar password** disponible en Ajustes.
- No hay recuperación de contraseña (no existe servidor): se documenta en la UI que perder el password del perfil local impide entrar a ese perfil.

---

## 6. Biblioteca de ejercicios de fuerza

Pantalla de ayuda/consulta con buscador, descripción técnica, figura animada del movimiento y musculatura trabajada.

### 6.1 Contenido embebido
Módulo `src/library/` con un dataset TypeScript tipado compilado dentro del bundle (contenido de solo lectura; no se guarda en la BD local). **~60–80 ejercicios de fuerza** curados, agrupados por patrón de movimiento.

```ts
type Muscle =
  | 'pectorales' | 'deltoides-anterior' | 'deltoides-lateral' | 'deltoides-posterior'
  | 'biceps' | 'triceps' | 'antebrazo' | 'recto-abdominal' | 'oblicuos'
  | 'erectores' | 'gluteo' | 'cuadriceps' | 'isquios' | 'gemelo'
  | 'trapecio' | 'dorsal' | 'aductores';

interface LibraryExercise {
  id: string;                 // 'barbell-bench-press'
  name: string;
  aliases: string[];          // para el buscador: 'press banca', 'banca'
  pattern: 'push' | 'pull' | 'squat' | 'hinge' | 'carry' | 'core';
  equipment: 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'kettlebell';
  description: string;        // técnica paso a paso (3–6 pasos) + errores comunes
  primaryMuscles: Muscle[];   // se resaltan en rojo
  secondaryMuscles: Muscle[]; // se resaltan en naranja
  media: {
    figure: string;           // id del SVG esquemático del movimiento (poses inicio/fin)
    tips?: string[];          // cues de ejecución
  };
}
```

El enum `Muscle` es el mismo vocabulario del campo `muscle_group` de `exercises` → buscador, catálogo personal y estadísticas comparten terminología.

**Contenido por idioma**: el dataset castellano es la fuente de los metadatos tipados (id, patrón, material, músculos, figura). `data/strength.ca.ts` aporta el contenido textual catalán indexado por `id` (nombre, alias, descripción y consejos). `localizeExercise()` fusiona ambas capas; los alias de los dos idiomas alimentan el buscador. Los datos ya guardados (seed del catálogo, sesiones y plantillas) no se traducen ni se migran: son datos del usuario.

### 6.2 Buscador
- Input con **búsqueda fuzzy** sobre nombre + aliases + músculos + equipamiento (`match-sorter` o scoring propio, sin dependencias pesadas). Busca en el idioma activo (y en los alias originales) y también por las etiquetas traducidas de músculo y material.
- Filtros facetados: patrón, equipamiento, músculo.
- Resultados en grid de cards: figura SVG + músculos primarios como chips.

### 6.3 Detalle del ejercicio
1. **Figura SVG animada**: dos poses (inicio/fin) con transición CSS en loop — representa la trayectoria del movimiento sin GIFs. Componente `<ExerciseFigure id/>` parametrizado sobre un sprite SVG embebido.
2. **Diagrama muscular**: silueta corporal SVG (frontal + dorsal) con un `<path>` por región muscular, coloreada vía CSS custom properties según `primaryMuscles` (rojo) / `secondaryMuscles` (naranja). Componente `<MuscleDiagram muscles/>` reutilizable.
3. Descripción técnica paso a paso, errores comunes y cues.
4. Botón **"Añadir a mi sesión de hoy"** → preselecciona el ejercicio en la pantalla de sesión (integración con sección 7.2).

### 6.4 Integración con el resto de la app
- **Pantalla de sesión**: cada log muestra un icono ℹ️ que abre la ficha de la biblioteca en un drawer (si el ejercicio tiene `library_id`).
- **Seed del catálogo global**: se generan entradas de `exercises` derivadas de la biblioteca, de modo que los ejercicios de la biblioteca ya estén disponibles para registrar desde el primer arranque.
- **Ejercicios propios**: el usuario puede crear ejercicios sin vínculo a la biblioteca (eligen `Muscle` de la lista).

---

## 7. Pantallas (React Router)

1. **Login / registro** — contra la BD local; cambiar password incluido.
2. **Sesión de hoy / editar sesión** — añadir ejercicios del catálogo (buscador, filtrable por tipo y grupo muscular); cada log renderiza su formulario según tipo:
   - Cardio: minutos + distancia opcional.
   - Pesas: filas de series (peso × reps) con botones añadir/quitar serie.
   - Icono ℹ️ por ejercicio → ficha de la biblioteca en drawer.
   - **Reordenar ejercicios**: arrastrando la tarjeta desde el asa (pointer events, ratón y táctil) o con los botones ↑/↓. El orden se guarda en `exercise_logs.order` al guardar la sesión.
   - **Cargar plantilla** (modal con las plantillas del usuario) y **guardar como plantilla** (captura los ejercicios y series actuales).
3. **Plantillas** — CRUD de plantillas de sesión: crear desde cero, editar, duplicar, reordenar items y borrar. Los items se reordenan arrastrando la tarjeta desde el asa o con los botones ↑/↓; el orden se persiste en `template_items.order`. Cada item guarda el número de series (pesas) o la duración/distancia (cardio) como preset. «Aplicar a hoy» navega a `/session?template=<id>`.
4. **Histórico** — lista por fecha descendente, expandible, editar/borrar.
5. **Catálogo** — CRUD de ejercicios propios; los globales no se borran (soft-hide).
6. **Biblioteca** — buscador + detalle (sección 6).
7. **Estadísticas** — véase sección 8.
8. **Ajustes** — export/import JSON, cambiar password, borrar perfil y elegir el idioma de la interfaz.

Todas las pantallas cumplen la sección 12. En concreto:

- **Sesión**: en móvil cada ejercicio es una tarjeta y las series se apilan; la barra de acciones de guardado queda por encima de la navegación inferior y nunca tapa campos.
- **Plantillas y catálogo**: el editor y el selector de ejercicios ocupan la pantalla completa en móvil; las filas de acciones se envuelven sin desbordar.
- **Histórico y estadísticas**: las tablas se desplazan dentro de su contenedor o se convierten en tarjetas; las gráficas ocupan el ancho disponible con altura relativa.
- **Biblioteca**: la rejilla de ejercicios pasa de una columna en móvil a varias en tablet y escritorio; la ficha y el drawer se abren a pantalla completa en móvil.
- **Login y ajustes**: formularios de una columna con controles de tamaño táctil y sin zoom automático en iOS.

### 7.1 Comportamiento de las plantillas

- **Aplicar** fusiona los items en el borrador de la sesión abierta (cualquier fecha), sin duplicar ejercicios ya presentes y sin perder lo ya escrito.
- **Prellenado**: cada ejercicio de pesas toma las series de su último registro del usuario (serie 1..N; si hubo menos, repite la última); si no hay historial se usan los valores por defecto de la plantilla y, si tampoco, filas vacías. El cardio toma la última duración/distancia.
- Un ejercicio borrado del catálogo se omite al aplicar y se informa al usuario.
- Guardar la plantilla no requiere que la sesión sea válida: se puede plantillar un día a medio rellenar.

---

## 8. Estadísticas (v1)

- **Pesas**:
  - 1RM estimado por ejercicio y serie: **Epley** `1RM = w × (1 + reps/30)`.
  - Evolución del mejor peso por serie a lo largo del tiempo.
  - Volumen semanal: `Σ (peso × reps)` por semana.
- **Cardio**: duración total y distancia por semana/mes.
- Filtro por rango de fechas; gráficas con Chart.js.
- La lógica de cálculo vive en `src/shared/stats.ts` (framework-agnóstica, testeada con Vitest).

---

## 9. Worker (mínimo)

```ts
// src/worker/index.ts
import { Hono } from 'hono';

const app = new Hono();

app.get('/health', (c) => c.text('ok'));

// Fallback SPA: cualquier ruta no-estática devuelve index.html
app.notFound((c) => c.html(ASSETS.fetch(new Request(origin + '/index.html'))));

export default { fetch: app.fetch };
```

- Sin lógica de negocio en v1: la app funciona íntegramente en el cliente.
- Endpoint `POST /api/sync` **reservado** (documentado, no implementado) como hook futuro si se migra a D1.

---

## 10. Export / import

- **Export JSON**: descarga un archivo con toda la BD del perfil activo (ejercicios, sesiones, logs, series y plantillas). Obligatorio y visible en Ajustes: es la única copia de seguridad posible al ser datos locales.
- **Import JSON**: restaura datos, con resolución "reemplazar perfil" en v1 (sin merge). Acepta `version: 1` (sin plantillas) y `version: 2`; los items de plantilla se resuelven por nombre de ejercicio, igual que los logs.

---

## 11. Idioma de la interfaz

La UI está disponible en **castellano** (por defecto) y **catalán**. El cambio es inmediato, sin recarga.

- **Parámetro de URL**: cualquier ruta acepta `?lang=es` o `?lang=ca` (sin importar la capitalización, p. ej. `/?lang=CA`). Si el valor es válido gana sobre cualquier otra fuente, se aplica también en la pantalla de login, se persiste como preferencia (global y del perfil si hay sesión) y se retira de la barra de direcciones con `history.replaceState`. Si falta o no es un idioma soportado (`?lang=fr`) se ignora. Sirve para compartir un enlace en un idioma concreto.
- **Preferencia**: `localStorage` (no hay columna en la BD porque es una preferencia de dispositivo, no un dato de entrenamiento).
  - `gym-tracker.locale`: último idioma elegido (incluye la pantalla de login y el último `?lang=` aplicado).
  - `gym-tracker.locales`: mapa `{ [userId]: Locale }` para recordar el idioma de cada perfil.
- **Resolución** al cargar y al entrar/salir de un perfil: parámetro `?lang=` de la URL → idioma del perfil → idioma global → primer idioma del navegador que sea `ca` → castellano.
- **Diccionarios**: `src/client/i18n/messages/es.ts` (referencia de claves) y `ca.ts`, tipado como la misma forma con valores `string`. TypeScript exige paridad exacta: una clave de menos o de más no compila. `t('grupo.clave', vars)` interpola `{placeholders}`.
- **Errores de dominio**: los repositorios y el validador de backups lanzan `DomainError` con una clave de `ERROR_KEYS` (`src/shared/errors.ts`) y variables opcionales. La UI los pinta con `tError()`; nunca se muestra la clave en bruto. Los tests comparan con `ERROR_KEYS`.
- **Fechas y números**: `Intl` con `es-ES` / `ca-ES` mediante `dateLong`, `dateShort`, `number` y `weight` de `useI18n()`.
- **Biblioteca**: ver §6.1. El selector de idioma (`LanguageSwitch`) está en Ajustes, en el login y en la barra lateral.
- **Fuera de alcance**: más idiomas, traducción automática y traducción de textos libres escritos por el usuario (notas, nombres de plantillas).

---

## 12. Diseño responsive y multi-dispositivo

La aplicación debe ser **responsive**: una sola base de código y la misma funcionalidad en móvil, tablet, portátil y escritorio. El móvil es el caso de uso principal (registrar y consultar durante el entrenamiento), así que el diseño parte de la pantalla pequeña y se amplía con breakpoints; nunca al revés.

### 12.1 Requisitos

- **Rango soportado**: desde 320 px de ancho (móvil pequeño en vertical) hasta 1920 px o más, en vertical y horizontal, y con zoom del navegador hasta el 200 % sin perder contenido ni funcionalidad.
- **Sin scroll horizontal**: ninguna pantalla provoca desplazamiento horizontal de la página en ningún ancho soportado. Las tablas anchas se desplazan dentro de su propio contenedor o se convierten en tarjetas.
- **Mobile-first**: los estilos base son los de móvil y los breakpoints solo añaden espacio y columnas. Breakpoints de referencia: `640px` (móvil grande), `900px` (tablet) y `1280px` (escritorio). Los valores exactos pueden ajustarse, pero no puede haber saltos de layout entre ellos.
- **Navegación adaptable**: en pantallas estrechas (≤ 900 px) la barra lateral se convierte en barra inferior con los siete destinos accesibles, icono + etiqueta y respeto de `env(safe-area-inset-bottom)`. En escritorio vuelve a ser lateral y fija.
- **Formularios táctiles**: controles con área táctil ≥ 44 × 44 px, separación suficiente entre acciones destructivas y de guardado, `inputMode` adecuado (`decimal` para peso/distancia, `numeric` para reps/series) y `font-size` ≥ 16 px en los inputs para evitar el zoom automático de iOS.
- **Tablas y listas**: las series de pesas (`peso × reps`) se apilan en tarjetas legibles cuando no caben en columnas; el histórico, el catálogo y las estadísticas conservan todas sus columnas accesibles.
- **Modales y drawers**: a pantalla completa en móvil, con cierre por botón, tecla `Escape` y toque fuera; el fondo no hace scroll mientras están abiertos.
- **Gráficas**: Chart.js con `responsive: true` y `maintainAspectRatio: false`; ejes y leyendas legibles en 320 px y contenedores con altura relativa.
- **Contenido gráfico**: SVG con `viewBox` y `width: 100%`; ninguna imagen o figura con ancho fijo que desborde.
- **Tipografía y espaciado**: escalado fluido (`clamp()`) para títulos, sin anchos fijos en `px` para contenedores principales y `min-width: 0` en elementos de grid/flex para permitir el encogido.
- **Altura móvil**: uso de `100dvh` (con fallback) para que las barras del navegador móvil no recorten la interfaz.
- **Accesibilidad táctil y teclado**: ninguna acción depende solo de `hover`; foco visible; todo se puede completar con teclado y con lector de pantalla tanto en móvil como en escritorio. Reordenar ejercicios (sesión y plantillas) tiene doble vía: arrastrar la tarjeta desde el asa de arrastre (pointer events, válido con ratón y con el dedo) o usar los botones ↑/↓, que cubren el teclado.
- **Sin dependencias nuevas**: el responsive se resuelve con CSS y los componentes existentes; no se introduce un framework de UI solo para esto.

### 12.2 Verificación

Cada cambio de interfaz se revisa, como mínimo, en anchos de **320, 360, 390, 768, 1024 y 1440 px**, en orientación vertical y horizontal, con los dos idiomas y con texto ampliado. La comprobación incluye: no hay scroll horizontal, no hay contenido cortado, todas las acciones son alcanzables y las gráficas no desbordan. Esta revisión es manual y forma parte de la definición de «terminado»; no hay tests automáticos de layout.

### 12.3 Fuera de alcance

- App nativa, PWA instalable y gestos específicos de plataforma.
- Diseño distinto por dispositivo: la funcionalidad y la estructura son las mismas; solo cambia la disposición.
- Soporte de navegadores sin CSS moderno (grid, `clamp()`, `dvh`) más allá de las dos últimas versiones de los navegadores mayoritarios.

---

## 13. Fuera de alcance v1

- Sincronización multi-dispositivo / servidor de datos (D1).
- Cronómetro integrado.
- Recuperación de contraseña (no existe servidor).
- PWA instalable / app móvil.
- Más idiomas además del castellano y el catalán.

---

## 14. Estructura del repo

```
gym/
├── .devcontainer/         # entorno de desarrollo (Node 22 + dependencias)
├── src/
│   ├── client/            # React
│   │   ├── pages/         # una carpeta por pantalla (sección 7)
│   │   ├── components/    # ExerciseFigure.tsx, MuscleDiagram.tsx, SeriesEditor.tsx, DragHandle.tsx, ...
│   │   ├── hooks/         # useDb(), useSession(), useDragReorder(), queries
│   │   ├── i18n/          # provider, persistencia del idioma y diccionarios es/ca
│   │   └── lib/           # formato de fechas/números y utilidades de UI
│   ├── db/
│   │   ├── schema.ts      # Drizzle schema
│   │   ├── migrations/    # migraciones embebidas
│   │   ├── repositories/  # acceso a datos con invariantes (sección 3)
│   │   ├── seed.ts        # catálogo global inicial
│   │   └── client.ts      # apertura OPFS + lock de pestaña
│   ├── library/           # biblioteca embebida
│   │   ├── data/          # dataset de ejercicios (TS tipado) + traducción catalana
│   │   ├── index.ts       # búsqueda fuzzy, filtros y localización
│   │   └── sprites/       # SVGs: figuras de movimiento + silueta muscular
│   ├── worker/
│   │   └── index.ts       # Hono
│   └── shared/
│       ├── types.ts
│       ├── list.ts        # utilidades de listas (reorderItem)
│       ├── stats.ts       # 1RM Epley, volumen, agregaciones
│       ├── locale.ts      # Locale, etiquetas y detección desde el navegador
│       ├── errors.ts      # DomainError y claves de error traducibles
│       └── export.ts      # export/import JSON
├── tests/                 # Vitest
├── wrangler.toml
├── vite.config.ts
├── drizzle.config.ts
└── package.json
```

---

## 15. Fases de implementación

1. **Scaffold**: Vite + React + Hono + wrangler; deploy "hello world" del Worker con assets.
2. **BD**: cliente SQLite WASM/OPFS + Drizzle + migraciones embebidas + seed + repositorios con tests.
3. **Auth local**: registro/login/hash argon2id/lock de pestaña.
4. **CRUD**: sesiones, logs, series, catálogo de ejercicios.
5. **Biblioteca**: dataset + buscador fuzzy + figuras SVG + diagrama muscular + drawer desde la sesión.
6. **Estadísticas**: cálculos + Chart.js.
7. **Pulido**: export/import JSON, estados vacíos, manejo de errores, revisión UI.
8. **Plantillas de sesión**: tablas `templates`/`template_items`, repositorio con prellenado desde el último registro, pantalla de gestión y carga en la sesión.
9. **Idioma de la interfaz**: castellano y catalán, preferencia por perfil en `localStorage`, entrada forzada con el parámetro de URL `?lang=es|ca`, diccionarios tipados, errores de dominio traducibles y biblioteca bilingüe.
10. **Diseño responsive**: adaptar todas las pantallas al rango 320 px–escritorio según la sección 12, con navegación inferior en móvil, formularios táctiles, tablas y gráficas adaptables y revisión en los anchos de la sección 12.2.
11. **Reordenar ejercicios arrastrando**: asa de arrastre con pointer events en las tarjetas de la sesión y del editor de plantillas, con botones ↑/↓ como alternativa de teclado; el orden se persiste en `exercise_logs.order` y `template_items.order` sin cambios de esquema.

Cada fase debe dejar la app desplegable y usable; la 2 y la 3 son prerrequisito de todo lo demás.
