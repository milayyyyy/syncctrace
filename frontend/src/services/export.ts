import { jsPDF } from 'jspdf';
import type { ExportFormat } from '../types';
import type { ApiAudit } from '../types/api';

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

const PDF_MARGIN = 14;
const PDF_LINE = 6;
const PDF_PAGE_BOTTOM = 280;
const PDF_TEXT_WIDTH = 182;

function pdfEnsureSpace(doc: jsPDF, y: number, needed = PDF_LINE): number {
  if (y + needed > PDF_PAGE_BOTTOM) {
    doc.addPage();
    return PDF_MARGIN + 4;
  }
  return y;
}

function pdfAddLines(doc: jsPDF, text: string, x: number, y: number, maxWidth = PDF_TEXT_WIDTH): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  for (const line of lines) {
    y = pdfEnsureSpace(doc, y);
    doc.text(line, x, y);
    y += PDF_LINE;
  }
  return y;
}

export function buildPdfBlob(auditData: ExportAudit, projectTitle: string): Blob {
  const doc = new jsPDF();
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  let y = PDF_MARGIN;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 58, 95);
  doc.text('SyncTrace Audit Report', PDF_MARGIN, y);
  y += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  y = pdfAddLines(doc, `Project: ${projectTitle}`, PDF_MARGIN, y);
  y = pdfAddLines(doc, `Exported: ${date}`, PDF_MARGIN, y);
  y = pdfAddLines(doc, `Status: ${auditData.readinessStatus.replaceAll('_', ' ')}`, PDF_MARGIN, y);
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(30, 58, 95);
  y = pdfEnsureSpace(doc, y, 14);
  doc.text(`${auditData.overallScore.toFixed(1)}%`, PDF_MARGIN, y);
  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('Overall alignment score', PDF_MARGIN, y);
  y += 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 58, 95);
  y = pdfEnsureSpace(doc, y, 10);
  doc.text('Traceability matrix', PDF_MARGIN, y);
  y += 8;

  doc.setFontSize(10);
  for (const link of auditData.traceLinks) {
    y = pdfEnsureSpace(doc, y, PDF_LINE * 2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 95);
    doc.text(`${link.upstream.type} → ${link.downstream.type}`, PDF_MARGIN, y);
    y += PDF_LINE;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Score: ${link.alignmentScore.toFixed(1)}%   Status: ${link.status}`, PDF_MARGIN + 4, y);
    y += PDF_LINE + 2;
  }

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 58, 95);
  y = pdfEnsureSpace(doc, y, 10);
  doc.text('Identified gaps', PDF_MARGIN, y);
  y += 8;

  if (auditData.gaps.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    y = pdfAddLines(doc, 'No gaps were identified in this audit.', PDF_MARGIN, y);
  } else {
    auditData.gaps.forEach((gap, index) => {
      y = pdfEnsureSpace(doc, y, PDF_LINE * 4);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 58, 95);
      doc.text(`${index + 1}. [${gap.severity}]`, PDF_MARGIN, y);
      y += PDF_LINE;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      y = pdfAddLines(doc, gap.description ?? '-', PDF_MARGIN + 2, y);
      if (gap.rootCause) {
        y = pdfEnsureSpace(doc, y);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 116, 139);
        y = pdfAddLines(doc, `Cause: ${gap.rootCause}`, PDF_MARGIN + 2, y);
      }
      if (gap.recommendation) {
        y = pdfEnsureSpace(doc, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(5, 150, 105);
        y = pdfAddLines(doc, `Fix: ${gap.recommendation}`, PDF_MARGIN + 2, y);
      }
      y += 4;
    });
  }

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
