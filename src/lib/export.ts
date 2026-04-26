// CSV + PDF exporters for facility result sets.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { FacilityDetail, FacilitySlim } from "@/data/facilities";

export interface ExportRow {
  facility: FacilitySlim;
  detail?: FacilityDetail;
  reasons?: string[];
}

function escapeCsv(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportCSV(rows: ExportRow[], filename = "sehat-atlas-results.csv") {
  const header = [
    "id",
    "name",
    "facility_type",
    "state",
    "district",
    "pin",
    "beds",
    "claimed_services",
    "evidenced_services",
    "trust_score",
    "contradictions",
    "missing_evidence",
    "open_24_7",
    "top_citation",
    "match_reasons",
  ];
  const lines = [header.join(",")];
  for (const { facility: f, detail, reasons } of rows) {
    lines.push(
      [
        f.id,
        f.name,
        f.facilityType,
        f.state,
        f.district,
        f.pin,
        f.beds ?? "",
        f.claimed.join("|"),
        f.evidenced.join("|"),
        f.trust,
        f.contraN,
        f.missN,
        f.open247 ? "yes" : "no",
        detail?.citations?.[0]?.text ?? "",
        (reasons ?? []).join("|"),
      ]
        .map(escapeCsv)
        .join(","),
    );
  }
  downloadBlob(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }), filename);
}

export interface PdfMeta {
  title: string;
  subtitle?: string;
  query?: string;
  source?: string;
}

export function exportPDF(rows: ExportRow[], meta: PdfMeta, filename = "sehat-atlas-report.pdf") {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(31, 41, 99); // primary indigo
  doc.rect(0, 0, pageWidth, 64, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("Sehat Atlas", 32, 28);
  doc.setFontSize(10);
  doc.setTextColor(220, 230, 255);
  doc.text("Agentic Healthcare Maps for India", 32, 46);

  // Title block
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(14);
  doc.text(meta.title, 32, 92);
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 120);
  let y = 110;
  if (meta.subtitle) {
    doc.text(meta.subtitle, 32, y);
    y += 12;
  }
  if (meta.query) {
    doc.text(`Query: "${meta.query}"`, 32, y);
    y += 12;
  }
  doc.text(
    `Generated: ${new Date().toLocaleString()}${meta.source ? ` · Source: ${meta.source}` : ""}`,
    32,
    y,
  );
  y += 10;

  // Summary table
  autoTable(doc, {
    startY: y + 8,
    head: [["#", "Facility", "Location", "Type", "Trust", "Flags", "Beds"]],
    body: rows.map(({ facility: f }, i) => [
      String(i + 1),
      f.name,
      `${f.district || "—"}, ${f.state}`,
      f.facilityType,
      String(f.trust),
      String(f.contraN),
      f.beds != null ? String(f.beds) : "—",
    ]),
    headStyles: { fillColor: [31, 41, 99], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 250, 253] },
    margin: { left: 32, right: 32 },
  });

  // Per-facility detail
  for (const { facility: f, detail, reasons } of rows) {
    // @ts-expect-error – autoTable mutates `lastAutoTable` on the doc
    const lastY: number = doc.lastAutoTable?.finalY ?? y;
    if (lastY > 700) doc.addPage();
    // @ts-expect-error – see above
    let cursor: number = (doc.lastAutoTable?.finalY ?? y) + 22;
    if (cursor > 720) {
      doc.addPage();
      cursor = 60;
    }

    doc.setFontSize(11);
    doc.setTextColor(20, 20, 30);
    doc.text(f.name, 32, cursor);
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 120);
    cursor += 12;
    doc.text(
      `${f.district || "—"}, ${f.state}${f.pin ? ` · PIN ${f.pin}` : ""} · ${f.facilityType} · Trust ${f.trust}${
        f.contraN ? ` · ${f.contraN} contradiction(s)` : ""
      }`,
      32,
      cursor,
    );
    cursor += 14;

    if (reasons && reasons.length) {
      doc.setTextColor(60, 60, 70);
      doc.text(`Why matched: ${reasons.join(" • ")}`, 32, cursor, { maxWidth: pageWidth - 64 });
      cursor += 14;
    }

    if (detail?.citations?.length) {
      doc.setTextColor(31, 41, 99);
      doc.text("Citations:", 32, cursor);
      cursor += 12;
      doc.setTextColor(60, 60, 70);
      for (const c of detail.citations.slice(0, 3)) {
        const lines = doc.splitTextToSize(`• [${c.field}] ${c.text}`, pageWidth - 80) as string[];
        for (const line of lines) {
          if (cursor > 770) {
            doc.addPage();
            cursor = 60;
          }
          doc.text(line, 40, cursor);
          cursor += 11;
        }
      }
    }

    if (detail?.contradictions?.length) {
      if (cursor > 750) {
        doc.addPage();
        cursor = 60;
      }
      doc.setTextColor(180, 30, 30);
      doc.text("Validator flags:", 32, cursor);
      cursor += 12;
      doc.setTextColor(60, 60, 70);
      for (const c of detail.contradictions) {
        const lines = doc.splitTextToSize(`• ${c.claim} — ${c.evidence}`, pageWidth - 80) as string[];
        for (const line of lines) {
          if (cursor > 770) {
            doc.addPage();
            cursor = 60;
          }
          doc.text(line, 40, cursor);
          cursor += 11;
        }
      }
    }

    // separator
    if (cursor < 760) {
      doc.setDrawColor(220, 220, 230);
      doc.line(32, cursor + 4, pageWidth - 32, cursor + 4);
    }
  }

  // Footer with page numbers
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 160);
    doc.text(`Sehat Atlas · page ${p} of ${pages}`, pageWidth - 32, 820, { align: "right" });
  }

  doc.save(filename);
}
