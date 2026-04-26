import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, Sheet } from "lucide-react";
import { ExportRow, PdfMeta, exportCSV, exportPDF } from "@/lib/export";

interface Props {
  rows: ExportRow[];
  meta: PdfMeta;
  filenameBase: string;
  disabled?: boolean;
  size?: "sm" | "default";
}

export default function ExportMenu({ rows, meta, filenameBase, disabled, size = "sm" }: Props) {
  const hasRows = rows.length > 0;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size} disabled={disabled || !hasRows}>
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportCSV(rows, `${filenameBase}.csv`)}>
          <Sheet className="h-4 w-4" />
          CSV ({rows.length} rows)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportPDF(rows, meta, `${filenameBase}.pdf`)}>
          <FileText className="h-4 w-4" />
          PDF report
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
