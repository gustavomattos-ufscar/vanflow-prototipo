import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Largura real do elemento em px. Os gráficos e o mapa desenham nessa largura,
 * assim um texto de 12 px continua com 12 px no celular, em vez de encolher junto com o SVG.
 */
export function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const next = Math.round(el.getBoundingClientRect().width);
      if (next > 0) setWidth(next);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}
