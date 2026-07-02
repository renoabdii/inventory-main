import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import TablePagination from "@/components/TablePagination";
import { TableLoadingRows } from "@/components/LoadingState";
import { API_BASE_URL } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Banknote, Clock, ReceiptText, WalletCards } from "lucide-react";

interface CashierShift {
  _id: string;
  cashier?: {
    _id: string;
    username: string;
  };
  openedAt: string;
  closedAt?: string | null;
  openingCash: number;
  closingCash: number;
  expectedCash: number;
  cashDifference: number;
  totalSales: number;
  cashSales: number;
  nonCashSales: number;
  totalTransactions: number;
  totalItems: number;
  status: "open" | "closed";
  note?: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value || 0);

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const CashierShiftAudit = () => {
  const [shifts, setShifts] = useState<CashierShift[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  const fetchShifts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: "10",
      });

      const res = await fetch(`${API_BASE_URL}/api/cashier-shifts?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();

      if (json.success) {
        setShifts(json.data);
        setTotalPages(json.pagination?.totalPages || 1);
        setTotalItems(json.pagination?.total || 0);
      }
    } catch (error) {
      console.error("Error fetching cashier shifts:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, token]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const summary = useMemo(
    () =>
      shifts.reduce(
        (acc, shift) => {
          acc.totalSales += shift.totalSales;
          acc.cashSales += shift.cashSales;
          acc.nonCashSales += shift.nonCashSales;
          acc.totalTransactions += shift.totalTransactions;
          acc.openShift += shift.status === "open" ? 1 : 0;
          acc.difference += shift.cashDifference;
          return acc;
        },
        {
          totalSales: 0,
          cashSales: 0,
          nonCashSales: 0,
          totalTransactions: 0,
          openShift: 0,
          difference: 0,
        }
      ),
    [shifts]
  );

  return (
    <DashboardLayout title="Audit Shift Kasir">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-3">
                  <ReceiptText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transaksi</p>
                  <p className="text-2xl font-bold">{summary.totalTransactions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-500/10 p-3">
                  <Banknote className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cash</p>
                  <p className="text-xl font-bold">{formatCurrency(summary.cashSales)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-500/10 p-3">
                  <WalletCards className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">QRIS</p>
                  <p className="text-xl font-bold">{formatCurrency(summary.nonCashSales)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-500/10 p-3">
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Shift Aktif</p>
                  <p className="text-2xl font-bold">{summary.openShift}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Riwayat Shift Kasir</CardTitle>
            <CardDescription>
              Audit buka/tutup shift, kas sistem, kas fisik, dan selisih kasir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Kasir</TableHead>
                    <TableHead>Buka</TableHead>
                    <TableHead>Tutup</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Transaksi</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Cash</TableHead>
                    <TableHead className="text-right">QRIS</TableHead>
                    <TableHead className="text-right">Kas Sistem</TableHead>
                    <TableHead className="text-right">Kas Fisik</TableHead>
                    <TableHead className="text-right">Selisih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableLoadingRows columns={11} />
                  ) : shifts.length > 0 ? (
                    shifts.map((shift) => (
                      <TableRow key={shift._id}>
                        <TableCell className="font-medium">
                          {shift.cashier?.username || "-"}
                        </TableCell>
                        <TableCell>{formatDateTime(shift.openedAt)}</TableCell>
                        <TableCell>{formatDateTime(shift.closedAt)}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              shift.status === "open"
                                ? "bg-emerald-500/10 text-emerald-600 border-0"
                                : "bg-slate-500/10 text-slate-600 border-0"
                            }
                          >
                            {shift.status === "open" ? "Aktif" : "Tutup"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {shift.totalTransactions}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(shift.totalSales)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(shift.cashSales)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(shift.nonCashSales)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(shift.expectedCash)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(shift.closingCash)}</TableCell>
                        <TableCell
                          className={
                            shift.cashDifference === 0
                              ? "text-right text-muted-foreground"
                              : shift.cashDifference > 0
                              ? "text-right font-medium text-emerald-600"
                              : "text-right font-medium text-red-500"
                          }
                        >
                          {formatCurrency(shift.cashDifference)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={11} className="h-32 text-center text-muted-foreground">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">Belum ada shift kasir</p>
                          <p className="text-sm">Shift akan muncul setelah kasir membuka sesi kerja.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              showing={shifts.length}
              onPageChange={setCurrentPage}
              label="shift"
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CashierShiftAudit;
