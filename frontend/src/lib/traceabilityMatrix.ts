import type { MatrixRow, TraceEvidence } from '../types';
import type { ApiTraceLink } from '../types/api';

export type DisplayStatus = 'ALIGNED' | 'PARTIAL' | 'MISSING' | 'WARNING';

export interface ImplementationCell {
  kind: 'file' | 'partial' | 'missing';
  label: string;
}

export interface ChainMatrixRow {
  id: string;
  displayStatus: DisplayStatus;
  proposalObjective: string;
  srsRequirement: string;
  sddComponent: string | null;
  spmpDeliverable: string | null;
  stdCoverage: string | null;
  implementation: ImplementationCell;
  matrixRow: MatrixRow;
}

function getLink(links: ApiTraceLink[], up: string, down: string): ApiTraceLink | undefined {
  return links.find((l) => l.upstream.type === up && l.downstream.type === down);
}

function clean(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function truncate(text: string, max = 140): string {
  const value = clean(text);
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function pickEvidence(
  pairs: Array<{ upstream: string; downstream: string; similarity: number }> | undefined,
  index: number,
  hint?: string,
): { upstream: string; downstream: string; similarity: number } | null {
  if (!pairs?.length) return null;
  if (pairs[index]) return pairs[index];
  if (!hint) return pairs[0] ?? null;
  const normalized = clean(hint).toLowerCase();
  return pairs.find((p) => clean(p.upstream).toLowerCase().includes(normalized.slice(0, 40)))
    ?? pairs.find((p) => clean(p.downstream).toLowerCase().includes(normalized.slice(0, 40)))
    ?? pairs[0]
    ?? null;
}

function inferFileName(text: string): string {
  const match = text.match(/\b[\w./-]+\.(ts|tsx|js|jsx|py|java|cs|go)\b/i);
  if (match) return match[0].split('/').pop() ?? match[0];
  const words = clean(text).split(/\s+/).slice(0, 3).join('');
  const slug = words.replace(/[^a-zA-Z0-9]/g, '');
  if (!slug) return 'implementation.ts';
  return `${slug.charAt(0).toLowerCase()}${slug.slice(1, 18)}.ts`;
}

function toMatrixRow(link: ApiTraceLink, evidence: TraceEvidence[]): MatrixRow {
  return {
    id: link.id,
    upstreamType: link.upstream.type,
    downstreamType: link.downstream.type,
    alignmentScore: link.alignmentScore,
    coverage: link.coverageScore ?? link.alignmentScore,
    criticalGaps: 0,
    warnings: link.status === 'WARN' ? 1 : 0,
    status: link.status,
    traceEvidence: evidence,
  };
}

function implementationCell(
  pair: { downstream: string; similarity: number } | null,
  linkStatus: ApiTraceLink['status'] | undefined,
): ImplementationCell {
  if (!pair || !clean(pair.downstream)) {
    return { kind: 'missing', label: 'No implementation found' };
  }
  const file = inferFileName(pair.downstream);
  if (linkStatus === 'FAIL' || pair.similarity < 0.35) {
    return { kind: 'missing', label: truncate(pair.downstream, 80) || 'No implementation found' };
  }
  if (linkStatus === 'WARN' || pair.similarity < 0.7) {
    return { kind: 'partial', label: `${file} (partial)` };
  }
  return { kind: 'file', label: file };
}

function displayStatusFor(
  primaryStatus: ApiTraceLink['status'],
  implementation: ImplementationCell,
  hasWarning: boolean,
): DisplayStatus {
  if (implementation.kind === 'missing' || primaryStatus === 'FAIL') return 'MISSING';
  if (hasWarning) return 'WARNING';
  if (primaryStatus === 'WARN' || implementation.kind === 'partial') return 'PARTIAL';
  return 'ALIGNED';
}

function linkToRows(link: ApiTraceLink): ChainMatrixRow[] {
  const evidence: TraceEvidence[] = (link.evidencePairs ?? []).map((ep) => ({
    upstreamSection: ep.upstream,
    downstreamSection: ep.downstream,
    similarityScore: ep.similarity,
  }));

  if (evidence.length === 0) {
    return [{
      id: link.id,
      displayStatus: link.status === 'PASS' ? 'ALIGNED' : link.status === 'WARN' ? 'PARTIAL' : 'MISSING',
      proposalObjective: `${link.upstream.type} trace item`,
      srsRequirement: `${link.downstream.type} alignment (${link.alignmentScore.toFixed(0)}%)`,
      sddComponent: null,
      spmpDeliverable: null,
      stdCoverage: null,
      implementation: { kind: 'missing', label: 'No implementation found' },
      matrixRow: toMatrixRow(link, evidence),
    }];
  }

  return evidence.map((ev, index) => ({
    id: `${link.id}-${index}`,
    displayStatus: displayStatusFor(link.status, { kind: 'missing', label: '' }, link.status === 'WARN'),
    proposalObjective: truncate(ev.upstreamSection),
    srsRequirement: truncate(ev.downstreamSection),
    sddComponent: null,
    spmpDeliverable: null,
    stdCoverage: null,
    implementation: { kind: 'missing', label: 'No implementation found' },
    matrixRow: toMatrixRow(link, [ev]),
  }));
}

export function buildChainMatrixRows(links: ApiTraceLink[]): ChainMatrixRow[] {
  const proposalSrs = getLink(links, 'PROPOSAL', 'SRS');
  const srsSdd = getLink(links, 'SRS', 'SDD');
  const srsSpmp = getLink(links, 'SRS', 'SPMP');
  const srsStd = getLink(links, 'SRS', 'STD');
  const sddCode = getLink(links, 'SDD', 'SOURCE_CODE');

  const seeds = proposalSrs?.evidencePairs ?? [];
  if (seeds.length === 0) {
    return links.flatMap(linkToRows);
  }

  return seeds.map((seed, index) => {
    const sdd = pickEvidence(srsSdd?.evidencePairs, index, seed.downstream);
    const spmp = pickEvidence(srsSpmp?.evidencePairs, index, seed.downstream);
    const std = pickEvidence(srsStd?.evidencePairs, index, seed.downstream);
    const code = pickEvidence(sddCode?.evidencePairs, index, sdd?.downstream);

    const implementation = implementationCell(code, sddCode?.status);
    const hasWarning = [proposalSrs, srsSdd, srsSpmp, srsStd, sddCode].some((l) => l?.status === 'WARN');
    const displayStatus = displayStatusFor(proposalSrs?.status ?? 'FAIL', implementation, hasWarning);

    const evidence: TraceEvidence[] = [
      { upstreamSection: seed.upstream, downstreamSection: seed.downstream, similarityScore: seed.similarity },
      ...(sdd ? [{ upstreamSection: sdd.upstream, downstreamSection: sdd.downstream, similarityScore: sdd.similarity }] : []),
      ...(code ? [{ upstreamSection: code.upstream, downstreamSection: code.downstream, similarityScore: code.similarity }] : []),
    ];

    return {
      id: `${proposalSrs?.id ?? 'row'}-${index}`,
      displayStatus,
      proposalObjective: truncate(seed.upstream),
      srsRequirement: truncate(seed.downstream),
      sddComponent: sdd ? truncate(sdd.downstream) : null,
      spmpDeliverable: spmp ? truncate(spmp.downstream) : null,
      stdCoverage: std ? truncate(std.downstream) : null,
      implementation,
      matrixRow: proposalSrs ? toMatrixRow(proposalSrs, evidence) : toMatrixRow(links[0], evidence),
    };
  });
}

export function filterChainRows(
  rows: ChainMatrixRow[],
  status: 'ALL' | DisplayStatus,
  query: string,
): ChainMatrixRow[] {
  const q = query.trim().toLowerCase();
  return rows.filter((row) => {
    if (status !== 'ALL' && row.displayStatus !== status) return false;
    if (!q) return true;
    const haystack = [
      row.proposalObjective,
      row.srsRequirement,
      row.sddComponent,
      row.spmpDeliverable,
      row.stdCoverage,
      row.implementation.label,
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(q);
  });
}
