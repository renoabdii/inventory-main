import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

import TablePagination from "@/components/TablePagination";
import DashboardLayout from "@/components/layout/DashboardLayout";

import { API_BASE_URL } from "@/lib/api";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Label } from "@/components/ui/label";

import {
  Search,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  AlertTriangle,
  Package,
} from "lucide-react";

/* =========================
   TYPES
========================= */

interface MovementData {
  _id: string;
  product: string;
  productName: string;
  sku: string;
  type: "IN" | "OUT";
  qty: number;
  stockBefore: number;
  stockAfter: number;
  previousState: string;
  newState: string;
  reference?: string;
  note?: string;
  createdAt: string;
}

interface MovementStats {
  total: number;
  stockIn: number;
  stockOut: number;
  statusChanges: number;
}

interface ProductOption {
  _id: string;
  name: string;
  sku: string;
  stock: number;
}

/* =========================
   STATUS BADGE
========================= */

const getStateBadge = (state: string) => {
  switch (state) {
    case "NORMAL":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-500 border-0">
          Stok Aman
        </Badge>
      );
    case "LOW":
      return (
        <Badge className="bg-yellow-500/10 text-yellow-500 border-0">
          Stok Menipis
        </Badge>
      );
    case "CRITICAL":
      return (
        <Badge className="bg-red-500/10 text-red-500 border-0">
          Hampir Habis
        </Badge>
      );
    case "OUT_OF_STOCK":
      return (
        <Badge className="bg-gray-500/10 text-gray-500 border-0">
          Stok Habis
        </Badge>
      );
    default:
      return <Badge>Unknown</Badge>;
  }
};

/* =========================
   MOVEMENT BADGE
========================= */

const getMovementBadge = (type: string) => {
  switch (type) {
    case "IN":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-500 border-0 gap-1">
          <ArrowDownCircle className="w-3 h-3" />
          Barang Masuk
        </Badge>
      );
    case "OUT":
      return (
        <Badge className="bg-red-500/10 text-red-500 border-0 gap-1">
          <ArrowUpCircle className="w-3 h-3" />
          Barang Keluar
        </Badge>
      );
    default:
      return <Badge>Unknown</Badge>;
  }
};

/* =========================
   PAGE
========================= */

const StockMovement = () => {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [movementData, setMovementData] = useState<MovementData[]>([]);
  const [stats, setStats] = useState<MovementStats>({ total: 0, stockIn: 0, stockOut: 0, statusChanges: 0 });
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Dialog state
  const [isOutDialogOpen, setIsOutDialogOpen] = useState(false);
  const [outForm, setOutForm] = useState({ productId: "", qty: "", note: "" });

  const token = localStorage.getItem("token");

  useEffect(() => {
    const type = new URLSearchParams(location.search).get("type");
    if (type === "IN" || type === "OUT") {
      setFilterType(type);
    }
  }, [location.search]);

  /* =========================
     FETCH MOVEMENTS
  ========================= */
  const fetchMovements = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (filterType !== "all") params.append("type", filterType);
      params.append("page", String(currentPage));
      params.append("limit", "5");

      const res = await fetch(`${API_BASE_URL}/api/stock-movements?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setMovementData(json.data);
        setStats(json.stats);
        if (json.pagination) {
          setTotalPages(json.pagination.totalPages);
          setTotalItems(json.pagination.total);
        }
      }
    } catch (error) {
      console.error("Error fetching movements:", error);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     FETCH PRODUCTS
  ========================= */
  const fetchProducts = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setProducts(json.data);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  /* =========================
     USEEFFECT
  ========================= */
  useEffect(() => {
    fetchProducts();
  }, [token]);

  useEffect(() => {
    fetchMovements();
  }, [searchQuery, filterType, currentPage, token]);

  /* =========================
     HANDLE STOCK OUT
  ========================= */
  const handleStockOut = async () => {
    if (!outForm.productId || !outForm.qty) {
      toast.warning("Produk dan jumlah wajib diisi!");
      return;
    }

    if (!token) {
      toast.error("Token tidak ditemukan. Silakan login kembali.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/stock-movements/out`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: outForm.productId,
          qty: Number(outForm.qty),
          note: outForm.note || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Barang keluar berhasil dicatat!");
        setOutForm({ productId: "", qty: "", note: "" });
        setIsOutDialogOpen(false);
        fetchMovements();
        fetchProducts();
      } else {
        toast.error("Gagal: " + (json.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error creating stock out:", error);
      toast.error("Terjadi kesalahan");
    }
  };

  return (
    <DashboardLayout title="Pergerakan Stok">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10">
                  <ArrowLeftRight className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Aktivitas</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/10">
                  <ArrowDownCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Barang Masuk</p>
                  <p className="text-2xl font-bold">{stats.stockIn}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-red-500/10">
                  <ArrowUpCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Barang Keluar</p>
                  <p className="text-2xl font-bold">{stats.stockOut}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-yellow-500/10">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Perubahan Status</p>
                  <p className="text-2xl font-bold">{stats.statusChanges}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-5">
            <div className="space-y-3">
              <h3 className="font-semibold">Monitoring Status Stok</h3>
              <p className="text-sm text-muted-foreground">
                Sistem otomatis memantau kondisi stok barang berdasarkan jumlah stok yang tersedia.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {getStateBadge("NORMAL")}
                <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
                {getStateBadge("LOW")}
                <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
                {getStateBadge("CRITICAL")}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Riwayat Pergerakan Stok</CardTitle>
                <CardDescription>
                  Riwayat barang masuk, keluar, dan perubahan status stok
                </CardDescription>
              </div>

              {/* Stock Out Dialog */}
              <Dialog open={isOutDialogOpen} onOpenChange={setIsOutDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Package className="w-4 h-4" />
                    Barang Keluar
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Catat Barang Keluar</DialogTitle>
                    <DialogDescription>
                      Kurangi stok produk secara manual
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Produk</Label>
                      <Select
                        value={outForm.productId}
                        onValueChange={(val) => setOutForm((prev) => ({ ...prev, productId: val }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih produk" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p._id} value={p._id}>
                              {p.name} ({p.sku}) - Stok: {p.stock}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Jumlah</Label>
                      <Input
                        type="number"
                        placeholder="Jumlah barang keluar"
                        value={outForm.qty}
                        onChange={(e) => setOutForm((prev) => ({ ...prev, qty: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Catatan (opsional)</Label>
                      <Input
                        placeholder="Contoh: Penjualan harian"
                        value={outForm.note}
                        onChange={(e) => setOutForm((prev) => ({ ...prev, note: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsOutDialogOpen(false)}>
                      Batal
                    </Button>
                    <Button onClick={handleStockOut}>Simpan</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>

          <CardContent>
            {/* Filter */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari produk atau SKU..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full md:w-52">
                  <SelectValue placeholder="Filter Aktivitas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="IN">Barang Masuk</SelectItem>
                  <SelectItem value="OUT">Barang Keluar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Produk</TableHead>
                    <TableHead>Aktivitas</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead>Perubahan Status</TableHead>
                    <TableHead>Detail Stok</TableHead>
                    <TableHead>Tanggal</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        Memuat data...
                      </TableCell>
                    </TableRow>
                  ) : movementData.length > 0 ? (
                    movementData.map((item) => (
                      <TableRow key={item._id}>
                        {/* Product */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center">
                              <Package className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{item.productName}</p>
                              <p className="text-xs text-muted-foreground">{item.sku}</p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Movement */}
                        <TableCell>{getMovementBadge(item.type)}</TableCell>

                        {/* Qty */}
                        <TableCell
                          className={`text-right font-bold ${
                            item.type === "IN" ? "text-emerald-500" : "text-red-500"
                          }`}
                        >
                          {item.type === "IN" ? `+${item.qty}` : `-${item.qty}`}
                        </TableCell>

                        {/* Status Change */}
                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            {getStateBadge(item.previousState)}
                            <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
                            {getStateBadge(item.newState)}
                          </div>
                        </TableCell>

                        {/* Stock Detail */}
                        <TableCell>
                          <div className="text-sm">
                            <p>
                              Sebelum: <span className="font-medium">{item.stockBefore}</span>
                            </p>
                            <p>
                              Sesudah: <span className="font-medium">{item.stockAfter}</span>
                            </p>
                          </div>
                        </TableCell>

                        {/* Date */}
                        <TableCell className="text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        Tidak ada data aktivitas
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Footer */}
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              showing={movementData.length}
              onPageChange={setCurrentPage}
              label="data aktivitas"
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StockMovement;
