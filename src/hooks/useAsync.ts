import { useCallback, useEffect, useRef, useState } from 'react';

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  // Numéro de la dernière requête : une réponse plus ancienne ne doit jamais écraser la plus récente
  const requestId = useRef(0);

  const reload = useCallback(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    fnRef.current()
      .then((result) => { if (id === requestId.current) setData(result); })
      .catch((err) => { if (id === requestId.current) setError(err instanceof Error ? err.message : 'Erreur'); })
      .finally(() => { if (id === requestId.current) setLoading(false); });
  }, []);

  // À la fermeture de l'écran, toute réponse en attente est ignorée
  useEffect(() => () => { requestId.current++; }, []);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, reload, setData };
}