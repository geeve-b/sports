import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Run an async loader and track { data, loading, error }.
 *   const { data, loading, error, reload, setData } = useFetch(() => api.get(id), [id]);
 * Options: skip (don't load yet), interval (ms, quiet background refresh).
 */
export function useFetch(loader, deps = [], { skip = false, interval } = {}) {
  const [state, setState] = useState({ data: null, loading: !skip, error: null });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const requestId = useRef(0);

  const load = useCallback(async ({ quiet = false } = {}) => {
    const id = ++requestId.current;
    if (!quiet) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await loaderRef.current();
      if (id === requestId.current) setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      if (id === requestId.current) setState((s) => ({ ...s, loading: false, error }));
      return undefined;
    }
  }, []);

  useEffect(() => {
    if (!skip) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, load, ...deps]);

  useEffect(() => {
    if (skip || !interval) return undefined;
    const t = setInterval(() => load({ quiet: true }), interval);
    return () => clearInterval(t);
  }, [skip, interval, load]);

  const setData = useCallback(
    (updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })),
    [],
  );

  return { ...state, reload: load, setData };
}
