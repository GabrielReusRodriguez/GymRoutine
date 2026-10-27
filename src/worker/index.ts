import { Hono } from 'hono';

/**
 * El Worker solo sirve la SPA (assets estáticos declarados en wrangler.toml)
 * y expone /health. Toda la lógica de negocio vive en el cliente.
 */
const app = new Hono();

app.get('/health', (c) => c.text('ok'));

// Reservado para una futura sincronización con D1 (Spec §9).
app.post('/api/sync', (c) =>
  c.json({ error: 'La sincronización todavía no está implementada.' }, 501),
);

export default app;
