import type { ArtifactType, ReadinessStatus, Severity } from './index';

export interface ApiMember {
  id: string;
  name: string;
  email: string;
  role?: string;
  avatarUrl?: string | null;
}

export interface ApiArtifact {
  id: string;
  type: ArtifactType;
  url: string;
  fileName?: string | null;
  uploadedAt?: string;
}

export interface ApiGap {
  id: string;
  description: string;
  severity: Severity;
  rootCause: string;
  recommendation: string;
  aiConfidence: number;
  affectedArtifacts: string[];
  createdAt?: string;
}

export interface ApiTraceLink {
  id: string;
  upstream: { type: string };
  downstream: { type: string };
  alignmentScore: number;
  coverageScore?: number;
  status: 'PASS' | 'WARN' | 'FAIL';
  evidencePairs: Array<{ upstream: string; downstream: string; similarity: number }>;
}

export interface ApiAudit {
  id?: string;
  overallScore: number;
  readinessStatus: ReadinessStatus;
  auditedAt?: string;
  traceLinks?: ApiTraceLink[];
  gaps?: ApiGap[];
}

export interface ApiGroup {
  id: string;
  name: string;
  projectTitle: string;
  teamCode: string;
  createdAt?: string;
  members: ApiMember[];
  artifacts?: ApiArtifact[];
  auditResults: ApiAudit[];
}

export interface ExportJob {
  id: string;
  auditResultId?: string;
  format: string;
  status: string;
  createdAt: string;
  completedAt?: string | null;
  fileUrl?: string | null;
  auditResult?: {
    group?: {
      projectTitle: string;
      name: string;
    };
  };
}

export interface ApiFacultyUser {
  id: string;
  name: string;
  email: string;
}
