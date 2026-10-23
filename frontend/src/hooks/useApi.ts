import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

/**
 * Extracts a readable message from an API error. Escrow returns
 * { error: { message } }; discovery returns { error: "text", message: "text" }.
 */
export function apiErrorMessage(err: any, fallback = 'An unexpected error occurred'): string {
  const body = err?.response?.data;
  if (body) {
    if (typeof body.error === 'object' && body.error?.message) return body.error.message;
    if (typeof body.error === 'string' && body.error) return body.error;
    if (typeof body.message === 'string' && body.message) return body.message;
  }
  return err?.message ?? fallback;
}

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
        const errMsg = apiErrorMessage(err);
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
    [apiFunc, options.onError, options.onSuccess, options.successMessage]
  );

  return { data, loading, error, execute, setData };
}
