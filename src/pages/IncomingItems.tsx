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
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, PackagePlus, TrendingUp, Clock, Calendar, MoreVertical, CheckCircle, Trash2, Eye, XCircle } from "lucide-react";

import { API_BASE_URL } from "@/lib/api";

/* =========================
   TYPES
========================= */

interface IncomingItemDetail {
  product: string;
  productName: string;
  qty: number;
  status: string;
}

interface IncomingHistory {
  from?: string;
  to: string;
  event: string;
  note?: string;
  changedAt: string;
}

interface IncomingItemData {
  _id: string;
  receiptId: string;
  date: string;
  supplier: string;
  source?: "manual" | "purchase_order";
  reference?: string;
  items: IncomingItemDetail[];
  status: string;
  statusHistory?: IncomingHistory[];
  totalItems: number;
  totalQty: number;
  createdAt: string;
}

interface ProductOption {
  _id: string;
  name: string;
  sku: string;
}

interface SupplierOption {
  _id: string;
  name: string;
  supplierId: string;
  status: string;
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
      return <Badge className="bg-emerald-500/10 text-emerald-500 border-0">Terverifikasi</Badge>;
    case "pending":
      return <Badge className="bg-yellow-500/10 text-yellow-500 border-0">Menunggu</Badge>;
    case "in_progress":
      return <Badge className="bg-blue-500/10 text-blue-500 border-0">Pengecekan</Badge>;
    case "cancelled":
      return <Badge className="bg-slate-500/10 text-slate-500 border-0">Dibatalkan</Badge>;
    case "rejected":
      return <Badge className="bg-red-500/10 text-red-500 border-0">Ditolak</Badge>;
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
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [incomingData, setIncomingData] = useState<IncomingItemData[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [selectedIncoming, setSelectedIncoming] = useState<IncomingItemData | null>(null);
  const [statusDialog, setStatusDialog] = useState<{ id: string; event: string; title: string } | null>(null);
  const [statusNote, setStatusNote] = useState("");
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

      const res = await fetch(`${API_BASE_URL}/api/incoming-items?${params}`, {
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

  const fetchSuppliers = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/suppliers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setSuppliers(json.data.filter((supplier: SupplierOption) => supplier.status === "ACTIVE"));
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    }
  };

  /* =========================
     FETCH PRODUCTS (for dropdown)
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
    fetchSuppliers();
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
      const res = await fetch(`${API_BASE_URL}/api/incoming-items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiptId: formData.receiptId,
          date: formData.date,
          supplier: formData.supplier,
          source: "manual",
          reference: formData.receiptId,
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
  const handleUpdateStatus = async (id: string, event: string, note = "") => {
    if (!token) return;

    const confirmed = await confirm({
      title: "Update Status",
      description: event === "complete"
        ? "Verifikasi penerimaan ini? Stock produk akan otomatis bertambah."
        : event === "cancel"
        ? "Batalkan penerimaan ini?"
        : event === "reject"
        ? "Tolak penerimaan ini?"
        : "Mulai pengecekan barang?",
      confirmText: "Ya, Lanjutkan",
      variant: event === "cancel" || event === "reject" ? "destructive" : "default",
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/incoming-items/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ event, note }),
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

  const openStatusDialog = (id: string, event: string, title: string) => {
    setStatusDialog({ id, event, title });
    setStatusNote("");
  };

  const submitStatusDialog = () => {
    if (!statusDialog) return;
    handleUpdateStatus(statusDialog.id, statusDialog.event, statusNote);
    setStatusDialog(null);
    setStatusNote("");
  };

  const openDetail = (item: IncomingItemData) => {
    setSelectedIncoming(item);
    setIsDetailOpen(true);
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
      const res = await fetch(`${API_BASE_URL}/api/incoming-items/${id}`, {
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
                      <Select
                        value={formData.supplier}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, supplier: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier._id} value={supplier.name}>
                              {supplier.name} ({supplier.supplierId})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                  <SelectItem value="completed">Terverifikasi</SelectItem>
                  <SelectItem value="pending">Menunggu</SelectItem>
                  <SelectItem value="in_progress">Pengecekan</SelectItem>
                  <SelectItem value="cancelled">Dibatalkan</SelectItem>
                  <SelectItem value="rejected">Ditolak</SelectItem>
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
                    <TableHead>Sumber</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Total Qty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
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
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant="secondary">
                              {item.source === "purchase_order" ? "PO" : "Manual"}
                            </Badge>
                            {item.reference && (
                              <p className="text-xs text-muted-foreground">{item.reference}</p>
                            )}
                          </div>
                        </TableCell>
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
                              <DropdownMenuItem
                                className="gap-2"
                                onClick={() => openDetail(item)}
                              >
                                <Eye className="w-4 h-4" />
                                Detail
                              </DropdownMenuItem>
                              {item.status === "pending" && (
                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() => handleUpdateStatus(item._id, "process")}
                                >
                                  <Clock className="w-4 h-4" />
                                  Mulai Cek
                                </DropdownMenuItem>
                              )}
                              {(item.status === "pending" || item.status === "in_progress") && (
                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() => openStatusDialog(item._id, "complete", "Verifikasi Barang")}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Verifikasi
                                </DropdownMenuItem>
                              )}
                              {item.status === "pending" && (
                                <DropdownMenuItem
                                  className="gap-2 text-red-500 focus:text-red-500"
                                  onClick={() => openStatusDialog(item._id, "cancel", "Batalkan Penerimaan")}
                                >
                                  <XCircle className="w-4 h-4" />
                                  Batalkan
                                </DropdownMenuItem>
                              )}
                              {item.status === "in_progress" && (
                                <DropdownMenuItem
                                  className="gap-2 text-red-500 focus:text-red-500"
                                  onClick={() => openStatusDialog(item._id, "reject", "Tolak Penerimaan")}
                                >
                                  <XCircle className="w-4 h-4" />
                                  Tolak
                                </DropdownMenuItem>
                              )}
                              {item.status !== "completed" && item.status !== "cancelled" && item.status !== "rejected" && (
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
                      <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
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
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>Detail Penerimaan</DialogTitle>
            <DialogDescription>Rincian barang masuk dan riwayat status</DialogDescription>
          </DialogHeader>

          {selectedIncoming && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">ID Penerimaan</p>
                  <p className="font-medium">{selectedIncoming.receiptId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  {getStatusBadge(selectedIncoming.status)}
                </div>
                <div>
                  <p className="text-muted-foreground">Supplier</p>
                  <p className="font-medium">{selectedIncoming.supplier}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Sumber</p>
                  <p className="font-medium">
                    {selectedIncoming.source === "purchase_order" ? "Purchase Order" : "Manual"}
                    {selectedIncoming.reference ? ` - ${selectedIncoming.reference}` : ""}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Produk</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedIncoming.items.map((item) => (
                      <TableRow key={`${selectedIncoming._id}-${item.productName}`}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell className="text-right font-medium">{item.qty}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {item.status === "verified" ? "Verified" : "Pending"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div>
                <p className="font-medium mb-2">Riwayat FSM</p>
                <div className="space-y-2">
                  {selectedIncoming.statusHistory && selectedIncoming.statusHistory.length > 0 ? (
                    selectedIncoming.statusHistory.map((history, index) => (
                      <div key={`${history.event}-${index}`} className="rounded-lg border p-3 text-sm">
                        <div className="flex justify-between gap-3">
                          <p className="font-medium">
                            {history.from || "awal"} {"->"} {history.to}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(history.changedAt).toLocaleString("id-ID")}
                          </p>
                        </div>
                        {history.note && (
                          <p className="text-muted-foreground mt-1">{history.note}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Belum ada riwayat status.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!statusDialog} onOpenChange={(open) => !open && setStatusDialog(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{statusDialog?.title}</DialogTitle>
            <DialogDescription>Tambahkan catatan perubahan status FSM.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Catatan</Label>
            <Textarea
              placeholder="Contoh: barang sesuai dengan surat jalan"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStatusDialog(null)}>
              Batal
            </Button>
            <Button onClick={submitStatusDialog}>
              Simpan Status
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialogComponent />
    </DashboardLayout>
  );
};

export default IncomingItems;
