/**
 * npm run reset. Com o servidor no ar, pede para ele mesmo recarregar, e as telas abertas
 * atualizam sozinhas. Sem servidor, recria o banco direto.
 */
const PORT = Number(process.env.PORT ?? 5173);

async function resetRunningServer(): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${PORT}/api/demo/reset`, { method: 'POST', signal: AbortSignal.timeout(8000) });
    return response.ok;
  } catch {
    return false;
  }
}

if (await resetRunningServer()) {
  console.log('Demo resetada no servidor em execução: quarta, 11/11, 20h55.');
} else {
  const { loadSeed } = await import('./seed.ts');
  loadSeed();
  console.log('Banco recriado a partir do seed: quarta, 11/11, 20h55.');
}

export {};
