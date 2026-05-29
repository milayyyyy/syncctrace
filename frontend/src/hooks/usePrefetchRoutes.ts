import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { prefetchAppData, queryKeys } from './queries';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';

/** Warm the cache after login and when the active workspace changes. */
export function usePrefetchAppData() {
  const qc = useQueryClient();
  const { isAuthenticated, groupId } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) return;
    prefetchAppData(qc);
  }, [isAuthenticated, qc]);

  useEffect(() => {
    if (!isAuthenticated || !groupId) return;
    void qc.prefetchQuery({
      queryKey: queryKeys.artifacts(groupId),
      queryFn: async () => {
        const res = await api.get(`/api/artifacts/${groupId}`);
        return res.data.artifacts ?? [];
      },
    });
    void qc.prefetchQuery({
      queryKey: queryKeys.auditLatest(groupId),
      queryFn: async () => {
        const res = await api.get(`/api/audit/${groupId}/latest`);
        return res.data.auditResult ?? null;
      },
    });
  }, [isAuthenticated, groupId, qc]);
}
