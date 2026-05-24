import type { FacultyGroup, Gap, AuditResult, User, MatrixRow, Artifact } from '../types';

const GROUP1_MEMBERS: User[] = [
  { id: 'u1', email: 'alice@university.edu', name: 'Alice Santos', role: 'STUDENT' },
  { id: 'u2', email: 'bob@university.edu', name: 'Bob Cruz', role: 'STUDENT' },
  { id: 'u3', email: 'carol@university.edu', name: 'Carol Reyes', role: 'STUDENT' },
];

const GROUP2_MEMBERS: User[] = [
  { id: 'u4', email: 'david@university.edu', name: 'David Lim', role: 'STUDENT' },
  { id: 'u5', email: 'emma@university.edu', name: 'Emma Tan', role: 'STUDENT' },
  { id: 'u6', email: 'frank@university.edu', name: 'Frank Go', role: 'STUDENT' },
];

const GROUP3_MEMBERS: User[] = [
  { id: 'u7', email: 'grace@university.edu', name: 'Grace Uy', role: 'STUDENT' },
  { id: 'u8', email: 'henry@university.edu', name: 'Henry Sy', role: 'STUDENT' },
];

export const MOCK_MATRIX: MatrixRow[] = [
  {
    id: 'mr1',
    upstreamType: 'PROPOSAL',
    downstreamType: 'SRS',
    alignmentScore: 88.5,
    coverage: 91.2,
    criticalGaps: 0,
    warnings: 1,
    status: 'PASS',
    traceEvidence: [
      {
        upstreamSection: '§2.1 Problem Statement: Automate academic audit trails to reduce manual review overhead in capstone supervision...',
        downstreamSection: 'FR-01: System shall automate traceability verification across all submitted capstone artifacts...',
        similarityScore: 0.92,
      },
      {
        upstreamSection: '§3.2 Scope: Cover entire capstone document lifecycle from Proposal through Source Code submission...',
        downstreamSection: 'FR-04: System shall track document versions and detect changes between submissions...',
        similarityScore: 0.87,
      },
      {
        upstreamSection: '§1.3 Objectives: Reduce manual review time by 60% through AI-powered gap detection...',
        downstreamSection: 'NFR-02: System response time shall be < 2 seconds for traceability analysis of standard documents...',
        similarityScore: 0.79,
      },
    ],
  },
  {
    id: 'mr2',
    upstreamType: 'SRS',
    downstreamType: 'SDD',
    alignmentScore: 74.2,
    coverage: 78.6,
    criticalGaps: 1,
    warnings: 2,
    status: 'WARN',
    traceEvidence: [
      {
        upstreamSection: 'FR-01: System shall generate traceability matrix from uploaded document pairs...',
        downstreamSection: '§4.1 TraceabilityEngine module: Implements pairwise similarity computation using sentence transformers...',
        similarityScore: 0.85,
      },
      {
        upstreamSection: 'FR-05: System shall support Google OAuth 2.0 for user authentication...',
        downstreamSection: '§3.2 Authentication service: JWT-based session management with Google OAuth integration...',
        similarityScore: 0.88,
      },
      {
        upstreamSection: 'FR-09: System shall export audit reports in PDF format with full traceability evidence...',
        downstreamSection: '§6.1 Export Service — ⚠️ DESIGN MISSING: No PDF generation architecture documented',
        similarityScore: 0.31,
      },
    ],
  },
  {
    id: 'mr3',
    upstreamType: 'SDD',
    downstreamType: 'SPMP',
    alignmentScore: 65,
    coverage: 70.1,
    criticalGaps: 1,
    warnings: 3,
    status: 'WARN',
    traceEvidence: [
      {
        upstreamSection: '§4.1 TraceabilityEngine — estimated 3-week implementation sprint, requires ML expertise...',
        downstreamSection: 'Sprint 3: AI Integration (Week 7–9) — NLP model integration and testing...',
        similarityScore: 0.76,
      },
      {
        upstreamSection: '§5.0 UI Components layer — React frontend with Tailwind, estimated 2 weeks...',
        downstreamSection: 'Sprint 1: Frontend scaffolding and core UI (Week 1–3)...',
        similarityScore: 0.82,
      },
      {
        upstreamSection: '§7.0 Deployment pipeline — Docker + GitHub Actions CI/CD, cloud hosting...',
        downstreamSection: '⚠️ MISSING: No deployment planning or DevOps tasks found in SPMP',
        similarityScore: 0.22,
      },
    ],
  },
  {
    id: 'mr4',
    upstreamType: 'SRS',
    downstreamType: 'STD',
    alignmentScore: 55.8,
    coverage: 62.3,
    criticalGaps: 2,
    warnings: 2,
    status: 'FAIL',
    traceEvidence: [
      {
        upstreamSection: 'FR-01: Traceability matrix generation with configurable artifact pairs...',
        downstreamSection: 'TC-001: Verify matrix output format matches specification for 5-pair document set...',
        similarityScore: 0.81,
      },
      {
        upstreamSection: 'FR-06: AI gap detection algorithm shall identify missing links with ≥90% precision...',
        downstreamSection: '🚨 MISSING: No test case for gap detection algorithm found in STD',
        similarityScore: 0.19,
      },
      {
        upstreamSection: 'NFR-01: System shall maintain 99.9% uptime during peak submission periods...',
        downstreamSection: '🚨 MISSING: No load test or stress test defined for uptime verification',
        similarityScore: 0.15,
      },
    ],
  },
  {
    id: 'mr5',
    upstreamType: 'SDD',
    downstreamType: 'SOURCE_CODE',
    alignmentScore: 81.3,
    coverage: 85.7,
    criticalGaps: 0,
    warnings: 1,
    status: 'PASS',
    traceEvidence: [
      {
        upstreamSection: '§4.1 TraceabilityEngine class with compute_similarity() and generate_matrix() methods...',
        downstreamSection: 'src/services/traceability.py: class TraceabilityEngine — fully implemented with FAISS indexing...',
        similarityScore: 0.94,
      },
      {
        upstreamSection: '§3.2 AuthService: JWT generation, refresh token rotation, Google OAuth callback...',
        downstreamSection: 'src/routes/auth.ts: OAuth handler, JWT sign/verify middleware — complete...',
        similarityScore: 0.89,
      },
      {
        upstreamSection: '§6.1 ExportService: PDF generation via jsPDF + html2canvas render pipeline...',
        downstreamSection: '⚠️ src/services/export.ts — STUB ONLY: functions return null, no implementation',
        similarityScore: 0.48,
      },
    ],
  },
];

export const MOCK_AUDIT_RESULT: AuditResult = {
  id: 'ar1',
  projectId: 'p1',
  overallScore: 74.2,
  completeness: 78.6,
  readinessStatus: 'NEEDS_REVISION',
  criticalGaps: 3,
  warnings: 9,
  partialPairs: 2,
  missingPairs: 1,
  matrixData: MOCK_MATRIX,
  generatedAt: '2026-05-24T10:30:00Z',
};

export const MOCK_GAPS: Gap[] = [
  {
    id: 'g1',
    projectId: 'p1',
    gapType: 'MISSING_LINK',
    description: 'SRS requirement FR-06 (Gap Detection Algorithm) has no corresponding test case in STD',
    severity: 'CRITICAL',
    confidence: 0.95,
    detectedAt: '2026-05-24T10:30:00Z',
    rootCause:
      'The Software Test Document was authored before FR-06 was added to the SRS in revision 3. The test planning phase did not incorporate late-stage requirement additions, resulting in a completely untested critical feature path.',
    recommendation:
      'Immediately add test cases TC-010 through TC-015 in the STD covering: (1) gap detection accuracy with ≥90% precision, (2) false positive rate <5%, (3) handling of partial document matches, (4) performance with documents >10MB. Reference FR-06 in each test case header.',
    affectedArtifacts: ['SRS', 'STD'],
  },
  {
    id: 'g2',
    projectId: 'p1',
    gapType: 'IMPLEMENTATION_GAP',
    description: 'PDF Export Service designed in SDD §6.1 exists only as a stub in source code — no actual implementation',
    severity: 'HIGH',
    confidence: 0.89,
    detectedAt: '2026-05-24T10:30:00Z',
    rootCause:
      'Export functionality was scoped for Sprint 4 but de-prioritized due to time constraints. The SDD specifies a full PDF generation pipeline using jsPDF and html2canvas, but the implementation file contains only placeholder functions returning null with TODO comments.',
    recommendation:
      'Implement the ExportService using jsPDF with the following pipeline: (1) render React component to canvas via html2canvas, (2) convert to PDF with auto page breaks, (3) embed audit metadata and timestamps, (4) upload to temporary storage and return signed URL. Estimated effort: 2–3 days.',
    affectedArtifacts: ['SDD', 'SOURCE_CODE'],
  },
  {
    id: 'g3',
    projectId: 'p1',
    gapType: 'TERMINOLOGY_DRIFT',
    description: 'Inconsistent terminology: "traceability matrix" (SRS) vs "coverage map" (SDD) vs "link graph" (source code)',
    severity: 'MEDIUM',
    confidence: 0.78,
    detectedAt: '2026-05-24T10:30:00Z',
    rootCause:
      'Three different team members authored the SRS, SDD, and source code independently without a shared glossary or style guide. The concept of artifact-to-artifact linking is described using different terms across documents, reducing AI similarity scores by an estimated 15–20%.',
    recommendation:
      'Create a shared Glossary section in the SRS (Appendix A) defining canonical terms. Perform a find-and-replace across all documents to standardize to "traceability link" as the primary term. Update code comments and variable names to use `traceabilityLink` convention.',
    affectedArtifacts: ['SRS', 'SDD', 'SOURCE_CODE'],
  },
  {
    id: 'g4',
    projectId: 'p1',
    gapType: 'DOWNSTREAM_OMISSION',
    description: 'Deployment pipeline architecture (SDD §7.0) has no corresponding planning section in SPMP',
    severity: 'LOW',
    confidence: 0.71,
    detectedAt: '2026-05-24T10:30:00Z',
    rootCause:
      'The SPMP was finalized before the team decided to use containerized deployment. The deployment strategy (Docker + GitHub Actions CI/CD) was added to the SDD during a design revision but the project plan was not updated to include deployment tasks, risk assessment, or timeline.',
    recommendation:
      'Add a Deployment Phase section to the SPMP covering: (1) Docker containerization tasks (2 days), (2) CI/CD pipeline setup via GitHub Actions (1 day), (3) Staging environment validation (1 day), (4) Production deployment checklist and rollback plan.',
    affectedArtifacts: ['SDD', 'SPMP'],
  },
];

const GROUP1_ARTIFACTS: Artifact[] = [
  { id: 'a1', projectId: 'p1', type: 'PROPOSAL', url: 'https://docs.google.com/document/d/proposal', status: 'COMPLETED', createdAt: '2026-05-01T00:00:00Z' },
  { id: 'a2', projectId: 'p1', type: 'SRS', url: 'https://docs.google.com/document/d/srs', status: 'COMPLETED', createdAt: '2026-05-05T00:00:00Z' },
  { id: 'a3', projectId: 'p1', type: 'SDD', url: 'https://docs.google.com/document/d/sdd', status: 'COMPLETED', createdAt: '2026-05-10T00:00:00Z' },
  { id: 'a4', projectId: 'p1', type: 'SPMP', url: 'https://docs.google.com/document/d/spmp', status: 'COMPLETED', createdAt: '2026-05-10T00:00:00Z' },
  { id: 'a5', projectId: 'p1', type: 'STD', url: 'https://docs.google.com/document/d/std', status: 'COMPLETED', createdAt: '2026-05-15T00:00:00Z' },
  { id: 'a6', projectId: 'p1', type: 'SOURCE_CODE', url: 'https://github.com/team1/synctrace', status: 'COMPLETED', createdAt: '2026-05-20T00:00:00Z' },
];

export const MOCK_FACULTY_GROUPS: FacultyGroup[] = [
  {
    id: 'p1',
    title: 'SyncTrace — AI Academic Traceability',
    teamCode: 'CS-2026-01',
    healthScore: 74.2,
    unresolvedIssues: 4,
    readinessStatus: 'NEEDS_REVISION',
    members: GROUP1_MEMBERS,
    lastUpdated: '2026-05-24T10:30:00Z',
    auditResult: MOCK_AUDIT_RESULT,
    gaps: MOCK_GAPS,
    artifacts: GROUP1_ARTIFACTS,
  },
  {
    id: 'p2',
    title: 'MediTrack — Hospital Resource Management',
    teamCode: 'CS-2026-02',
    healthScore: 91.5,
    unresolvedIssues: 1,
    readinessStatus: 'READY',
    members: GROUP2_MEMBERS,
    lastUpdated: '2026-05-23T14:00:00Z',
    auditResult: {
      id: 'ar2',
      projectId: 'p2',
      overallScore: 91.5,
      completeness: 94.2,
      readinessStatus: 'READY',
      criticalGaps: 0,
      warnings: 2,
      partialPairs: 1,
      missingPairs: 0,
      matrixData: [],
      generatedAt: '2026-05-23T14:00:00Z',
    },
    gaps: [
      {
        id: 'g5',
        projectId: 'p2',
        gapType: 'TERMINOLOGY_DRIFT',
        description: 'Minor terminology inconsistency in NFR documentation across SRS and STD',
        severity: 'LOW',
        confidence: 0.65,
        detectedAt: '2026-05-23T14:00:00Z',
        rootCause: 'Two team members authored the SRS and STD sections independently, using slightly different terms for non-functional requirements.',
        recommendation: 'Standardize NFR terminology across documents. Add a shared glossary appendix to the SRS.',
        affectedArtifacts: ['SRS', 'STD'],
      },
    ],
    artifacts: [],
  },
  {
    id: 'p3',
    title: 'EduBot — Adaptive Learning Platform',
    teamCode: 'CS-2026-03',
    healthScore: 43.8,
    unresolvedIssues: 8,
    readinessStatus: 'CRITICAL_GAPS',
    members: GROUP3_MEMBERS,
    lastUpdated: '2026-05-22T09:15:00Z',
    auditResult: {
      id: 'ar3',
      projectId: 'p3',
      overallScore: 43.8,
      completeness: 51.2,
      readinessStatus: 'CRITICAL_GAPS',
      criticalGaps: 5,
      warnings: 3,
      partialPairs: 2,
      missingPairs: 3,
      matrixData: [],
      generatedAt: '2026-05-22T09:15:00Z',
    },
    gaps: [],
    artifacts: [],
  },
];

export const MOCK_CURRENT_USER: User = {
  id: 'student1',
  email: 'alice@university.edu',
  name: 'Alice Santos',
  role: 'STUDENT',
};

export const MOCK_FACULTY_USER: User = {
  id: 'faculty1',
  email: 'prof.santos@university.edu',
  name: 'Prof. Maria Santos',
  role: 'FACULTY',
};

export const MOCK_FACULTY_LIST = [
  { id: 'f1', name: 'Prof. Maria Santos', email: 'prof.santos@university.edu' },
  { id: 'f2', name: 'Dr. Jose Rizal', email: 'j.rizal@university.edu' },
  { id: 'f3', name: 'Prof. Elena Torres', email: 'e.torres@university.edu' },
];
