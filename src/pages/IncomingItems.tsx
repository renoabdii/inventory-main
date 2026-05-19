import { useState, useEffect } from "react";
import { toast } from "sonner";
import TablePagination from "@/components/TablePagination";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, PackagePlus, TrendingUp, Clock, Calendar, MoreVertical, CheckCircle, Trash2 } from "lucide-react";

const API_URL = "http://localhost:3000";

/* =========================
   TYPES
========================= */

interface IncomingItemDetail {
  product: string;
  productName: string;
  qty: number;
  status: string;
}

interface IncomingItemData {
  _id: string;
  receiptId: string;
  date: string;
  supplier: string;
  items: IncomingItemDetail[];
  status: string;
  totalItems: number;
  totalQty: number;
  createdAt: string;
}

interface ProductOption {
  _id: string;
  name: string;
  sku: string;
}

interface IncomingStats {
  todayQty: number;
  weekQty: number;
  pending: number;
}

/* =========================
   BADGE STATUS
========================= */

const getStatusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return <Badge className="bg-emerald-500/10 text-emerald-500 border-0">Selesai</Badge>;
    case "pending":
      return <Badge className="bg-yellow-500/10 text-yellow-500 border-0">Menunggu</Badge>;
    case "in_progress":
      return <Badge className="bg-blue-500/10 text-blue-500 border-0">Proses</Badge>;
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
};

/* =========================
   PAGE
========================= */

const IncomingItems = () => {
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [incomingData, setIncomingData] = useState<IncomingItemData[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [stats, setStats] = useState<IncomingStats>({ todayQty: 0, weekQty: 0, pending: 0 });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    receiptId: "",
    date: "",
    supplier: "",
  });
  const [formItems, setFormItems] = useState<{ product: string; qty: string }[]>([
    { product: "", qty: "" },
  ]);

  const token = localStorage.getItem("token");

  /* =========================
     FETCH INCOMING ITEMS
  ========================= */
  const fetchIncomingItems = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter !== "all") params.append("status", statusFilter);
      params.append("page", String(currentPage));
      params.append("limit", "5");

      const res = await fetch(`${API_URL}/api/incoming-items?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setIncomingData(json.data);
        setStats(json.stats);
        if (json.pagination) {
          setTotalPages(json.pagination.totalPages);
          setTotalItems(json.pagination.total);
        }
      }
    } catch (error) {
      console.error("Error fetching incoming items:", error);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     FETCH PRODUCTS (for dropdown)
  ========================= */
  const fetchProducts = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/products`, {
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
    fetchIncomingItems();
  }, [searchQuery, statusFilter, currentPage, token]);

  /* =========================
     FORM HANDLERS
  ========================= */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    setFormItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addItemRow = () => {
    setFormItems((prev) => [...prev, { product: "", qty: "" }]);
  };

  const removeItemRow = (index: number) => {
    if (formItems.length <= 1) return;
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  /* =========================
     HANDLE CREATE
  ========================= */
  const handleSubmit = async () => {
    if (!formData.receiptId || !formData.date || !formData.supplier) {
      toast.warning("ID Penerimaan, Tanggal, dan Supplier wajib diisi!");
      return;
    }

    const validItems = formItems.filter((i) => i.product && i.qty);
    if (validItems.length === 0) {
      toast.warning("Minimal 1 item harus diisi!");
      return;
    }

    if (!token) {
      toast.error("Token tidak ditemukan. Silakan login kembali.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/incoming-items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiptId: formData.receiptId,
          date: formData.date,
          supplier: formData.supplier,
          items: validItems.map((i) => ({ product: i.product, qty: Number(i.qty) })),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Penerimaan barang berhasil ditambahkan!");
        setFormData({ receiptId: "", date: "", supplier: "" });
        setFormItems([{ product: "", qty: "" }]);
        setIsDialogOpen(false);
        fetchIncomingItems();
      } else {
        toast.error("Gagal: " + (json.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error creating incoming item:", error);
      toast.error("Terjadi kesalahan");
    }
  };

  /* =========================
     HANDLE UPDATE STATUS (FSM)
  ========================= */
  const handleUpdateStatus = async (id: string, event: string) => {
    if (!token) return;

    const confirmed = await confirm({
      title: "Update Status",
      description: event === "complete"
        ? "Selesaikan penerimaan ini? Stock produk akan otomatis bertambah."
        : "Ubah status ke Proses?",
      confirmText: "Ya, Lanjutkan",
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_URL}/api/incoming-items/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ event }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Status berhasil diupdate!");
        fetchIncomingItems();
      } else {
        toast.error("Gagal: " + (json.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Terjadi kesalahan");
    }
  };

  /* =========================
     HANDLE DELETE
  ========================= */
  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "Hapus Penerimaan",
      description: "Yakin ingin menghapus penerimaan ini?",
      confirmText: "Ya, Hapus",
      variant: "destructive",
    });
    if (!confirmed) return;
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/incoming-items/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Penerimaan berhasil dihapus!");
        fetchIncomingItems();
      } else {
        toast.error("Gagal: " + (json.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Terjadi kesalahan");
    }
  };

  return (
    <DashboardLayout title="Barang Masuk">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <PackagePlus className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hari Ini</p>
                  <p className="text-xl font-bold">{stats.todayQty} unit</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Minggu Ini</p>
                  <p className="text-xl font-bold">{stats.weekQty} unit</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Menunggu Verifikasi</p>
                  <p className="text-xl font-bold">{stats.pending} penerimaan</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Table */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Riwayat Penerimaan</CardTitle>
                <CardDescription>Daftar penerimaan barang dari supplier</CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Tambah Penerimaan
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Tambah Penerimaan Barang</DialogTitle>
                    <DialogDescription>
                      Isi form untuk menambahkan penerimaan barang baru
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>ID Penerimaan</Label>
                      <Input
                        name="receiptId"
                        placeholder="Contoh: RCV-008"
                        value={formData.receiptId}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Tanggal</Label>
                      <Input
                        name="date"
                        type="date"
                        value={formData.date}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Supplier</Label>
                      <Input
                        name="supplier"
                        placeholder="Contoh: PT Indofood Sukses Makmur"
                        value={formData.supplier}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* Items */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Daftar Barang</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addItemRow}>
                          <Plus className="w-3 h-3 mr-1" /> Tambah Item
                        </Button>
                      </div>

                      {formItems.map((item, index) => (
                        <div key={index} className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Select
                              value={item.product}
                              onValueChange={(val) => handleItemChange(index, "product", val)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih produk" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((p) => (
                                  <SelectItem key={p._id} value={p._id}>
                                    {p.name} ({p.sku})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-24">
                            <Input
                              type="number"
                              placeholder="Qty"
                              value={item.qty}
                              onChange={(e) => handleItemChange(index, "qty", e.target.value)}
                            />
                          </div>
                          {formItems.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 text-red-500"
                              onClick={() => removeItemRow(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Batal
                    </Button>
                    <Button onClick={handleSubmit}>Tambah Penerimaan</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari ID atau supplier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="completed">Selesai</SelectItem>
                  <SelectItem value="pending">Menunggu</SelectItem>
                  <SelectItem value="in_progress">Proses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>ID</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Total Qty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                        Memuat data...
                      </TableCell>
                    </TableRow>
                  ) : incomingData.length > 0 ? (
                    incomingData.map((item) => (
                      <TableRow key={item._id} className="border-border/50">
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {item.receiptId}
                        </TableCell>
                        <TableCell className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {new Date(item.date).toLocaleDateString("id-ID")}
                        </TableCell>
                        <TableCell className="font-medium">{item.supplier}</TableCell>
                        <TableCell className="text-right">{item.totalItems}</TableCell>
                        <TableCell className="text-right font-medium">{item.totalQty}</TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {item.status === "pending" && (
                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() => handleUpdateStatus(item._id, "process")}
                                >
                                  <Clock className="w-4 h-4" />
                                  Proses
                                </DropdownMenuItem>
                              )}
                              {(item.status === "pending" || item.status === "in_progress") && (
                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() => handleUpdateStatus(item._id, "complete")}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Selesaikan
                                </DropdownMenuItem>
                              )}
                              {item.status !== "completed" && (
                                <DropdownMenuItem
                                  className="gap-2 text-red-500 focus:text-red-500"
                                  onClick={() => handleDelete(item._id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Hapus
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                        Tidak ada data penerimaan
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
              showing={incomingData.length}
              onPageChange={setCurrentPage}
              label="penerimaan"
            />
          </CardContent>
        </Card>
      </div>
      <ConfirmDialogComponent />
    </DashboardLayout>
  );
};

export default IncomingItems;
