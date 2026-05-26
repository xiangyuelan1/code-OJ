import { useState, useEffect, useCallback } from 'react';

interface ApiCallState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { message: string };
}

export function useApiCall<T>(
  apiFn: () => Promise<ApiResponse<T>>,
  deps: unknown[] = [],
): ApiCallState<T> & { refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFn();
      if (response.success) {
        setData(response.data ?? null);
      } else {
        setError(response.error?.message ?? '请求失败');
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { error?: { message?: string } })?.error?.message ?? '网络异常，请稍后重试';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [apiFn]);

  useEffect(() => {
    fetchData();
  }, deps);

  return { data, loading, error, refetch: fetchData };
}
