import { webcrypto } from 'node:crypto';

// Vitest (Node 18) no expone WebCrypto en el contexto de tests y argon2id
// lo necesita para generar la sal. En el navegador siempre existe.
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}
