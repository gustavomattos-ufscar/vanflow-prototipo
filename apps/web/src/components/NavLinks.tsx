/** Links reais do Google Maps e do Waze. Sem internet eles não carregam, então o link fica à mão para copiar. */
import { useEffect, useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { CopyButton } from './ui.tsx';

export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}

export function NavLinks({ route, nextOrder }: { route: any; nextOrder?: number }) {
  const online = useOnline();
  const next = route.waze_links.find((w: any) => w.order === nextOrder) ?? route.waze_links[0];
  return (
    <div className="stack" style={{ gap: 10 }}>
      {!online && <p className="note small">Sem internet agora: o link abre uma aba vazia. Use "Copiar" e abra no celular.</p>}
      {route.maps_links.map((link: string, i: number) => (
        <div key={link} className="link-box">
          <a className="btn dark small" href={link} target="_blank" rel="noreferrer"><MapPin size={16} />Abrir no Google Maps{route.maps_links.length > 1 ? `, trecho ${i + 1}` : ''}</a>
          <code>{link}</code>
          <CopyButton text={link} />
        </div>
      ))}
      {next && (
        <div className="link-box">
          <a className="btn dark small" href={next.url} target="_blank" rel="noreferrer"><Navigation size={16} />Abrir no Waze</a>
          <code>Próxima parada: {next.name}</code>
          <CopyButton text={next.url} />
        </div>
      )}
    </div>
  );
}
