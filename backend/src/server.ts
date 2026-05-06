import { createApp, resolveCorsAllowedOrigins } from './app.js';
import { env } from './config/env.js';

const app = createApp();

app.listen(env.PORT, () => {
  const corsList = resolveCorsAllowedOrigins(env.CORS_ORIGIN);
  console.log(`Pepsi PM API listening on http://127.0.0.1:${env.PORT}`);
  console.log(`CORS allowed (${corsList.length}): ${corsList.join(' | ')} | SKIP_AUTH: ${env.SKIP_AUTH}`);
});
