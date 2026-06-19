import { Loader2 } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface PageLoadingProps {
  message?: string;
}

interface TableLoadingRowsProps {
  columns: number;
  rows?: number;
}

interface ListLoadingProps {
  rows?: number;
}

export const PageLoading = ({ message = "Memuat data..." }: PageLoadingProps) => (
  <div className="flex min-h-64 items-center justify-center">
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      <span>{message}</span>
    </div>
  </div>
);

export const TableLoadingRows = ({ columns, rows = 5 }: TableLoadingRowsProps) => (
  <>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <TableRow key={`loading-row-${rowIndex}`}>
        {Array.from({ length: columns }).map((__, columnIndex) => (
          <TableCell key={`loading-cell-${rowIndex}-${columnIndex}`} className="h-14">
            <Skeleton
              className={
                columnIndex === columns - 1
                  ? "ml-auto h-4 w-8"
                  : columnIndex === 0
                  ? "h-4 w-32"
                  : "h-4 w-24"
              }
            />
          </TableCell>
        ))}
      </TableRow>
    ))}
  </>
);

export const ListLoading = ({ rows = 3 }: ListLoadingProps) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={`list-loading-${index}`} className="flex items-center justify-between rounded-lg border p-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-4 w-14" />
      </div>
    ))}
  </div>
);
