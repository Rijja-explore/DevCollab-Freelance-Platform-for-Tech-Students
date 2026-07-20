import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: any) => void;
  successMessage?: string;
}

export function useApi<T, Args extends any[]>(
  apiFunc: (...args: Args) => Promise<any>,
  options: UseApiOptions<T> = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (...args: Args) => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiFunc(...args);
        const resultData = response.data?.data ?? response.data;
        setData(resultData);
        if (options.successMessage) {
          toast.success(options.successMessage);
        }
        if (options.onSuccess) {
          options.onSuccess(resultData);
        }
        return resultData;
      } catch (err: any) {
        const errMsg =
          err.response?.data?.error?.message ??
          err.message ??
          'An unexpected error occurred';
        setError(errMsg);
        toast.error(errMsg);
        if (options.onError) {
          options.onError(err);
        }
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiFunc, options]
  );

  return { data, loading, error, execute, setData };
}
