import { useState, useEffect } from "react";
import CashierLayout from "@/components/layout/CashierLayout";
import TablePagination from "@/components/TablePagination";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ShoppingCart } from "lucide-react";

const API_URL = "http://localhost:3000";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

interface TransactionData {
  _id: string;
  invoiceNumber: string;
  items: { productName: string; qty: number; price: number; subtotal: number }[];
  totalAmount: number;
  paymentAmount: number;
  changeAmount: number;
  paymentMethod: string;
  totalItems: number;
  createdAt: string;
}

const Transactions = () => {
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  const fetchTransactions = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      params.append("page", String(currentPage));
      params.append("limit", "8");

      const res = await fetch(`${API_URL}/api/transactions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setTransactions(json.data);
        if (json.pagination) {
          setTotalPages(json.pagination.totalPages);
          setTotalItems(json.pagination.total);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [searchQuery, currentPage, token]);

  const getMethodBadge = (method: string) => {
    switch (method) {
      case "cash": return <Badge className="bg-emerald-500/10 text-emerald-500 border-0">Cash</Badge>;
      case "debit": return <Badge className="bg-blue-500/10 text-blue-500 border-0">Debit</Badge>;
      case "qris": return <Badge className="bg-purple-500/10 text-purple-500 border-0">QRIS</Badge>;
      default: return <Badge variant="secondary">{method}</Badge>;
    }
  };

  return (
    <CashierLayout title="Riwayat Transaksi">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Riwayat Transaksi
                </CardTitle>
                <CardDescription>Daftar transaksi penjualan</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nomor invoice..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>

            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Invoice</TableHead>
                    <TableHead>Waktu</TableHead>
                    <TableHead className="text-center">Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Bayar</TableHead>
                    <TableHead>Kembalian</TableHead>
                    <TableHead>Metode</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Memuat data...</TableCell>
                    </TableRow>
                  ) : transactions.length > 0 ? (
                    transactions.map((t) => (
                      <TableRow key={t._id}>
                        <TableCell className="font-mono text-sm">{t.invoiceNumber}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(t.createdAt).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </TableCell>
                        <TableCell className="text-center font-bold">{t.totalItems}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(t.totalAmount)}</TableCell>
                        <TableCell>{formatCurrency(t.paymentAmount)}</TableCell>
                        <TableCell className="text-emerald-500">{formatCurrency(t.changeAmount)}</TableCell>
                        <TableCell>{getMethodBadge(t.paymentMethod)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Belum ada transaksi</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              showing={transactions.length}
              onPageChange={setCurrentPage}
              label="transaksi"
            />
          </CardContent>
        </Card>
      </div>
    </CashierLayout>
  );
};

export default Transactions;
