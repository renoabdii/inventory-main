import { useState, useEffect } from "react";
import { toast } from "sonner";

import TablePagination from "@/components/TablePagination";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import DashboardLayout from "@/components/layout/DashboardLayout";

const API_URL = "http://localhost:3000";

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
  supplier: { _id: string; name: string; supplierId: string };
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

/* FORMAT RUPIAH */
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
};

/* =========================
   PAGE
========================= */

const PurchaseOrders = () => {
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [orders, setOrders] = useState<PurchaseOrderData[]>([]);
  const [stats, setStats] = useState<POStats>({ total: 0, pending: 0, shipping: 0, completed: 0 });
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
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

  /* FETCH ORDERS */
  const fetchOrders = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      params.append("page", String(currentPage));
      params.append("limit", "5");

      const res = await fetch(`${API_URL}/api/purchase-orders?${params}`, {
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
  };

  /* FETCH SUPPLIERS */
  const fetchSuppliers = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/suppliers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setSuppliers(json.data.filter((s: SupplierOption & { status: string }) => s.status === "ACTIVE"));
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  /* FETCH PRODUCTS */
  const fetchProducts = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setProducts(json.data);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
  }, [token]);

  useEffect(() => {
    fetchOrders();
  }, [searchQuery, currentPage, token]);

  /* FORM HANDLERS */
  const handleItemChange = (index: number, field: string, value: string) => {
    setFormItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
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
      const res = await fetch(`${API_URL}/api/purchase-orders`, {
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

  /* UPDATE STATUS via FSM event */
  const handleUpdateStatus = async (id: string, event: string) => {
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
      const res = await fetch(`${API_URL}/api/purchase-orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ event }),
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
      const res = await fetch(`${API_URL}/api/purchase-orders/${id}`, {
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
                        <Select value={formData.supplierId} onValueChange={(val) => setFormData((prev) => ({ ...prev, supplierId: val }))}>
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
                        <Button type="button" variant="outline" size="sm" onClick={addItemRow}>
                          <Plus className="w-3 h-3 mr-1" /> Tambah Item
                        </Button>
                      </div>
                      {formItems.map((item, index) => (
                        <div key={index} className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Select value={item.product} onValueChange={(val) => handleItemChange(index, "product", val)}>
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
                          <div className="w-20">
                            <Input type="number" placeholder="Qty" value={item.qty} onChange={(e) => handleItemChange(index, "qty", e.target.value)} />
                          </div>
                          <div className="w-28">
                            <Input type="number" placeholder="Harga" value={item.price} onChange={(e) => handleItemChange(index, "price", e.target.value)} />
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
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari nomor PO atau supplier..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
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
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Memuat data...</TableCell>
                    </TableRow>
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
                              {getAvailableEvents(item.status).map((action) => (
                                <DropdownMenuItem
                                  key={action.event}
                                  className="gap-2"
                                  onClick={() => handleUpdateStatus(item._id, action.event)}
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
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Tidak ada purchase order</TableCell>
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
      <ConfirmDialogComponent />
    </DashboardLayout>
  );
};

export default PurchaseOrders;
