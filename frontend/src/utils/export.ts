import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Brand colours
const GREEN = [16, 122, 75] as [number, number, number];   // #107A4B  ≈ sendistri-green
const DARK  = [17, 24, 39] as [number, number, number];    // #111827  sendistri-dark
const LIGHT = [243, 244, 246] as [number, number, number]; // #F3F4F6

export interface PdfColumn {
  header: string;
  dataKey: string;
  align?: 'left' | 'center' | 'right';
  width?: number;
}

export interface PdfOptions {
  title: string;
  subtitle?: string;
  columns: PdfColumn[];
  rows: Record<string, string | number>[];
  filename?: string;
  totals?: { label: string; value: string }[];
}

export function downloadPdf(opts: PdfOptions) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const now = new Date();

  // ── Header band ──────────────────────────────────────────────────────────
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, 22, 'F');

  // Logo pill
  doc.setFillColor(...GREEN);
  doc.roundedRect(10, 5, 12, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('★', 16, 13, { align: 'center' });

  // App name
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('SENDISTRI', 25, 13);

  // Right: date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text(`Généré le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, pageW - 10, 13, { align: 'right' });

  // ── Title ─────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...DARK);
  doc.text(opts.title, 10, 32);

  if (opts.subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(opts.subtitle, 10, 38);
  }

  const tableStartY = opts.subtitle ? 43 : 38;

  // ── Table ─────────────────────────────────────────────────────────────────
  autoTable(doc, {
    startY: tableStartY,
    columns: opts.columns.map((c) => ({ header: c.header, dataKey: c.dataKey })),
    body: opts.rows,
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      overflow: 'linebreak',
      textColor: [33, 33, 33],
    },
    headStyles: {
      fillColor: GREEN,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: LIGHT,
    },
    columnStyles: opts.columns.reduce<Record<string, { halign: 'left' | 'center' | 'right'; cellWidth?: number }>>((acc, c, i) => {
      acc[i] = { halign: c.align ?? 'left', ...(c.width ? { cellWidth: c.width } : {}) };
      return acc;
    }, {}),
    didDrawPage: (data) => {
      // Footer with page numbers
      const str = `Page ${data.pageNumber}`;
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(str, pageW / 2, doc.internal.pageSize.getHeight() - 5, { align: 'center' });
    },
  });

  // ── Totals block ──────────────────────────────────────────────────────────
  if (opts.totals && opts.totals.length > 0) {
    const finalY: number = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
    let y = finalY;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    opts.totals.forEach((t) => {
      doc.text(`${t.label} :`, pageW - 60, y);
      doc.setTextColor(...GREEN);
      doc.text(t.value, pageW - 10, y, { align: 'right' });
      doc.setTextColor(...DARK);
      y += 6;
    });
  }

  doc.save(opts.filename ?? `${opts.title.toLowerCase().replace(/\s+/g, '-')}-${now.toISOString().slice(0, 10)}.pdf`);
}

// ── CSV (download via data URI — no server round-trip needed for current data) ──
export function downloadCsvData(
  title: string,
  headers: string[],
  rows: (string | number)[][],
  filename?: string,
) {
  const now = new Date();
  const meta = [
    [`"${title}"`],
    [`"Généré le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR')}"`],
    [],
    headers.map((h) => `"${h}"`),
    ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`)),
  ];
  const csv = '﻿' + meta.map((row) => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `${title.toLowerCase().replace(/\s+/g, '-')}-${now.toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
