import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

import TablePagination from "@/components/TablePagination";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { TableLoadingRows } from "@/components/LoadingState";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/useDebounce";

import { API_BASE_URL } from "@/lib/api";
import { formatCurrency, parseCurrencyInput } from "@/lib/currency";

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
import { Textarea } from "@/components/ui/textarea";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Label } from "@/components/ui/label";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Search,
  Plus,
  MoreVertical,
  Trash2,
  Truck,
  Package,
  ShoppingCart,
  Clock3,
  CheckCircle2,
  XCircle,
  ArrowRight,
  MessageCircle,
} from "lucide-react";

/* =========================
   TYPES
========================= */

interface POItem {
  product: string;
  productName: string;
  qty: number;
  price: number;
}

interface PurchaseOrderData {
  _id: string;
  poNumber: string;
  supplier: { _id: string; name: string; supplierId: string; phone?: string };
  items: POItem[];
  totalAmount: number;
  totalItems: number;
  status: string;
  createdAt: string;
}

interface POStats {
  total: number;
  pending: number;
  shipping: number;
  completed: number;
}

interface SupplierOption {
  _id: string;
  name: string;
  supplierId: string;
}

interface ProductOption {
  _id: string;
  name: string;
  sku: string;
  price: number;
}

/* =========================
   STATUS BADGE
========================= */

const getStatusBadge = (status: string) => {
  switch (status) {
    case "PENDING":
      return (
        <Badge className="bg-yellow-500/10 text-yellow-500 border-0 gap-1">
          <Clock3 className="w-3 h-3" />
          PENDING
        </Badge>
      );
    case "APPROVED":
      return (
        <Badge className="bg-blue-500/10 text-blue-500 border-0 gap-1">
          <CheckCircle2 className="w-3 h-3" />
          APPROVED
        </Badge>
      );
    case "SHIPPING":
      return (
        <Badge className="bg-primary/10 text-primary border-0 gap-1">
          <Truck className="w-3 h-3" />
          SHIPPING
        </Badge>
      );
    case "COMPLETED":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-500 border-0 gap-1">
          <Package className="w-3 h-3" />
          COMPLETED
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge className="bg-red-500/10 text-red-500 border-0 gap-1">
          <XCircle className="w-3 h-3" />
          CANCELLED
        </Badge>
      );
    default:
      return <Badge>UNKNOWN</Badge>;
  }
};

const normalizeWhatsAppPhone = (phone?: string) => {
  const cleaned = String(phone || "").replace(/\D/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("0")) return `62${cleaned.slice(1)}`;
  if (cleaned.startsWith("62")) return cleaned;
  return cleaned;
};

const buildWhatsAppMessage = (order: PurchaseOrderData) => {
  const itemLines = order.items
    .map((item, index) => {
      const subtotal = item.qty * item.price;
      return `${index + 1}. ${item.productName} - ${item.qty} pcs x ${formatCurrency(item.price)} = ${formatCurrency(subtotal)}`;
    })
    .join("\n");

  return [
    `Halo ${order.supplier?.name || "Supplier"},`,
    "",
    "Kami ingin melakukan Purchase Order dengan detail berikut:",
    "",
    `No PO: ${order.poNumber}`,
    `Tanggal: ${new Date(order.createdAt).toLocaleDateString("id-ID")}`,
    "",
    "Daftar Barang:",
    itemLines,
    "",
    `Total: ${formatCurrency(order.totalAmount)}`,
    "",
    "Mohon konfirmasi ketersediaan barang dan estimasi pengiriman.",
    "",
    "Terima kasih.",
    "Ely Berkah Mart",
  ].join("\n");
};

/* =========================
   PAGE
========================= */

const PurchaseOrders = () => {
  const location = useLocation();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [orders, setOrders] = useState<PurchaseOrderData[]>([]);
  const [createdOrderPrompt, setCreatedOrderPrompt] = useState<PurchaseOrderData | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [statusDialog, setStatusDialog] = useState<{ id: string; event: string; label: string } | null>(null);
  const [statusNote, setStatusNote] = useState("");
  const [stats, setStats] = useState<POStats>({ total: 0, pending: 0, shipping: 0, completed: 0 });
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Form
  const [formData, setFormData] = useState({ poNumber: "", supplierId: "", note: "" });
  const [formItems, setFormItems] = useState<{ product: string; qty: string; price: string }[]>([
    { product: "", qty: "", price: "" },
  ]);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const status = new URLSearchParams(location.search).get("status");
    if (status) setStatusFilter(status);
  }, [location.search]);

  /* FETCH ORDERS */
  const fetchOrders = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearchQuery) params.append("search", debouncedSearchQuery);
      if (statusFilter !== "all") params.append("status", statusFilter);
      params.append("page", String(currentPage));
      params.append("limit", "5");

      const res = await fetch(`${API_BASE_URL}/api/purchase-orders?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setOrders(json.data);
        setStats(json.stats);
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
  }, [currentPage, debouncedSearchQuery, statusFilter, token]);

  /* FETCH SUPPLIERS */
  const fetchSuppliers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/suppliers?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setSuppliers(json.data.filter((s: SupplierOption & { status: string }) => s.status === "ACTIVE"));
      }
    } catch (error) {
      console.error("Error:", error);
    }
  }, [token]);

  /* FETCH PRODUCTS */
  const fetchProducts = useCallback(async (supplierId: string) => {
    if (!token || !supplierId) return;
    setProductsLoading(true);
    try {
      const params = new URLSearchParams({
        supplierId,
        page: "1",
        limit: "100",
      });
      const res = await fetch(`${API_BASE_URL}/api/products?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setProducts(json.data);
      } else {
        setProducts([]);
        toast.error(json.message || "Gagal memuat produk supplier");
      }
    } catch (error) {
      console.error("Error:", error);
      setProducts([]);
      toast.error("Gagal memuat produk supplier");
    } finally {
      setProductsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    if (formData.supplierId) {
      fetchProducts(formData.supplierId);
    } else {
      setProducts([]);
      setProductsLoading(false);
    }
  }, [fetchProducts, formData.supplierId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  /* FORM HANDLERS */
  const handleSupplierChange = (supplierId: string) => {
    setFormData((prev) => ({ ...prev, supplierId }));
    setProducts([]);
    setFormItems([{ product: "", qty: "", price: "" }]);
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    setFormItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: field === "price" ? parseCurrencyInput(value) : value,
      };
      // Auto-fill price from product
      if (field === "product") {
        const prod = products.find((p) => p._id === value);
        if (prod) updated[index].price = String(prod.price);
      }
      return updated;
    });
  };

  const addItemRow = () => {
    setFormItems((prev) => [...prev, { product: "", qty: "", price: "" }]);
  };

  const removeItemRow = (index: number) => {
    if (formItems.length <= 1) return;
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  /* CREATE PO */
  const handleSubmit = async () => {
    if (!formData.poNumber || !formData.supplierId) {
      toast.warning("Nomor PO dan Supplier wajib diisi!");
      return;
    }
    const validItems = formItems.filter((i) => i.product && i.qty && i.price);
    if (validItems.length === 0) {
      toast.warning("Minimal 1 item harus diisi!");
      return;
    }
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/purchase-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          poNumber: formData.poNumber,
          supplierId: formData.supplierId,
          note: formData.note,
          items: validItems.map((i) => ({ product: i.product, qty: Number(i.qty), price: Number(i.price) })),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Purchase Order berhasil dibuat!");
        setCreatedOrderPrompt(json.data);
        setFormData({ poNumber: "", supplierId: "", note: "" });
        setFormItems([{ product: "", qty: "", price: "" }]);
        setIsDialogOpen(false);
        fetchOrders();
      } else {
        toast.error("Gagal: " + (json.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Terjadi kesalahan");
    }
  };

  const handleSendWhatsApp = async (id: string) => {
    if (!token) return;

    const popup = window.open("about:blank", "_blank");

    try {
      const res = await fetch(`${API_BASE_URL}/api/purchase-orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();

      if (!json.success) {
        popup?.close();
        toast.error(json.message || "Gagal mengambil detail PO");
        return;
      }

      const order = json.data as PurchaseOrderData;
      const phone = normalizeWhatsAppPhone(order.supplier?.phone);

      if (!phone) {
        popup?.close();
        toast.warning("Nomor WhatsApp supplier belum diisi.");
        return;
      }

      const message = buildWhatsAppMessage(order);
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

      if (popup) {
        popup.location.href = url;
      } else {
        window.open(url, "_blank");
      }
    } catch (error) {
      popup?.close();
      console.error("Error:", error);
      toast.error("Gagal membuka WhatsApp");
    }
  };

  /* UPDATE STATUS via FSM event */
  const handleUpdateStatus = async (id: string, event: string, note = "") => {
    const messages: Record<string, string> = {
      approve: "Approve PO ini?",
      ship: "Ubah status ke Shipping?",
      complete: "Selesaikan PO ini? Stock produk akan otomatis bertambah.",
      cancel: "Batalkan PO ini?",
    };

    const confirmed = await confirm({
      title: "Update Status",
      description: messages[event] || "Ubah status?",
      confirmText: event === "cancel" ? "Ya, Batalkan" : "Ya, Lanjutkan",
      variant: event === "cancel" ? "destructive" : "default",
    });
    if (!confirmed) return;
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/purchase-orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ event, note }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Status berhasil diupdate!");
        fetchOrders();
      } else {
        toast.error("Gagal: " + (json.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Terjadi kesalahan");
    }
  };

  const openStatusDialog = (id: string, event: string, label: string) => {
    setStatusDialog({ id, event, label });
    setStatusNote("");
  };

  const submitStatusDialog = () => {
    if (!statusDialog) return;
    handleUpdateStatus(statusDialog.id, statusDialog.event, statusNote);
    setStatusDialog(null);
    setStatusNote("");
  };

  /* DELETE */
  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "Hapus Purchase Order",
      description: "Yakin ingin menghapus PO ini?",
      confirmText: "Ya, Hapus",
      variant: "destructive",
    });
    if (!confirmed) return;
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/purchase-orders/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        toast.success("PO berhasil dihapus!");
        fetchOrders();
      } else {
        toast.error("Gagal: " + (json.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Terjadi kesalahan");
    }
  };

  /* FSM events per status */
  const getAvailableEvents = (current: string) => {
    const map: Record<string, { event: string; label: string }[]> = {
      PENDING: [
        { event: "approve", label: "Approve" },
        { event: "cancel", label: "Batalkan" },
      ],
      APPROVED: [
        { event: "ship", label: "Shipping" },
        { event: "cancel", label: "Batalkan" },
      ],
      SHIPPING: [
        { event: "complete", label: "Selesai" },
      ],
      COMPLETED: [],
      CANCELLED: [],
    };
    return map[current] || [];
  };

  return (
    <DashboardLayout title="Purchase Orders">
      <div className="space-y-6">
        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total PO</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-yellow-500/10">
                  <Clock3 className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-500/10">
                  <Truck className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Shipping</p>
                  <p className="text-2xl font-bold">{stats.shipping}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/10">
                  <Package className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-5">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm font-medium">1. Buat PO</p>
                <p className="text-xs text-muted-foreground">Admin memilih supplier dan barang yang akan dipesan.</p>
              </div>
              <div>
                <p className="text-sm font-medium">2. Approve</p>
                <p className="text-xs text-muted-foreground">PO disetujui sebelum barang dikirim supplier.</p>
              </div>
              <div>
                <p className="text-sm font-medium">3. Shipping</p>
                <p className="text-xs text-muted-foreground">Barang sedang dalam proses pengiriman.</p>
              </div>
              <div>
                <p className="text-sm font-medium">4. Completed</p>
                <p className="text-xs text-muted-foreground">Sistem membuat Barang Masuk dan menambah stok otomatis.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TABLE */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Purchase Orders</CardTitle>
                <CardDescription>Kelola pemesanan barang dari supplier</CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Buat PO
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Buat Purchase Order</DialogTitle>
                    <DialogDescription>Tambahkan purchase order baru</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Nomor PO</Label>
                        <Input
                          placeholder="PO-2026-005"
                          value={formData.poNumber}
                          onChange={(e) => setFormData((prev) => ({ ...prev, poNumber: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Supplier</Label>
                        <Select value={formData.supplierId} onValueChange={handleSupplierChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih supplier" />
                          </SelectTrigger>
                          <SelectContent>
                            {suppliers.map((s) => (
                              <SelectItem key={s._id} value={s._id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Catatan (opsional)</Label>
                      <Input
                        placeholder="Catatan untuk PO ini"
                        value={formData.note}
                        onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
                      />
                    </div>

                    {/* Items */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Daftar Barang</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addItemRow}
                          disabled={!formData.supplierId || productsLoading || products.length === 0}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Tambah Item
                        </Button>
                      </div>
                      {!formData.supplierId && (
                        <p className="text-sm text-muted-foreground">Pilih supplier dulu untuk melihat daftar produk.</p>
                      )}
                      {formData.supplierId && productsLoading && (
                        <div className="space-y-2 rounded-lg border p-3">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      )}
                      {formData.supplierId && !productsLoading && products.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          Belum ada produk aktif yang dihubungkan dengan supplier ini. Hubungkan supplier di halaman Inventory terlebih dahulu.
                        </p>
                      )}
                      {formItems.map((item, index) => (
                        <div key={index} className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Select
                              value={item.product}
                              onValueChange={(val) => handleItemChange(index, "product", val)}
                              disabled={!formData.supplierId || productsLoading || products.length === 0}
                            >
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={
                                    formData.supplierId
                                      ? productsLoading
                                        ? "Memuat produk..."
                                        : products.length > 0
                                        ? "Pilih produk"
                                        : "Belum ada produk supplier ini"
                                      : "Pilih supplier dulu"
                                  }
                                />
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
                          <div className="w-20">
                            <Input type="number" placeholder="Qty" value={item.qty} onChange={(e) => handleItemChange(index, "qty", e.target.value)} />
                          </div>
                          <div className="w-28">
                            <Input
                              inputMode="numeric"
                              placeholder="Rp 0"
                              value={item.price ? formatCurrency(Number(item.price)) : ""}
                              onChange={(e) => handleItemChange(index, "price", e.target.value)}
                            />
                          </div>
                          {formItems.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-red-500" onClick={() => removeItemRow(index)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                    <Button onClick={handleSubmit}>Buat PO</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>

          <CardContent>
            <div className="flex flex-col md:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Cari nomor PO atau supplier..." className="pl-10" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
              </div>
              <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setCurrentPage(1); }}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="SHIPPING">Shipping</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Nomor PO</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-center">Item</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableLoadingRows columns={7} />
                  ) : orders.length > 0 ? (
                    orders.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell className="font-medium">{item.poNumber}</TableCell>
                        <TableCell>{item.supplier?.name || "-"}</TableCell>
                        <TableCell className="text-center font-bold">{item.totalItems}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(item.totalAmount)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString("id-ID")}
                        </TableCell>
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
                                onClick={() => handleSendWhatsApp(item._id)}
                              >
                                <MessageCircle className="w-4 h-4" />
                                Kirim WhatsApp
                              </DropdownMenuItem>
                              {getAvailableEvents(item.status).map((action) => (
                                <DropdownMenuItem
                                  key={action.event}
                                  className="gap-2"
                                  onClick={() => openStatusDialog(item._id, action.event, action.label)}
                                >
                                  <ArrowRight className="w-4 h-4" />
                                  {action.label}
                                </DropdownMenuItem>
                              ))}
                              {item.status === "PENDING" && (
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
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">Belum ada purchase order</p>
                          <p className="text-sm">Buat PO pertama untuk proses restock dari supplier.</p>
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
              showing={orders.length}
              onPageChange={setCurrentPage}
              label="purchase order"
            />
          </CardContent>
        </Card>
      </div>
      <Dialog open={!!statusDialog} onOpenChange={(open) => !open && setStatusDialog(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{statusDialog?.label} Purchase Order</DialogTitle>
            <DialogDescription>Tambahkan catatan agar riwayat approval lebih jelas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Catatan</Label>
            <Textarea
              placeholder="Contoh: disetujui karena stok sudah menipis"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStatusDialog(null)}>Batal</Button>
            <Button onClick={submitStatusDialog}>Simpan Status</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createdOrderPrompt} onOpenChange={(open) => !open && setCreatedOrderPrompt(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>PO Berhasil Dibuat</DialogTitle>
            <DialogDescription>
              Kirim detail purchase order ke supplier lewat WhatsApp sekarang.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">Nomor PO</p>
            <p className="font-semibold">{createdOrderPrompt?.poNumber}</p>
            <p className="mt-3 text-sm text-muted-foreground">Supplier</p>
            <p className="font-semibold">{createdOrderPrompt?.supplier?.name || "-"}</p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreatedOrderPrompt(null)}>
              Nanti
            </Button>
            <Button
              className="gap-2"
              onClick={() => {
                if (createdOrderPrompt) {
                  handleSendWhatsApp(createdOrderPrompt._id);
                }
                setCreatedOrderPrompt(null);
              }}
            >
              <MessageCircle className="w-4 h-4" />
              Kirim WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialogComponent />
    </DashboardLayout>
  );
};

export default PurchaseOrders;
