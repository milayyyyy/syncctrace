import { useCallback, useEffect, useMemo } from 'react';
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { api } from '../services/api';
import type { ApiFacultyUser, ApiGroup, ExportJob } from '../types/api';
import type { ArtifactType } from '../types';
import { useAuthStore } from '../stores/authStore';

export const queryKeys = {
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  artifacts: (groupId: string) => ['artifacts', groupId] as const,
  auditLatest: (groupId: string) => ['audit', groupId, 'latest'] as const,
  exportJobs: ['export', 'jobs'] as const,
  faculty: ['users', 'faculty'] as const,
};

async function fetchProjects(): Promise<ApiGroup[]> {
  const res = await api.get('/api/projects');
  const groups: ApiGroup[] = res.data.groups ?? [];
  return sortWorkspacesByCreated(groups);
}

/** Oldest workspace first — the user's first created project. */
export function sortWorkspacesByCreated(workspaces: ApiGroup[]): ApiGroup[] {
  return [...workspaces].sort(
    (a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime(),
  );
}

export function primaryWorkspaceId(workspaces: ApiGroup[]): string {
  return sortWorkspacesByCreated(workspaces)[0]?.id ?? '';
}

async function fetchProject(id: string): Promise<ApiGroup> {
  const res = await api.get(`/api/projects/${id}`);
  return res.data.group;
}

async function fetchArtifacts(groupId: string): Promise<Array<{ type: ArtifactType; url: string }>> {
  const res = await api.get(`/api/artifacts/${groupId}`);
  return res.data.artifacts ?? [];
}

async function fetchLatestAudit(groupId: string) {
  const res = await api.get(`/api/audit/${groupId}/latest`);
  return res.data.auditResult ?? null;
}

async function fetchExportJobs(): Promise<ExportJob[]> {
  const res = await api.get('/api/export');
  return res.data.jobs ?? [];
}

async function fetchFaculty(): Promise<ApiFacultyUser[]> {
  const res = await api.get('/api/users/faculty');
  return res.data.faculty ?? [];
}

export function invalidateWorkspaceData(qc: QueryClient, groupId?: string) {
  qc.invalidateQueries({ queryKey: queryKeys.projects });
  if (groupId) {
    qc.invalidateQueries({ queryKey: queryKeys.artifacts(groupId) });
    qc.invalidateQueries({ queryKey: queryKeys.auditLatest(groupId) });
  }
}

export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: fetchProjects,
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.project(id ?? ''),
    queryFn: () => fetchProject(id!),
    enabled: Boolean(id),
  });
}

export function useArtifacts(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.artifacts(groupId ?? ''),
    queryFn: () => fetchArtifacts(groupId!),
    enabled: Boolean(groupId),
    staleTime: 20_000,
  });
}

export function useLatestAudit(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.auditLatest(groupId ?? ''),
    queryFn: () => fetchLatestAudit(groupId!),
    enabled: Boolean(groupId),
    staleTime: 20_000,
  });
}

export function useExportJobs() {
  return useQuery({
    queryKey: queryKeys.exportJobs,
    queryFn: fetchExportJobs,
  });
}

export function useFacultyList() {
  return useQuery({
    queryKey: queryKeys.faculty,
    queryFn: fetchFaculty,
    staleTime: 5 * 60_000,
  });
}

export function useInvalidateWorkspace() {
  const qc = useQueryClient();
  return useCallback((groupId?: string) => invalidateWorkspaceData(qc, groupId), [qc]);
}

/** Pick active workspace; defaults to the first project created. */
export function useWorkspacePicker() {
  const { groupId, setGroupId } = useAuthStore();
  const query = useProjects();
  const workspaces = useMemo(
    () => sortWorkspacesByCreated(query.data ?? []),
    [query.data],
  );
  const defaultGroupId = primaryWorkspaceId(workspaces);

  useEffect(() => {
    if (!defaultGroupId) return;
    const active = groupId ? workspaces.some((g) => g.id === groupId) : false;
    if (!active) setGroupId(defaultGroupId);
  }, [defaultGroupId, groupId, setGroupId, workspaces]);

  const selectedGroupId = useMemo(() => {
    if (workspaces.length === 0) return '';
    const active = groupId ? workspaces.find((g) => g.id === groupId) : undefined;
    return active?.id ?? defaultGroupId;
  }, [workspaces, groupId, defaultGroupId]);

  const selectGroup = useCallback((id: string) => {
    setGroupId(id);
  }, [setGroupId]);

  const selectedGroup = workspaces.find((g) => g.id === selectedGroupId);

  return {
    ...query,
    workspaces,
    selectedGroupId,
    selectedGroup,
    selectGroup,
    defaultGroupId,
    isInitialLoad: query.isPending && workspaces.length === 0,
  };
}

/** Warm the cache after login. */
export function prefetchAppData(qc: QueryClient) {
  void qc.prefetchQuery({ queryKey: queryKeys.projects, queryFn: fetchProjects });
  void qc.prefetchQuery({ queryKey: queryKeys.exportJobs, queryFn: fetchExportJobs });
}

/** Warm cache when hovering sidebar links before navigation. */
export function prefetchRouteData(qc: QueryClient, path: string, groupId?: string | null) {
  if (path.startsWith('/dashboard') || path.startsWith('/setup') || path.startsWith('/export')) {
    void qc.prefetchQuery({ queryKey: queryKeys.projects, queryFn: fetchProjects });
  }
  if (path.startsWith('/export')) {
    void qc.prefetchQuery({ queryKey: queryKeys.exportJobs, queryFn: fetchExportJobs });
  }
  if (groupId && (path.startsWith('/artifacts') || path.startsWith('/matrix') || path.startsWith('/diagnostics'))) {
    void qc.prefetchQuery({
      queryKey: queryKeys.artifacts(groupId),
      queryFn: () => fetchArtifacts(groupId),
    });
    void qc.prefetchQuery({
      queryKey: queryKeys.auditLatest(groupId),
      queryFn: () => fetchLatestAudit(groupId),
    });
  }
  if (path.startsWith('/faculty')) {
    void qc.prefetchQuery({ queryKey: queryKeys.projects, queryFn: fetchProjects });
  }
}
