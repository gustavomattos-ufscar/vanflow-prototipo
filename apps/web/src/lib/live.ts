/** Dados que se atualizam sozinhos: uma conexão SSE por aba, e cada tela refaz a leitura ao ouvir "change". */
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.ts';

const listeners = new Set<() => void>();
let source: EventSource | null = null;

function connect() {
  if (source) return;
  source = new EventSource('/api/events');
  source.addEventListener('change', () => listeners.forEach((fn) => fn()));
}

export function subscribe(fn: () => void): () => void {
  connect();
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export interface Live<T> { data: T | null; error: string | null; reload: () => void }

export function useLive<T = any>(path: string | null): Live<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback(() => {
    if (!path) return;
    const ticket = ++latest.current;
    api<T>(path)
      .then((result) => {
        if (ticket === latest.current) {
          setData(result);
          setError(null);
        }
      })
      .catch((e: Error) => {
        if (ticket === latest.current) setError(e.message);
      });
  }, [path]);

  useEffect(() => {
    setData(null);
    setError(null);
    load();
    const unsubscribe = subscribe(() => {
      clearTimeout(timer.current);
      timer.current = setTimeout(load, 60);
    });
    return () => {
      clearTimeout(timer.current);
      unsubscribe();
    };
  }, [load]);

  return { data, error, reload: load };
}
