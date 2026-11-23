import { Check, Copy, Moon, Sun, X } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { brl, fmtClock, fmtWeekdayDate } from '@vanflow/domain';
import { useTheme, useToast } from '../lib/context.tsx';

export function LogoMark({ onNavy = false, size = 32 }: { onNavy?: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="9" fill={onNavy ? '#1C3150' : '#13233A'} />
      <path d="M8 20 C12 20 12 12 16 12 S20 20 24 20" fill="none" stroke="#F2A62F" strokeWidth="3" strokeLinecap="round" />
      <circle cx="8" cy="20" r="2.5" fill="#F2A62F" /><circle cx="24" cy="20" r="2.5" fill="#F2A62F" />
    </svg>
  );
}

export function Logo({ onNavy = false, to = '/entrar' }: { onNavy?: boolean; to?: string }) {
  return <Link to={to} className="logo-link" aria-label="VanFlow, início"><LogoMark onNavy={onNavy} /><span>VanFlow</span></Link>;
}

export function VanArt({ width = 92 }: { width?: number }) {
  return (
    <svg viewBox="0 0 122 56" width={width} aria-hidden="true">
      <path d="M8 44 V22 Q8 12 18 12 H82 Q92 12 98 20 L110 32 Q114 36 114 42 V46 H8 Z" fill="#F2A62F" stroke="#13233A" strokeWidth="3" />
      <path d="M20 18 H44 V30 H16 V22 Q16 18 20 18Z" fill="#13233A" /><rect x="48" y="18" width="22" height="12" rx="2" fill="#13233A" />
      <path d="M74 18 H86 Q91 18 95 23 L101 30 H74Z" fill="#13233A" /><rect x="8" y="36" width="106" height="3" fill="#13233A" />
      <circle cx="30" cy="46" r="9" fill="#13233A" /><circle cx="30" cy="46" r="3.5" fill="#F3F1EC" />
      <circle cx="92" cy="46" r="9" fill="#13233A" /><circle cx="92" cy="46" r="3.5" fill="#F3F1EC" />
      <circle cx="111" cy="38" r="2.4" fill="#FFF3C4" />
    </svg>
  );
}

export function ThemeButton({ className = 'icon-btn' }: { className?: string }) {
  const { dark, toggle } = useTheme();
  return (
    <button type="button" className={className} onClick={toggle} aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'} title={dark ? 'Tema claro' : 'Tema escuro'}>
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

const PILLS: Record<string, [string, string]> = {
  confirmado: ['vai', 'p-ok'], embarcou: ['embarcou', 'p-ok'], paga: ['paga', 'p-ok'], pago: ['pago', 'p-ok'], ativo: ['ativo', 'p-ok'], ativa: ['ativa', 'p-ok'],
  nao_vai: ['não vai', 'p-warn'], pendente: ['pendente', 'p-warn'], reservado: ['reservado', 'p-warn'], aviso: ['vence logo', 'p-warn'],
  aguardando: ['aguardando', 'p-neu'], pausada: ['pausado', 'p-neu'], previsto: ['previsto', 'p-neu'], sem_resposta: ['sem resposta', 'p-neu'], cancelada: ['cancelada', 'p-neu'],
  cancelado: ['cancelada', 'p-neu'], expirado: ['expirou', 'p-neu'], inativo: ['inativo', 'p-neu'], interessado_avulsa: ['avulso', 'p-av'], ok: ['em dia', 'p-ok'],
  atrasada: ['atrasada', 'p-bad'], nao_apareceu: ['não apareceu', 'p-bad'], vencido: ['vencido', 'p-bad'],
};

export function Pill({ status, label, source }: { status: string; label?: string; source?: string }) {
  const [text, kind] = PILLS[status] ?? [status, 'p-neu'];
  if (source === 'avulsa' && (status === 'confirmado' || status === 'embarcou')) return <span className="pill p-av">{status === 'embarcou' ? 'avulso, embarcou' : 'avulso'}</span>;
  return <span className={`pill ${kind}`}>{label ?? text}</span>;
}

export function PageHead({ eyebrow, title, actions, children }: { eyebrow?: string; title: string; actions?: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {children && <p className="muted page-sub">{children}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <VanArt width={84} />
      <b>{title}</b>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  );
}

export const Loading = () => <div className="loading" role="status">Carregando...</div>;

export function ErrorNote({ text }: { text: string }) {
  return <div className="error-note" role="alert">{text}</div>;
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'ok' | 'warn' | 'bad' }) {
  return (
    <div className={`stat${tone ? ` tone-${tone}` : ''}`}>
      <span className="stat-label">{label}</span>
      <b className="stat-value">{value}</b>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const titleId = useId();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const first = box.current?.querySelector<HTMLElement>('input,select,textarea,button:not(.modal-x)');
    (first ?? box.current)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
    // Só ao abrir: o foco não pode pular a cada renderização.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return createPortal(
    <div className="modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={box} tabIndex={-1}>
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-btn modal-x" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small className="muted">{hint}</small>}
    </label>
  );
}

export function CopyButton({ text, label = 'Copiar', className = 'btn ghost small' }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  const toast = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fora de https ou localhost o navegador bloqueia a área de transferência.
      const area = document.createElement('textarea');
      area.value = text;
      document.body.append(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      if (!ok) return toast('Não deu para copiar neste navegador.', true);
    }
    setDone(true);
    setTimeout(() => setDone(false), 1600);
  };
  return <button type="button" className={className} onClick={copy}>{done ? <Check size={16} /> : <Copy size={16} />}{done ? 'Copiado' : label}</button>;
}

export function QrImage({ payload, size = 200 }: { payload: string; size?: number }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', margin: 1, width: size * 2, color: { dark: '#13233A', light: '#FFFFFF' } }).then(setSrc);
  }, [payload, size]);
  return src ? <img className="qr" src={src} width={size} height={size} alt="QR Code do Pix" /> : <div className="qr" style={{ width: size, height: size }} />;
}

/** Pix com QR e copia e cola, para o painel e a página do aluno. */
export function PixPanel({ payload, amount, title, children }: { payload: string; amount: number; title?: string; children?: ReactNode }) {
  return (
    <div className="pix-panel">
      <QrImage payload={payload} size={176} />
      <div className="pix-panel-body">
        {title && <p className="eyebrow">{title}</p>}
        <b className="pix-amount">{brl(amount)}</b>
        <code className="pix-code">{payload}</code>
        <div className="row-gap">
          <CopyButton text={payload} label="Copiar código Pix" className="btn primary small" />
          {children}
        </div>
      </div>
    </div>
  );
}

export function ClockChip({ now }: { now?: string }) {
  if (!now) return null;
  return <span className="clock" title="Relógio da demo">{fmtWeekdayDate(now)} · {fmtClock(now)}</span>;
}

/** Lembra o que estava na tela para destacar só o que mudou. */
export function useChanged(key: string, value: string): boolean {
  const memory = useRef(new Map<string, string>());
  const previous = memory.current.get(key);
  memory.current.set(key, value);
  return previous !== undefined && previous !== value;
}
