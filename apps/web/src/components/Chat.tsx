/** O celular do aluno: conversa com a VanFlow, botões, Pix e campo de digitação. */
import { Send } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { brl, fmtClock, fmtWeekdayDate } from '@vanflow/domain';
import { post } from '../lib/api.ts';
import { useAct } from '../lib/context.tsx';
import { useLive } from '../lib/live.ts';
import { CopyButton, Modal, QrImage } from './ui.tsx';

const TYPING_MS = 600;
const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

/** Os links das mensagens nascem com localhost; aqui viram o endereço em que a tela foi aberta. */
function Linked({ text }: { text: string }) {
  const parts = text.split(URL_PATTERN);
  return (
    <>
      {parts.map((part, i) => {
        if (!part.match(URL_PATTERN)) return part;
        const { pathname, search } = new URL(part);
        const path = pathname + search;
        return <a key={i} href={path} target="_blank" rel="noreferrer">{`${location.host}${path}`}</a>;
      })}
    </>
  );
}

function PixBlock({ payload, paid, onPay }: { payload: any; paid: boolean; onPay: () => void }) {
  const [zoom, setZoom] = useState(false);
  return (
    <div className="wa-pix">
      <div className="wa-pix-top">
        <button type="button" onClick={() => setZoom(true)} aria-label="Ampliar QR Code"><QrImage payload={payload.pix_payload} size={64} /></button>
        <div>
          <span className="small">{payload.title}</span>
          <span className="amount">{brl(payload.amount)}</span>
        </div>
      </div>
      <code>{payload.pix_payload.slice(0, 44)}...</code>
      <CopyButton text={payload.pix_payload} label="Copiar código" />
      {paid
        ? <span className="pill p-ok" style={{ alignSelf: 'center' }}>pago</span>
        : <button type="button" className="btn demo small" onClick={onPay}>Simular pagamento</button>}
      {zoom && (
        <Modal title="QR Code do Pix" onClose={() => setZoom(false)}>
          <div style={{ display: 'grid', placeItems: 'center', gap: 10 }}>
            <QrImage payload={payload.pix_payload} size={260} />
            <b>{brl(payload.amount)}</b>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function Chat({ studentId, header }: { studentId: string; header?: ReactNode }) {
  const act = useAct();
  const live = useLive(`/whatsapp/conversations/${studentId}`);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const [visibleSeq, setVisibleSeq] = useState(0);
  const body = useRef<HTMLDivElement>(null);
  const firstLoad = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const data = live.data;
  const messages: any[] = data?.messages ?? [];
  const lastSeq = messages.at(-1)?.seq ?? 0;

  useEffect(() => {
    firstLoad.current = true;
    setTyping(false);
    clearTimeout(timer.current);
  }, [studentId]);

  // Mensagens da VanFlow aparecem depois do "digitando...". As do aluno entram na hora.
  useEffect(() => {
    if (!data || data.student.id !== studentId) return;
    if (firstLoad.current) {
      firstLoad.current = false;
      setVisibleSeq(lastSeq);
      return;
    }
    if (lastSeq <= visibleSeq) return;
    const pending = messages.filter((m) => m.seq > visibleSeq);
    const inboundEnd = pending.filter((m) => m.direction === 'in').at(-1)?.seq ?? visibleSeq;
    if (inboundEnd > visibleSeq) setVisibleSeq(inboundEnd);
    if (pending.some((m) => m.direction === 'out')) {
      setTyping(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        setTyping(false);
        setVisibleSeq(lastSeq);
      }, TYPING_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, lastSeq]);

  useEffect(() => {
    if (data?.student.id === studentId && messages.some((m) => m.direction === 'out' && !m.read_at)) {
      post(`/whatsapp/conversations/${studentId}/read`).catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastSeq, studentId]);

  useLayoutEffect(() => {
    const el = body.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [visibleSeq, typing, studentId]);

  const send = (text: string, messageId?: string) =>
    act(() => post('/whatsapp/inbound', { student_id: studentId, text, message_id: messageId }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    send(text);
  };

  const pay = (payload: any) => act(() => post('/webhooks/pix', { txid: payload.txid, amount: payload.amount }));

  const shown = messages.filter((m) => m.seq <= visibleSeq);
  const lastInboundSeq = messages.filter((m) => m.direction === 'in').at(-1)?.seq ?? 0;
  const paid: string[] = data?.paid_txids ?? [];
  let lastDay = '';

  return (
    <div className="phone-frame">
      <div className="phone-screen">
        <div className="wa-head">
          <span className="wa-avatar" aria-hidden="true">V</span>
          <div style={{ minWidth: 0 }}>
            <b>VanFlow · {data?.operator.trade_name ?? ''}</b>
            <small>{header ?? data?.student.name}</small>
          </div>
        </div>
        <div className="wa-body" ref={body} aria-live="polite">
          {shown.length === 0 && !typing && <p className="wa-day">Nenhuma mensagem ainda</p>}
          {shown.map((m) => {
            const day = m.created_at.slice(0, 10);
            const showDay = day !== lastDay;
            lastDay = day;
            const fresh = m.seq > (visibleSeq - 12) && m.seq > 0;
            const buttons = (m.buttons as string[]).filter((b) => b !== 'Copiar código');
            return (
              <div key={m.id} style={{ display: 'contents' }}>
                {showDay && <span className="wa-day">{fmtWeekdayDate(day)}</span>}
                <div className={`bubble${m.direction === 'in' ? ' me' : ''}${fresh ? ' new' : ''}`}>
                  <Linked text={m.body} />
                  {m.payload?.pix_payload && <PixBlock payload={m.payload} paid={paid.includes(m.payload.txid)} onPay={() => pay(m.payload)} />}
                  {buttons.length > 0 && (
                    <div className="wa-quick">
                      {buttons.map((label) => (
                        <button key={label} type="button" disabled={lastInboundSeq > m.seq} onClick={() => send(label, m.id)}>{label}</button>
                      ))}
                    </div>
                  )}
                  <span className="t">{fmtClock(m.created_at)}</span>
                </div>
              </div>
            );
          })}
          {typing && <div className="typing" aria-label="VanFlow digitando"><i /><i /><i /></div>}
        </div>
        <form className="wa-input" onSubmit={submit}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Digite uma mensagem" aria-label="Mensagem" />
          <button type="submit" aria-label="Enviar"><Send size={18} /></button>
        </form>
      </div>
    </div>
  );
}
