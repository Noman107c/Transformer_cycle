import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Transformer {
  _id: string;
  name: string;
  location: string;
  type: string;
  capacity: number;
  status: 'healthy' | 'warning' | 'critical';
  healthScore: number;
  temperature: number;
  oilLevel: number;
  rul: number;
}

interface UseTransformersOptions {
  page?: number;
  limit?: number;
  status?: string;
}

export function useTransformers(options?: UseTransformersOptions) {
  const { page = 1, limit = 10, status } = options || {};
  
  let url = `/api/transformers?page=${page}&limit=${limit}`;
  if (status) {
    url += `&status=${status}`;
  }

  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean;
    data: Transformer[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  }>(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  return {
    transformers: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    error,
    mutate,
  };
}

export function useTransformer(id: string) {
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean;
    data: Transformer;
  }>(id ? `/api/transformers/${id}` : null, fetcher);

  return {
    transformer: data?.data,
    isLoading,
    error,
    mutate,
  };
}
