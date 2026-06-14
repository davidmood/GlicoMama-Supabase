import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { GlucoseRecord } from '../types';
import type { LibreReading } from './libre';

interface CgmRanges {
  targetMin: number;
  targetMax: number;
  attentionMax: number;
}

interface ExportPdfOptions {
  libreReadings?: LibreReading[];
  ranges?: CgmRanges;
  periodLabel?: string;
}

export function exportToCSV(records: GlucoseRecord[]): void {
  const headers = [
    'Data/Hora',
    'Refeição',
    'Pré (mg/dL)',
    'Pós 1h',
    'Pós 2h',
    'Insulina (U)',
    'Tipo Insulina',
    'Carb (g)',
    'Amamentação',
    'Duração (min)',
    'Quantidade (ml)',
    'Lado',
    'Descrição Refeição',
    'Sintomas',
    'Observações',
    'Humor Bebê',
    'Sono Bebê',
  ];

  const escapeCSV = (val: string) => val.includes(';') || val.includes('"') || val.includes('\n') ? `"${val.replace(/"/g, '""')}"` : val;

  const rows = records.map((r) => [
    format(new Date(r.timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
    r.mealType,
    r.glucosePre ?? '',
    r.glucosePos1h ?? '',
    r.glucosePos2h ?? '',
    r.insulinApplied ?? '',
    r.insulinType,
    r.carbohydrates ?? '',
    r.breastfeedingType,
    r.breastfeedingDuration ?? '',
    r.extractedAmount ?? '',
    r.breastSide ?? '',
    escapeCSV(r.foodDescription || ''),
    escapeCSV(r.symptoms || ''),
    escapeCSV(r.notes || ''),
    r.babyMood ?? '',
    escapeCSV(r.babySleep || ''),
  ]);

  const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `glicemia_registros_${format(new Date(), 'yyyy-MM-dd')}.csv`);
}

async function loadLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch('/logo.png');
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportToPDF(records: GlucoseRecord[], userName: string, options?: ExportPdfOptions): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape' });

  const logoBase64 = await loadLogoBase64();

  let headerTextX = 14;
  let headerTextY = 22;

  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', 14, 8, 20, 20);
    headerTextX = 38;
    headerTextY = 18;
  }

  doc.setFontSize(18);
  doc.setTextColor(107, 33, 168);
  doc.text('GlicoMama - Relatório', headerTextX, headerTextY);

  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text('Acompanhamento de glicemia, maternidade e amamentação', headerTextX, headerTextY + 5);

  const infoY = logoBase64 ? 32 : 30;

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Paciente: ${userName}`, 14, infoY);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, infoY + 6);
  doc.text(`Total de registros: ${records.length}`, 14, infoY + 12);

  let statsY = infoY + 18;
  if (options?.periodLabel) {
    doc.text(`Período: ${options.periodLabel}`, 14, statsY);
    statsY += 6;
  }

  const preValues = records.filter((r) => r.glucosePre).map((r) => r.glucosePre!);
  if (preValues.length > 0) {
    const avg = preValues.reduce((a, b) => a + b, 0) / preValues.length;
    const inRange = preValues.filter((v) => v >= 70 && v <= 140).length;
    const pct = ((inRange / preValues.length) * 100).toFixed(0);
    doc.text(`Média glicêmica: ${avg.toFixed(0)} mg/dL | Tempo em faixa: ${pct}%`, 14, statsY);
    statsY += 6;
  }

  doc.setDrawColor(107, 33, 168);
  doc.setLineWidth(0.5);
  doc.line(14, statsY, doc.internal.pageSize.width - 14, statsY);

  let cursorY = statsY + 6;

  // CGM (FreeStyle Libre) summary — only when there are sensor readings.
  const libreReadings = options?.libreReadings ?? [];
  if (libreReadings.length > 0) {
    const ranges = options?.ranges ?? { targetMin: 70, targetMax: 180, attentionMax: 250 };
    const vals = libreReadings.map((r) => r.glucoseValue);
    const n = vals.length;
    const avgL = Math.round(vals.reduce((a, b) => a + b, 0) / n);
    const variance = vals.reduce((a, b) => a + (b - avgL) ** 2, 0) / n;
    const cv = Math.round((Math.sqrt(variance) / avgL) * 100);
    const gmi = (3.31 + 0.02392 * avgL).toFixed(1);

    const low = vals.filter((v) => v < ranges.targetMin).length;
    const inR = vals.filter((v) => v >= ranges.targetMin && v <= ranges.targetMax).length;
    const att = vals.filter((v) => v > ranges.targetMax && v <= ranges.attentionMax).length;
    const high = vals.filter((v) => v > ranges.attentionMax).length;
    const pctOf = (x: number) => Math.round((x / n) * 100);

    const times = libreReadings.map((r) => new Date(r.timestamp).getTime());
    const dStart = format(new Date(Math.min(...times)), 'dd/MM');
    const dEnd = format(new Date(Math.max(...times)), 'dd/MM');
    const daysWith = new Set(libreReadings.map((r) => format(new Date(r.timestamp), 'yyyy-MM-dd'))).size;

    doc.setFontSize(12);
    doc.setTextColor(107, 33, 168);
    doc.text('Resumo CGM (FreeStyle Libre)', 14, cursorY);
    cursorY += 6;

    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(
      `Período: ${dStart}–${dEnd}  |  Dias com dados: ${daysWith}  |  Leituras: ${n}  |  Média: ${avgL} mg/dL  |  GMI: ${gmi}%  |  CV: ${cv}%`,
      14,
      cursorY,
    );
    cursorY += 6;

    // Time in Range bar
    const barX = 14;
    const barW = 180;
    const barH = 6;
    const segments = [
      { pct: pctOf(low), rgb: [59, 130, 246] as [number, number, number] },
      { pct: pctOf(inR), rgb: [34, 197, 94] as [number, number, number] },
      { pct: pctOf(att), rgb: [245, 158, 11] as [number, number, number] },
      { pct: pctOf(high), rgb: [239, 68, 68] as [number, number, number] },
    ];
    let segX = barX;
    segments.forEach((s) => {
      const w = (barW * s.pct) / 100;
      if (w > 0) {
        doc.setFillColor(s.rgb[0], s.rgb[1], s.rgb[2]);
        doc.rect(segX, cursorY, w, barH, 'F');
        if (w > 12) {
          doc.setFontSize(7);
          doc.setTextColor(255);
          doc.text(`${s.pct}%`, segX + w / 2, cursorY + 4.2, { align: 'center' });
        }
        segX += w;
      }
    });
    cursorY += barH + 5;

    // Legend
    const legend = [
      { label: `Baixa (< ${ranges.targetMin})`, rgb: [59, 130, 246] as [number, number, number] },
      { label: `Em faixa (${ranges.targetMin}–${ranges.targetMax})`, rgb: [34, 197, 94] as [number, number, number] },
      { label: `Atenção (${ranges.targetMax + 1}–${ranges.attentionMax})`, rgb: [245, 158, 11] as [number, number, number] },
      { label: `Alta (> ${ranges.attentionMax})`, rgb: [239, 68, 68] as [number, number, number] },
    ];
    let legX = barX;
    doc.setFontSize(7);
    legend.forEach((l) => {
      doc.setFillColor(l.rgb[0], l.rgb[1], l.rgb[2]);
      doc.rect(legX, cursorY - 2.5, 3, 3, 'F');
      doc.setTextColor(80);
      doc.text(l.label, legX + 4.5, cursorY);
      legX += doc.getTextWidth(l.label) + 12;
    });
    cursorY += 5;

    // Per-day mini table
    const byDay: Record<string, number[]> = {};
    libreReadings.forEach((r) => {
      const key = format(new Date(r.timestamp), 'yyyy-MM-dd');
      (byDay[key] ||= []).push(r.glucoseValue);
    });
    const dayRows = Object.keys(byDay)
      .sort()
      .map((key) => {
        const dv = byDay[key];
        const dAvg = Math.round(dv.reduce((a, b) => a + b, 0) / dv.length);
        const dIn = dv.filter((v) => v >= ranges.targetMin && v <= ranges.targetMax).length;
        return [
          format(new Date(`${key}T12:00:00`), 'dd/MM'),
          `${dAvg}`,
          `${Math.round((dIn / dv.length) * 100)}%`,
          `${Math.min(...dv)}`,
          `${Math.max(...dv)}`,
          `${dv.length}`,
        ];
      });

    autoTable(doc, {
      startY: cursorY,
      head: [['Dia', 'Média', 'TIR%', 'Mín', 'Máx', 'Leituras']],
      body: dayRows,
      theme: 'grid',
      headStyles: { fillColor: [14, 165, 233], textColor: 255, fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      styles: { cellPadding: 1.5 },
      margin: { left: 14 },
      tableWidth: 120,
    });

    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY;
    cursorY = finalY + 6;

    doc.setDrawColor(107, 33, 168);
    doc.line(14, cursorY, doc.internal.pageSize.width - 14, cursorY);
    cursorY += 4;
  }

  const tableData = records.map((r) => [
    format(new Date(r.timestamp), 'dd/MM HH:mm'),
    r.mealType,
    r.glucosePre ?? '-',
    r.glucosePos1h ?? '-',
    r.glucosePos2h ?? '-',
    r.insulinApplied ? `${r.insulinApplied} U` : '-',
    r.carbohydrates ? `${r.carbohydrates} g` : '-',
    r.breastfeedingType !== 'Não realizou' ? r.breastfeedingType : '-',
    r.breastfeedingDuration ? `${r.breastfeedingDuration} min` : '-',
    r.extractedAmount ? `${r.extractedAmount} ml` : '-',
    r.foodDescription || '-',
    r.notes || '-',
  ]);

  autoTable(doc, {
    startY: cursorY,
    head: [['Data', 'Refeição', 'Pré', 'Pós 1h', 'Pós 2h', 'Insulina', 'Carb', 'Amament.', 'Duração', 'Qtd (ml)', 'Desc. Refeição', 'Observações']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [107, 33, 168], textColor: 255, fontSize: 7 },
    bodyStyles: { fontSize: 6 },
    alternateRowStyles: { fillColor: [245, 243, 255] },
    styles: { cellPadding: 2 },
    columnStyles: {
      10: { cellWidth: 40 },
      11: { cellWidth: 40 },
    },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(180);
    const pageH = doc.internal.pageSize.height;
    const pageW = doc.internal.pageSize.width;
    doc.text('GlicoMama - Este documento não substitui orientação médica profissional', 14, pageH - 8);
    doc.text(`Página ${i} de ${pageCount}`, pageW - 40, pageH - 8);
    doc.setTextColor(120);
    doc.text(
      'Legenda: TIR = Tempo em Faixa (% das leituras no alvo)  |  GMI = HbA1c estimada pela média glicêmica  |  CV = variabilidade glicêmica (≤ 36% = estável)',
      14,
      pageH - 4,
    );
  }

  doc.save(`glicemia_relatorio_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
