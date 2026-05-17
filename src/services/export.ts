import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { GlucoseRecord } from '../types';

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

export async function exportToPDF(records: GlucoseRecord[], userName: string): Promise<void> {
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

  const preValues = records.filter((r) => r.glucosePre).map((r) => r.glucosePre!);
  let statsY = infoY + 18;
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
    r.foodDescription || '-',
    r.notes || '-',
  ]);

  autoTable(doc, {
    startY: statsY + 4,
    head: [['Data', 'Refeição', 'Pré', 'Pós 1h', 'Pós 2h', 'Insulina', 'Carb', 'Amament.', 'Duração', 'Desc. Refeição', 'Observações']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [107, 33, 168], textColor: 255, fontSize: 7 },
    bodyStyles: { fontSize: 6 },
    alternateRowStyles: { fillColor: [245, 243, 255] },
    styles: { cellPadding: 2 },
    columnStyles: {
      9: { cellWidth: 40 },
      10: { cellWidth: 40 },
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
