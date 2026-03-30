import { useEffect, useState } from 'react';

interface AsyncDataState<TData> {
  data: TData | null;
  error: string | null;
  loading: boolean;
}

export function useAsyncData<TData>(loader: () => Promise<TData>, deps: unknown[] = []) {
  const [state, setState] = useState<AsyncDataState<TData>>({
    data: null,
    error: null,
    loading: true
  });

  useEffect(() => {
    let active = true;

    const run = async () => {
      setState((current) => ({ ...current, loading: true, error: null }));

      try {
        const data = await loader();
        if (!active) {
          return;
        }

        setState({
          data,
          error: null,
          loading: false
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setState({
          data: null,
          error: error instanceof Error ? error.message : 'Unknown request error.',
          loading: false
        });
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, deps);

  return state;
}
