import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLive } from './live.ts';

const STORAGE_OPERATOR = 'vanflow.operator';
const STORAGE_THEME = 'vanflow.theme';

function stored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* navegação privada: a escolha vale só nesta aba */
  }
}

/* ---------- Avisos rápidos ---------- */

interface Toast { id: number; text: string; bad: boolean }
const ToastContext = createContext<(text: string, bad?: boolean) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const show = useCallback((text: string, bad = false) => {
    const id = nextId.current++;
    setToasts((list) => [...list, { id, text, bad }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), bad ? 5000 : 3000);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`toast${t.bad ? ' bad' : ''}`}>{t.text}</div>)}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/** Roda uma ação do usuário e mostra o erro, se houver. Devolve a função para o onClick. */
export function useAct() {
  const toast = useToast();
  return useCallback(async <T,>(action: () => Promise<T>, done?: string): Promise<T | undefined> => {
    try {
      const result = await action();
      if (done) toast(done);
      return result;
    } catch (error) {
      toast((error as Error).message, true);
      return undefined;
    }
  }, [toast]);
}

/* ---------- Operador e van selecionados ---------- */

interface OperatorState {
  operatorId: string; setOperatorId: (id: string) => void;
  vanId: string; setVanId: (id: string) => void;
  shell: any;
}

const OperatorContext = createContext<OperatorState | null>(null);

export function OperatorProvider({ children }: { children: ReactNode }) {
  const [operatorId, setId] = useState(() => stored(STORAGE_OPERATOR) ?? 'op_ze');
  const [vanId, setVanId] = useState('');
  const live = useLive(`/operators/${operatorId}/shell`);
  useEffect(() => {
    // Depois de um reset, um operador criado na demo deixa de existir.
    if (live.error && operatorId !== 'op_ze') setId('op_ze');
  }, [live.error, operatorId]);
  const setOperatorId = useCallback((id: string) => {
    store(STORAGE_OPERATOR, id);
    setId(id);
    setVanId('');
  }, []);
  const value = useMemo(() => ({ operatorId, setOperatorId, vanId, setVanId, shell: live.data }), [operatorId, setOperatorId, vanId, live.data]);
  return <OperatorContext.Provider value={value}>{children}</OperatorContext.Provider>;
}

export function useOperator() {
  const value = useContext(OperatorContext);
  if (!value) throw new Error('useOperator fora do provedor');
  return value;
}

/* ---------- Tema ---------- */

export function applyStoredTheme(): void {
  const theme = stored(STORAGE_THEME);
  if (theme) document.documentElement.dataset.theme = theme;
}

export function useTheme() {
  const isDark = () => {
    const current = document.documentElement.dataset.theme;
    return current ? current === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  };
  const [dark, setDark] = useState(isDark);
  const toggle = () => {
    const next = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    store(STORAGE_THEME, next);
    setDark(next === 'dark');
  };
  return { dark, toggle };
}
