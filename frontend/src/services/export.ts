import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ExportFormat } from '../types';
import type { ApiAudit } from '../types/api';

/** jsPDF + autotable final Y position after last table */
interface JsPdfWithAutoTable extends jsPDF {
  lastAutoTable?: { finalY: number };
}

export interface ExportAudit {
  id?: string;
  overallScore: number;
  readinessStatus: string;
  auditedAt?: string;
  traceLinks: Array<{
    upstream: { type: string };
    downstream: { type: string };
    alignmentScore: number;
    status: string;
  }>;
  gaps: Array<{
    severity: string;
    description?: string;
    rootCause?: string;
    recommendation?: string;
    aiConfidence?: number;
  }>;
}

export function toExportAudit(audit: ApiAudit): ExportAudit {
  return {
    id: audit.id,
    overallScore: audit.overallScore,
    readinessStatus: audit.readinessStatus,
    auditedAt: audit.auditedAt,
    traceLinks: (audit.traceLinks ?? []).map((link) => ({
      upstream: link.upstream,
      downstream: link.downstream,
      alignmentScore: link.alignmentScore,
      status: link.status,
    })),
    gaps: (audit.gaps ?? []).map((gap) => ({
      severity: gap.severity,
      description: gap.description,
      rootCause: gap.rootCause,
      recommendation: gap.recommendation,
      aiConfidence: gap.aiConfidence,
    })),
  };
}

export function exportFilename(projectTitle: string, format: ExportFormat): string {
  const slug = (projectTitle || 'audit').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'audit';
  const dateStr = new Date().toISOString().slice(0, 10);
  return `audit-${slug}-${dateStr}.${format.toLowerCase()}`;
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildJsonBlob(auditData: ExportAudit, projectTitle: string): Blob {
  const payload = {
    exportedAt: new Date().toISOString(),
    projectTitle,
    overallScore: auditData.overallScore,
    readinessStatus: auditData.readinessStatus,
    traceLinks: auditData.traceLinks,
    gaps: auditData.gaps,
  };
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}

export function buildCsvBlob(auditData: ExportAudit, projectTitle: string): Blob {
  const q = (s: string) => `"${String(s ?? '').replaceAll('"', '""')}"`;
  const rows: string[] = [
    'SyncTrace Audit Report',
    `Project: ${projectTitle}`,
    `Exported: ${new Date().toLocaleString()}`,
    `Overall Score: ${auditData.overallScore.toFixed(1)}%`,
    `Status: ${auditData.readinessStatus}`,
    '',
    'TRACEABILITY MATRIX',
    'Upstream,Downstream,Alignment Score,Status',
    ...auditData.traceLinks.map((l) =>
      `${l.upstream.type},${l.downstream.type},${l.alignmentScore.toFixed(1)},${l.status}`,
    ),
    '',
    'GAPS',
    'Severity,Description,Root Cause,Recommendation,AI Confidence',
    ...auditData.gaps.map((g) =>
      [
        g.severity,
        q(g.description ?? ''),
        q(g.rootCause ?? ''),
        q(g.recommendation ?? ''),
        g.aiConfidence == null ? '' : `${(g.aiConfidence * 100).toFixed(0)}%`,
      ].join(','),
    ),
  ];
  return new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
}

const PDF = {
  margin: 16,
  pageW: 210,
  pageH: 297,
  contentW: 178,
  navy: [30, 58, 95] as [number, number, number],
  gold: [212, 175, 55] as [number, number, number],
  slate: [100, 116, 139] as [number, number, number],
  text: [30, 41, 59] as [number, number, number],
  lightBg: [248, 250, 252] as [number, number, number],
  footerY: 287,
};

const DOC_LABELS: Record<string, string> = {
  PROPOSAL: 'Project Proposal',
  SRS: 'Requirements (SRS)',
  SDD: 'Design (SDD)',
  SPMP: 'Project Plan (SPMP)',
  STD: 'Test Document (STD)',
  SOURCE_CODE: 'Source Code',
};

function docLabel(type: string): string {
  return DOC_LABELS[type] ?? type.replaceAll('_', ' ');
}

function readinessLabel(status: string): string {
  const map: Record<string, string> = {
    READY: 'Ready for review',
    NEEDS_REVISION: 'Needs revision',
    CRITICAL_GAPS: 'Critical gaps found',
  };
  return map[status] ?? status.replaceAll('_', ' ');
}

function linkStatusLabel(status: string): string {
  if (status === 'PASS') return 'Good';
  if (status === 'WARN') return 'Needs review';
  return 'Action needed';
}

function severityColor(severity: string): [number, number, number] {
  if (severity === 'CRITICAL') return [185, 28, 28];
  if (severity === 'HIGH') return [234, 88, 12];
  if (severity === 'MEDIUM') return [217, 119, 6];
  return [37, 99, 235];
}

function scoreColor(score: number): [number, number, number] {
  if (score >= 80) return [5, 150, 105];
  if (score >= 60) return [180, 83, 9];
  return [185, 28, 28];
}

function formatReportDate(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function addPageFooters(doc: jsPDF, projectTitle: string): void {
  const total = doc.getNumberOfPages();
  const exported = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  for (let page = 1; page <= total; page++) {
    doc.setPage(page);
    doc.setDrawColor(...PDF.slate);
    doc.setLineWidth(0.2);
    doc.line(PDF.margin, PDF.footerY - 4, PDF.pageW - PDF.margin, PDF.footerY - 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...PDF.slate);
    doc.text('SyncTrace · Academic Traceability Audit', PDF.margin, PDF.footerY);
    const subtitle = projectTitle.length > 42 ? `${projectTitle.slice(0, 39)}…` : projectTitle;
    doc.text(subtitle, PDF.pageW / 2, PDF.footerY, { align: 'center' });
    doc.text(`Page ${page} of ${total} · Exported ${exported}`, PDF.pageW - PDF.margin, PDF.footerY, { align: 'right' });
  }
}

function drawCoverBanner(doc: jsPDF): number {
  doc.setFillColor(...PDF.navy);
  doc.rect(0, 0, PDF.pageW, 46, 'F');
  doc.setFillColor(...PDF.gold);
  doc.rect(0, 46, PDF.pageW, 1.2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...PDF.gold);
  doc.text('SYNCTRACE', PDF.margin, 14);

  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('Academic Traceability Audit Report', PDF.margin, 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(200, 210, 220);
  doc.text('Capstone document alignment & gap analysis', PDF.margin, 34);

  return 58;
}

function drawSectionTitle(doc: jsPDF, title: string, subtitle: string, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...PDF.navy);
  doc.text(title, PDF.margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PDF.slate);
  doc.text(subtitle, PDF.margin, y + 5.5);
  doc.setDrawColor(...PDF.gold);
  doc.setLineWidth(0.6);
  doc.line(PDF.margin, y + 8.5, PDF.margin + 28, y + 8.5);
  return y + 14;
}

function drawSummaryPanel(
  doc: jsPDF,
  auditData: ExportAudit,
  projectTitle: string,
  y: number,
): number {
  const boxH = 38;
  doc.setFillColor(...PDF.lightBg);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(PDF.margin, y, PDF.contentW, boxH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...PDF.navy);
  const titleLines = doc.splitTextToSize(projectTitle, PDF.contentW - 80);
  doc.text(titleLines[0], PDF.margin + 5, y + 10);
  if (titleLines.length > 1) {
    doc.setFontSize(11);
    doc.text(titleLines[1], PDF.margin + 5, y + 16);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PDF.slate);
  doc.text(`Audited: ${formatReportDate(auditData.auditedAt)}`, PDF.margin + 5, y + 24);
  doc.text(`Readiness: ${readinessLabel(auditData.readinessStatus)}`, PDF.margin + 5, y + 30);

  const scoreX = PDF.pageW - PDF.margin - 42;
  doc.setFillColor(...PDF.navy);
  doc.roundedRect(scoreX, y + 4, 42, 30, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...scoreColor(auditData.overallScore));
  doc.text(`${auditData.overallScore.toFixed(1)}%`, scoreX + 21, y + 18, { align: 'center' });
  doc.setFontSize(7);
  doc.setTextColor(200, 210, 220);
  doc.text('OVERALL SCORE', scoreX + 21, y + 26, { align: 'center' });

  return y + boxH + 10;
}

function drawStatRow(doc: jsPDF, auditData: ExportAudit, y: number): number {
  const counts = {
    CRITICAL: auditData.gaps.filter((g) => g.severity === 'CRITICAL').length,
    HIGH: auditData.gaps.filter((g) => g.severity === 'HIGH').length,
    MEDIUM: auditData.gaps.filter((g) => g.severity === 'MEDIUM').length,
    LOW: auditData.gaps.filter((g) => g.severity === 'LOW').length,
  };
  const items = [
    { label: 'Critical', value: String(counts.CRITICAL), color: [185, 28, 28] as [number, number, number] },
    { label: 'High', value: String(counts.HIGH), color: [234, 88, 12] as [number, number, number] },
    { label: 'Medium', value: String(counts.MEDIUM), color: [217, 119, 6] as [number, number, number] },
    { label: 'Low', value: String(counts.LOW), color: [37, 99, 235] as [number, number, number] },
    { label: 'Links checked', value: String(auditData.traceLinks.length), color: PDF.navy },
  ];
  const gap = 4;
  const boxW = (PDF.contentW - gap * (items.length - 1)) / items.length;
  items.forEach((item, i) => {
    const x = PDF.margin + i * (boxW + gap);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, boxW, 22, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...PDF.slate);
    doc.text(item.label, x + boxW / 2, y + 8, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...item.color);
    doc.text(item.value, x + boxW / 2, y + 17, { align: 'center' });
  });
  return y + 30;
}

function drawMatrixTable(doc: JsPdfWithAutoTable, auditData: ExportAudit, startY: number): number {
  const body = auditData.traceLinks.map((link) => [
    docLabel(link.upstream.type),
    docLabel(link.downstream.type),
    `${link.alignmentScore.toFixed(1)}%`,
    linkStatusLabel(link.status),
  ]);

  autoTable(doc, {
    startY,
    margin: { left: PDF.margin, right: PDF.margin, bottom: 22 },
    head: [['From document', 'To document', 'Alignment', 'Status']],
    body: body.length > 0 ? body : [['—', '—', '—', 'No traceability data']],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 3.5,
      textColor: PDF.text,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: PDF.navy,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 52 },
      1: { cellWidth: 52 },
      2: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 36, halign: 'center' },
    },
    alternateRowStyles: { fillColor: [252, 252, 253] },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        const score = Number.parseFloat(String(data.cell.raw).replace('%', ''));
        if (Number.isFinite(score)) {
          data.cell.styles.textColor = scoreColor(score);
        }
      }
      if (data.section === 'body' && data.column.index === 3) {
        const status = String(data.cell.raw);
        if (status === 'Good') data.cell.styles.textColor = [5, 150, 105];
        else if (status === 'Needs review') data.cell.styles.textColor = [180, 83, 9];
        else if (status === 'Action needed') data.cell.styles.textColor = [185, 28, 28];
      }
    },
  });

  return (doc.lastAutoTable?.finalY ?? startY) + 12;
}

function drawGapIssue(
  doc: jsPDF,
  gap: ExportAudit['gaps'][number],
  index: number,
  y: number,
): number {
  const pad = 5;
  const innerW = PDF.contentW - pad * 2 - 3;
  const sevColor = severityColor(gap.severity);

  const descLines = doc.splitTextToSize(gap.description ?? '—', innerW);
  const causeLines = gap.rootCause ? doc.splitTextToSize(gap.rootCause, innerW) : [];
  const fixLines = gap.recommendation ? doc.splitTextToSize(gap.recommendation, innerW) : [];
  const blockH =
    14
    + descLines.length * 4.5
    + (causeLines.length ? 8 + causeLines.length * 4.5 : 0)
    + (fixLines.length ? 8 + fixLines.length * 4.5 : 0)
    + 8;

  if (y + blockH > PDF.footerY - 12) {
    doc.addPage();
    y = PDF.margin;
  }

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(PDF.margin, y, PDF.contentW, blockH, 2, 2, 'FD');
  doc.setFillColor(...sevColor);
  doc.rect(PDF.margin, y, 2.5, blockH, 'F');

  let cy = y + pad + 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...PDF.navy);
  doc.text(`Issue ${index + 1}`, PDF.margin + pad + 2, cy);

  doc.setFontSize(8);
  doc.setTextColor(...sevColor);
  doc.text(gap.severity, PDF.pageW - PDF.margin - pad, cy, { align: 'right' });
  cy += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...PDF.slate);
  doc.text('WHAT WAS FOUND', PDF.margin + pad + 2, cy);
  cy += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PDF.text);
  descLines.forEach((line: string) => {
    doc.text(line, PDF.margin + pad + 2, cy);
    cy += 4.5;
  });

  if (causeLines.length) {
    cy += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9);
    doc.text('WHY THIS HAPPENED', PDF.margin + pad + 2, cy);
    cy += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    causeLines.forEach((line: string) => {
      doc.text(line, PDF.margin + pad + 2, cy);
      cy += 4.5;
    });
  }

  if (fixLines.length) {
    cy += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(5, 120, 85);
    doc.text('RECOMMENDED FIX', PDF.margin + pad + 2, cy);
    cy += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 70, 55);
    fixLines.forEach((line: string) => {
      doc.text(line, PDF.margin + pad + 2, cy);
      cy += 4.5;
    });
  }

  if (gap.aiConfidence != null) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF.slate);
    doc.text(
      `AI confidence: ${(gap.aiConfidence * 100).toFixed(0)}%`,
      PDF.pageW - PDF.margin - pad,
      y + blockH - 3,
      { align: 'right' },
    );
  }

  return y + blockH + 6;
}

export function buildPdfBlob(auditData: ExportAudit, projectTitle: string): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' }) as JsPdfWithAutoTable;

  let y = drawCoverBanner(doc);
  y = drawSummaryPanel(doc, auditData, projectTitle, y);
  y = drawStatRow(doc, auditData, y);

  y = drawSectionTitle(
    doc,
    '1. Document alignment matrix',
    'How each capstone artifact connects to the next in the project lifecycle',
    y,
  );
  y = drawMatrixTable(doc, auditData, y);

  y = drawSectionTitle(
    doc,
    '2. Issues & recommendations',
    'Gaps detected by AI analysis with root causes and suggested fixes for the team',
    y,
  );

  if (auditData.gaps.length === 0) {
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(PDF.margin, y, PDF.contentW, 18, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(5, 120, 85);
    doc.text('No issues were identified. All reviewed documents appear well aligned.', PDF.margin + 5, y + 11);
    y += 24;
  } else {
    auditData.gaps.forEach((gap, index) => {
      y = drawGapIssue(doc, gap, index, y);
    });
  }

  addPageFooters(doc, projectTitle);
  return doc.output('blob');
}

export function exportAuditReport(auditData: ExportAudit, projectTitle: string, format: ExportFormat): void {
  const filename = exportFilename(projectTitle, format);
  if (format === 'JSON') {
    triggerBlobDownload(buildJsonBlob(auditData, projectTitle), filename);
  } else if (format === 'CSV') {
    triggerBlobDownload(buildCsvBlob(auditData, projectTitle), filename);
  } else {
    triggerBlobDownload(buildPdfBlob(auditData, projectTitle), filename);
  }
}
