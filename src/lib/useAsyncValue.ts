/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';

export function useAsyncValue<T>(loader: () => Promise<T>, deps: React.DependencyList, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    loader()
      .then((next) => {
        if (alive) setValue(next);
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, deps);
  return { value, loading, error, reload: () => loader().then(setValue) };
}
