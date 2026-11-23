/** Sobe a API e, se o build existir, os estáticos da web em uma porta só. */
import express, { type NextFunction, type Request, type Response } from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { api } from './api.ts';
import { HttpError } from './context.ts';
import { ROOT, sql } from './db.ts';
import { loadSeed } from './seed.ts';

// Em `npm run dev` o Vite fica na 5173 e encaminha /api para cá.
const DEV = process.argv.includes('--dev');
const PORT = DEV ? 5174 : Number(process.env.PORT ?? 5173);
const API_ONLY = DEV || process.env.VANFLOW_API_ONLY === '1';
const DIST = resolve(ROOT, 'apps/web/dist');

if (!sql<{ n: number }>('SELECT COUNT(*) AS n FROM demo_state')[0].n) {
  console.log('Banco vazio: carregando dados de demonstração...');
  loadSeed();
}

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use('/api', api);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));

if (!API_ONLY && existsSync(DIST)) {
  app.use(express.static(DIST, { index: false, maxAge: '1h' }));
  app.get('*', (_req, res) => res.sendFile(resolve(DIST, 'index.html')));
}

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'Algo deu errado. Tente de novo.' });
});

app.listen(PORT, () => {
  console.log(`\n  VanFlow rodando em http://localhost:${PORT}`);
  console.log(`  Entrada da demo:   http://localhost:${PORT}/entrar`);
  console.log(`  Modo apresentação: http://localhost:${PORT}/demo/palco\n`);
});
