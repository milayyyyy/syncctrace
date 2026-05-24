export type Role = 'STUDENT' | 'FACULTY';
export type ProjectStatus = 'ACTIVE' | 'ARCHIVED' | 'COMPLETED';
export type ArtifactType = 'PROPOSAL' | 'SRS' | 'SDD' | 'SPMP' | 'STD' | 'SOURCE_CODE';
export type ArtifactStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type GapType =
  | 'MISSING_LINK'
  | 'INCONSISTENCY'
  | 'IMPLEMENTATION_GAP'
  | 'TERMINOLOGY_DRIFT'
  | 'DOWNSTREAM_OMISSION';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ReadinessStatus = 'READY' | 'NEEDS_REVISION' | 'CRITICAL_GAPS';
export type ExportFormat = 'PDF' | 'JSON' | 'CSV';
export type ExportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl?: string | null;
}

export interface TraceEvidence {
  upstreamSection: string;
  downstreamSection: string;
  similarityScore: number;
}

export interface MatrixRow {
  id: string;
  upstreamType: string;
  downstreamType: string;
  alignmentScore: number;
  coverage: number;
  criticalGaps: number;
  warnings: number;
  status: 'PASS' | 'WARN' | 'FAIL';
  traceEvidence: TraceEvidence[];
}

export interface AuditResult {
  id: string;
  projectId: string;
  overallScore: number;
  completeness: number;
  readinessStatus: ReadinessStatus;
  criticalGaps: number;
  warnings: number;
  partialPairs: number;
  missingPairs: number;
  matrixData: MatrixRow[];
  generatedAt: string;
}

export interface Gap {
  id: string;
  projectId: string;
  gapType: GapType;
  description: string;
  severity: Severity;
  confidence: number;
  detectedAt: string;
  rootCause: string;
  recommendation: string;
  affectedArtifacts: string[];
}

export interface Artifact {
  id: string;
  projectId: string;
  type: ArtifactType;
  url: string;
  status: ArtifactStatus;
  createdAt: string;
}

export interface FacultyGroup {
  id: string;
  title: string;
  teamCode: string;
  healthScore: number;
  unresolvedIssues: number;
  readinessStatus: ReadinessStatus;
  members: User[];
  lastUpdated: string;
  auditResult: AuditResult;
  gaps: Gap[];
  artifacts: Artifact[];
}

export interface ArtifactFormData {
  proposal: string;
  srs: string;
  sdd: string;
  spmp: string;
  std: string;
  sourceCode: string;
}

export interface SetupFormData {
  title: string;
  teamCode: string;
  adviserId: string;
  memberEmails: string[];
}
