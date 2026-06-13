import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import CashierLayout from "@/components/layout/CashierLayout";
import TablePagination from "@/components/TablePagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Banknote, Clock, LockKeyhole, Play, ReceiptText, WalletCards } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

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

interface CashierShift {
  _id: string;
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

const CashierShiftPage = () => {
  const [activeShift, setActiveShift] = useState<CashierShift | null>(null);
  const [history, setHistory] = useState<CashierShift[]>([]);
  const [openingCash, setOpeningCash] = useState("");
  const [closingCash, setClosingCash] = useState("");
  const [note, setNote] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const fetchActiveShift = async () => {
    if (!token) return;
    const res = await fetch(`${API_BASE_URL}/api/cashier-shifts/active`, { headers });
    const json = await res.json();
    if (json.success) setActiveShift(json.data);
  };

  const fetchHistory = async () => {
    if (!token) return;
    const res = await fetch(`${API_BASE_URL}/api/cashier-shifts?page=${currentPage}&limit=8`, {
      headers,
    });
    const json = await res.json();
    if (json.success) {
      setHistory(json.data);
      setTotalPages(json.pagination?.totalPages || 1);
      setTotalItems(json.pagination?.total || 0);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchActiveShift(), fetchHistory()]);
    } catch (error) {
      toast.error("Gagal memuat data shift");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [token, currentPage]);

  const handleOpenShift = async () => {
    if (!token) return;

    const cash = Number(openingCash || 0);
    if (cash < 0) {
      toast.warning("Modal kas tidak boleh minus");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/cashier-shifts/open`, {
        method: "POST",
        headers,
        body: JSON.stringify({ openingCash: cash, note }),
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.message || "Gagal membuka shift");
        return;
      }

      toast.success("Shift berhasil dibuka");
      setOpeningCash("");
      setNote("");
      await refreshData();
    } catch (error) {
      toast.error("Terjadi kesalahan saat membuka shift");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async () => {
    if (!token || !activeShift) return;

    const cash = Number(closingCash);
    if (!closingCash || Number.isNaN(cash) || cash < 0) {
      toast.warning("Kas akhir wajib diisi dengan benar");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/cashier-shifts/close`, {
        method: "POST",
        headers,
        body: JSON.stringify({ closingCash: cash, note }),
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.message || "Gagal menutup shift");
        return;
      }

      toast.success("Shift berhasil ditutup");
      setClosingCash("");
      setNote("");
      await refreshData();
    } catch (error) {
      toast.error("Terjadi kesalahan saat menutup shift");
    } finally {
      setLoading(false);
    }
  };

  const expectedCash = activeShift?.expectedCash || 0;
  const closingDifference = closingCash ? Number(closingCash) - expectedCash : 0;

  return (
    <CashierLayout title="Shift Kasir">
      <div className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="xl:col-span-2">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Shift Aktif
                  </CardTitle>
                  <CardDescription>Kontrol buka dan tutup sesi kerja kasir</CardDescription>
                </div>
                <Badge
                  className={
                    activeShift
                      ? "bg-emerald-500/10 text-emerald-600 border-0"
                      : "bg-slate-500/10 text-slate-600 border-0"
                  }
                >
                  {activeShift ? "Aktif" : "Belum Dibuka"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {activeShift ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">Mulai Shift</p>
                      <p className="font-bold mt-1">{formatDateTime(activeShift.openedAt)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">Modal Kas</p>
                      <p className="font-bold mt-1">{formatCurrency(activeShift.openingCash)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">Transaksi</p>
                      <p className="font-bold mt-1">{activeShift.totalTransactions}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">Item Terjual</p>
                      <p className="font-bold mt-1">{activeShift.totalItems}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <ReceiptText className="w-4 h-4" />
                        <p className="text-sm">Total Penjualan</p>
                      </div>
                      <p className="text-xl font-bold mt-2">{formatCurrency(activeShift.totalSales)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Banknote className="w-4 h-4" />
                        <p className="text-sm">Cash</p>
                      </div>
                      <p className="text-xl font-bold mt-2">{formatCurrency(activeShift.cashSales)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <WalletCards className="w-4 h-4" />
                        <p className="text-sm">Non-cash</p>
                      </div>
                      <p className="text-xl font-bold mt-2">{formatCurrency(activeShift.nonCashSales)}</p>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="font-medium">Tutup Shift</p>
                        <p className="text-sm text-muted-foreground">
                          Kas sistem: {formatCurrency(expectedCash)}
                        </p>
                      </div>
                      {closingCash && (
                        <Badge
                          className={
                            closingDifference === 0
                              ? "bg-emerald-500/10 text-emerald-600 border-0"
                              : "bg-amber-500/10 text-amber-600 border-0"
                          }
                        >
                          Selisih {formatCurrency(closingDifference)}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="closingCash">Kas akhir fisik</Label>
                        <Input
                          id="closingCash"
                          type="number"
                          value={closingCash}
                          onChange={(event) => setClosingCash(event.target.value)}
                          placeholder="Contoh: 500000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="closeNote">Catatan</Label>
                        <Input
                          id="closeNote"
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                          placeholder="Opsional"
                        />
                      </div>
                    </div>

                    <Button onClick={handleCloseShift} disabled={loading} className="gap-2">
                      <LockKeyhole className="w-4 h-4" />
                      {loading ? "Menyimpan..." : "Tutup Shift"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="openingCash">Modal kas awal</Label>
                      <Input
                        id="openingCash"
                        type="number"
                        value={openingCash}
                        onChange={(event) => setOpeningCash(event.target.value)}
                        placeholder="Contoh: 200000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="openNote">Catatan</Label>
                      <Textarea
                        id="openNote"
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder="Opsional"
                        className="min-h-10"
                      />
                    </div>
                  </div>

                  <Button onClick={handleOpenShift} disabled={loading} className="gap-2">
                    <Play className="w-4 h-4" />
                    {loading ? "Menyimpan..." : "Buka Shift"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Catatan Kas</CardTitle>
              <CardDescription>Rumus penutupan shift</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground">Kas sistem</p>
                <p className="font-semibold">Modal awal + penjualan cash</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground">Selisih kas</p>
                <p className="font-semibold">Kas akhir fisik - kas sistem</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground">Non-cash</p>
                <p className="font-semibold">Debit dan QRIS dipisah dari uang tunai</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Riwayat Shift</CardTitle>
            <CardDescription>Daftar shift yang pernah dibuka kasir</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Mulai</TableHead>
                    <TableHead>Selesai</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transaksi</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Cash</TableHead>
                    <TableHead>Kas Akhir</TableHead>
                    <TableHead>Selisih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-28 text-center text-muted-foreground">
                        Memuat data shift...
                      </TableCell>
                    </TableRow>
                  ) : history.length > 0 ? (
                    history.map((shift) => (
                      <TableRow key={shift._id}>
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
                        <TableCell className="font-medium">{shift.totalTransactions}</TableCell>
                        <TableCell>{formatCurrency(shift.totalSales)}</TableCell>
                        <TableCell>{formatCurrency(shift.cashSales)}</TableCell>
                        <TableCell>{formatCurrency(shift.closingCash)}</TableCell>
                        <TableCell
                          className={
                            shift.cashDifference === 0
                              ? "text-muted-foreground"
                              : shift.cashDifference > 0
                                ? "text-emerald-600"
                                : "text-red-500"
                          }
                        >
                          {formatCurrency(shift.cashDifference)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-28 text-center text-muted-foreground">
                        Belum ada riwayat shift
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
              showing={history.length}
              onPageChange={setCurrentPage}
              label="shift"
            />
          </CardContent>
        </Card>
      </div>
    </CashierLayout>
  );
};

export default CashierShiftPage;
