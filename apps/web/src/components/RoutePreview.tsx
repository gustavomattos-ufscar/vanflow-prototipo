/**
 * Prévia da rota: o próprio Google Maps quando há internet, com as paradas na ordem da VanFlow.
 * Sem internet, mostra o mapa esquemático offline, que nunca depende de rede.
 */
import { useEffect, useState } from 'react';
import { RouteMap } from './RouteMap.tsx';

type Reach = 'checking' | 'online' | 'offline';

let cached: Promise<boolean> | null = null;

/** navigator.onLine diz "sim" em qualquer rede local, até sem internet. Por isso testamos o Google de verdade. */
function canReachGoogle(): Promise<boolean> {
  if (!navigator.onLine) return Promise.resolve(false);
  cached ??= fetch('https://maps.google.com/generate_204', { mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(3500) })
    .then(() => true)
    .catch(() => {
      cached = null;
      return false;
    });
  return cached;
}

function useGoogleReach(): Reach {
  const [reach, setReach] = useState<Reach>('checking');
  useEffect(() => {
    let alive = true;
    const check = () => canReachGoogle().then((ok) => alive && setReach(ok ? 'online' : 'offline'));
    const offline = () => { cached = null; setReach('offline'); };
    check();
    window.addEventListener('online', check);
    window.addEventListener('offline', offline);
    return () => {
      alive = false;
      window.removeEventListener('online', check);
      window.removeEventListener('offline', offline);
    };
  }, []);
  return reach;
}

export function RoutePreview({ route, height = 420 }: { route: any; height?: number }) {
  const reach = useGoogleReach();
  const [choice, setChoice] = useState<'google' | 'offline' | null>(null);
  const canGoogle = reach === 'online' && !!route.embed_url;
  const mode = choice === 'offline' || !canGoogle ? 'offline' : 'google';

  return (
    <div className="card flat route-preview">
      <div className="route-preview-bar">
        <div className="segmented" role="group" aria-label="Como ver a rota">
          <button type="button" aria-pressed={mode === 'google'} disabled={!canGoogle} onClick={() => setChoice('google')}>Google Maps</button>
          <button type="button" aria-pressed={mode === 'offline'} onClick={() => setChoice('offline')}>Mapa offline</button>
        </div>
        <span className="muted small">
          {reach === 'checking' && 'Procurando o Google Maps...'}
          {reach === 'offline' && 'Sem internet: mostrando o mapa offline.'}
          {reach === 'online' && mode === 'google' && 'Prévia no Google Maps, na ordem da VanFlow.'}
          {reach === 'online' && mode === 'offline' && 'Mapa offline: mostra quem não vai e onde a van está.'}
        </span>
      </div>
      {mode === 'google' ? (
        <iframe
          key={route.embed_url}
          className="route-embed"
          title={`Rota de ${route.line_name} no Google Maps`}
          src={route.embed_url}
          style={{ height }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <RouteMap stops={route.stops} skipped={route.skipped} elapsed={route.elapsed_minutes} />
      )}
    </div>
  );
}
