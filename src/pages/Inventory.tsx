import { useState, useEffect } from "react";
import { toast } from "sonner";
import TablePagination from "@/components/TablePagination";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  Filter,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Package,
  AlertTriangle,
} from "lucide-react";

/* =========================
   API UTILITIES
========================= */

/* =========================
   BADGE STATUS
========================= */

const getStatusBadge = (status: string) => {
  switch (status) {
    case "normal":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-500 border-0">
          Normal
        </Badge>
      );

    case "low":
      return (
        <Badge className="bg-yellow-500/10 text-yellow-500 border-0">
          Rendah
        </Badge>
      );

    case "critical":
      return (
        <Badge className="bg-red-500/10 text-red-500 border-0">
          Kritis
        </Badge>
      );

    default:
      return <Badge>Unknown</Badge>;
  }
};

/* =========================
   FORMAT RUPIAH
========================= */

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
};

/* =========================
   COMPONENT
========================= */

interface ProductItem {
  _id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  minStock: number;
  price: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const Inventory = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [inventoryData, setInventoryData] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [stats, setStats] = useState({ total: 0, lowStock: 0, criticalStock: 0, totalValue: 0 });
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "",
    stock: "",
    minStock: "",
    price: "",
  });
  const [editFormData, setEditFormData] = useState({
    id: "",
    name: "",
    sku: "",
    category: "",
    stock: "",
    minStock: "",
    price: "",
  });
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  /* =========================
     FETCH PRODUCTS
  ========================= */
  const fetchProducts = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      params.append("page", String(currentPage));
      params.append("limit", "5");

      const res = await fetch(`${API_URL}/api/products?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setInventoryData(json.data);
        setStats(json.stats);
        if (json.pagination) {
          setTotalPages(json.pagination.totalPages);
          setTotalItems(json.pagination.total);
        }
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     FETCH CATEGORIES
  ========================= */
  const fetchCategories = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        // Ambil nama kategori yang aktif saja
        const activeCategories = json.data
          .filter((cat: { status: string }) => cat.status === "active")
          .map((cat: { name: string }) => cat.name);
        setCategories(activeCategories);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  /* =========================
     USEEFFECT - FETCH CATEGORIES
  ========================= */
  useEffect(() => {
    fetchCategories();
  }, [token]);

  /* =========================
     USEEFFECT - FETCH PRODUCTS
  ========================= */
  useEffect(() => {
    fetchProducts();
  }, [searchQuery, categoryFilter, currentPage, token]);

  const filteredData = inventoryData;

  /* =========================
     HANDLE FORM
  ========================= */

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCategoryChange = (
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      category: value,
    }));
  };

  const handleSubmit = async () => {
    if (!token) {
      toast.error("Token tidak ditemukan. Silakan login kembali.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          sku: formData.sku,
          category: formData.category,
          stock: Number(formData.stock),
          minStock: Number(formData.minStock),
          price: Number(formData.price),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Barang berhasil ditambahkan!");
        setFormData({
          name: "",
          sku: "",
          category: "",
          stock: "",
          minStock: "",
          price: "",
        });
        setIsDialogOpen(false);
        fetchProducts();
        fetchCategories();
      } else {
        toast.error("Gagal menambahkan barang: " + (json.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error adding product:", error);
      toast.error("Terjadi kesalahan saat menambahkan barang");
    }
  };

  /* =========================
     HANDLE DELETE
  ========================= */
  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus barang ini?")) return;

    if (!token) {
      toast.error("Token tidak ditemukan. Silakan login kembali.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Barang berhasil dihapus!");
        fetchProducts();
        fetchCategories();
      } else {
        toast.error("Gagal menghapus barang: " + (json.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Terjadi kesalahan saat menghapus barang");
    }
  };

  /* =========================
     HANDLE DETAIL
  ========================= */
  const openDetail = (item: ProductItem) => {
    setSelectedProduct(item);
    setIsDetailOpen(true);
  };

  /* =========================
     HANDLE EDIT
  ========================= */
  const openEdit = (item: ProductItem) => {
    setEditFormData({
      id: item._id,
      name: item.name,
      sku: item.sku,
      category: item.category,
      stock: String(item.stock),
      minStock: String(item.minStock),
      price: String(item.price),
    });
    setIsEditOpen(true);
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditCategoryChange = (value: string) => {
    setEditFormData((prev) => ({ ...prev, category: value }));
  };

  const handleUpdate = async () => {
    if (!token) {
      toast.error("Token tidak ditemukan. Silakan login kembali.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/products/${editFormData.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editFormData.name,
          sku: editFormData.sku,
          category: editFormData.category,
          stock: Number(editFormData.stock),
          minStock: Number(editFormData.minStock),
          price: Number(editFormData.price),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Barang berhasil diupdate!");
        setIsEditOpen(false);
        fetchProducts();
      } else {
        toast.error("Gagal mengupdate barang: " + (json.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("Terjadi kesalahan saat mengupdate barang");
    }
  };

  return (
    <DashboardLayout title="Inventory">
      <div className="space-y-6">
        {/* =========================
            STATS
        ========================= */}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Barang */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Package className="w-5 h-5 text-primary" />
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Barang
                  </p>

                  <p className="text-2xl font-bold">
                    {stats.total}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Low Stock */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-yellow-500/10">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    Stock Rendah
                  </p>

                  <p className="text-2xl font-bold">
                    {stats.lowStock}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Critical */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-red-500/10">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    Stock Kritis
                  </p>

                  <p className="text-2xl font-bold">
                    {stats.criticalStock}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Value */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/10">
                  <Package className="w-5 h-5 text-emerald-500" />
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    Nilai Inventory
                  </p>

                  <p className="text-lg font-bold">
                    {formatCurrency(
                      stats.totalValue
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* =========================
            ALERT
        ========================= */}

        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="p-5">
            <div className="space-y-3">
              <h3 className="font-semibold">
                Low Stock Alerts
              </h3>

              {inventoryData
                .filter(
                  (item) =>
                    item.status === "low" ||
                    item.status === "critical"
                )
                .map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between rounded-xl border bg-background p-3"
                  >
                    <div>
                      <p className="font-medium">
                        {item.name}
                      </p>

                      <p className="text-sm text-muted-foreground">
                        {item.category}
                      </p>
                    </div>

                    <Badge variant="destructive">
                      {item.stock} tersisa
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* =========================
            MAIN TABLE
        ========================= */}

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>
                  Product Inventory
                </CardTitle>

                <CardDescription>
                  Kelola semua data barang
                </CardDescription>
              </div>

              {/* ADD PRODUCT */}
              <Dialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Tambah Barang
                  </Button>
                </DialogTrigger>

                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      Tambah Barang
                    </DialogTitle>

                    <DialogDescription>
                      Tambahkan barang baru ke
                      inventory
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div>
                      <Label>
                        Nama Barang
                      </Label>

                      <Input
                        name="name"
                        value={formData.name}
                        onChange={
                          handleInputChange
                        }
                      />
                    </div>

                    <div>
                      <Label>SKU</Label>

                      <Input
                        name="sku"
                        value={formData.sku}
                        onChange={
                          handleInputChange
                        }
                      />
                    </div>

                    <div>
                      <Label>
                        Kategori
                      </Label>

                      <Select
                        value={
                          formData.category
                        }
                        onValueChange={
                          handleCategoryChange
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih kategori" />
                        </SelectTrigger>

                        <SelectContent>
                          {categories.map(
                            (cat) => (
                              <SelectItem
                                key={cat}
                                value={cat}
                              >
                                {cat}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Stock</Label>

                        <Input
                          type="number"
                          name="stock"
                          value={
                            formData.stock
                          }
                          onChange={
                            handleInputChange
                          }
                        />
                      </div>

                      <div>
                        <Label>
                          Min Stock
                        </Label>

                        <Input
                          type="number"
                          name="minStock"
                          value={
                            formData.minStock
                          }
                          onChange={
                            handleInputChange
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Harga</Label>

                      <Input
                        type="number"
                        name="price"
                        value={
                          formData.price
                        }
                        onChange={
                          handleInputChange
                        }
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          setIsDialogOpen(
                            false
                          )
                        }
                      >
                        Batal
                      </Button>

                      <Button
                        onClick={
                          handleSubmit
                        }
                      >
                        Simpan
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>

          <CardContent>
            {/* FILTER */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
              {/* SEARCH */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

                <Input
                  placeholder="Cari nama barang atau SKU..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              {/* CATEGORY */}
              <Select
                value={categoryFilter}
                onValueChange={(val) => {
                  setCategoryFilter(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full md:w-52">
                  <Filter className="w-4 h-4 mr-2" />

                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">
                    Semua Kategori
                  </SelectItem>

                  {categories.map((cat) => (
                    <SelectItem
                      key={cat}
                      value={cat}
                    >
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* TABLE */}
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>
                      Produk
                    </TableHead>

                    <TableHead>
                      Kategori
                    </TableHead>

                    <TableHead className="text-right">
                      Stock
                    </TableHead>

                    <TableHead className="text-right">
                      Harga
                    </TableHead>

                    <TableHead className="text-right">
                      Total Value
                    </TableHead>

                    <TableHead>
                      Status
                    </TableHead>

                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredData.length >
                  0 ? (
                    filteredData.map(
                      (item) => (
                        <TableRow
                          key={item._id}
                        >
                          {/* PRODUCT */}
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-11 w-11 rounded-xl bg-muted" />

                              <div>
                                <p className="font-medium">
                                  {
                                    item.name
                                  }
                                </p>

                                <p className="text-xs text-muted-foreground">
                                  {
                                    item.sku
                                  }
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          {/* CATEGORY */}
                          <TableCell>
                            <Badge variant="secondary">
                              {
                                item.category
                              }
                            </Badge>
                          </TableCell>

                          {/* STOCK */}
                          <TableCell
                            className={`text-right font-bold ${
                              item.status ===
                              "critical"
                                ? "text-red-500"
                                : item.status ===
                                  "low"
                                ? "text-yellow-500"
                                : "text-emerald-500"
                            }`}
                          >
                            {item.stock}
                          </TableCell>

                          {/* PRICE */}
                          <TableCell className="text-right">
                            {formatCurrency(
                              item.price
                            )}
                          </TableCell>

                          {/* TOTAL */}
                          <TableCell className="text-right font-medium">
                            {formatCurrency(
                              item.price *
                                item.stock
                            )}
                          </TableCell>

                          {/* STATUS */}
                          <TableCell>
                            {getStatusBadge(
                              item.status
                            )}
                          </TableCell>

                          {/* ACTION */}
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                asChild
                              >
                                <Button
                                  size="icon"
                                  variant="ghost"
                                >
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

                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() => openEdit(item)}
                                >
                                  <Edit className="w-4 h-4" />
                                  Edit
                                </DropdownMenuItem>

                                <DropdownMenuItem 
                                  className="gap-2 text-red-500 focus:text-red-500"
                                  onClick={() => handleDelete(item._id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Hapus
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    )
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-32 text-center text-muted-foreground"
                      >
                        Tidak ada barang ditemukan
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* FOOTER / PAGINATION */}
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              showing={inventoryData.length}
              onPageChange={setCurrentPage}
              label="barang"
            />
          </CardContent>
        </Card>
      </div>

      {/* =========================
          DETAIL DIALOG
      ========================= */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Detail Barang</DialogTitle>
            <DialogDescription>Informasi lengkap produk</DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nama Barang</p>
                  <p className="font-medium">{selectedProduct.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">SKU</p>
                  <p className="font-medium">{selectedProduct.sku}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Kategori</p>
                  <Badge variant="secondary">{selectedProduct.category}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedProduct.status)}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Stock</p>
                  <p className={`text-lg font-bold ${
                    selectedProduct.status === "critical"
                      ? "text-red-500"
                      : selectedProduct.status === "low"
                      ? "text-yellow-500"
                      : "text-emerald-500"
                  }`}>
                    {selectedProduct.stock}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Min Stock</p>
                  <p className="text-lg font-bold">{selectedProduct.minStock}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Harga</p>
                  <p className="text-lg font-bold">{formatCurrency(selectedProduct.price)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Total Nilai</p>
                  <p className="font-bold text-primary">
                    {formatCurrency(selectedProduct.price * selectedProduct.stock)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Terakhir Diupdate</p>
                  <p className="text-sm">
                    {new Date(selectedProduct.updatedAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Tutup
            </Button>
            {selectedProduct && (
              <Button onClick={() => { setIsDetailOpen(false); openEdit(selectedProduct); }}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================
          EDIT DIALOG
      ========================= */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Barang</DialogTitle>
            <DialogDescription>Ubah data barang inventory</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Nama Barang</Label>
              <Input
                name="name"
                value={editFormData.name}
                onChange={handleEditInputChange}
              />
            </div>

            <div>
              <Label>SKU</Label>
              <Input
                name="sku"
                value={editFormData.sku}
                onChange={handleEditInputChange}
              />
            </div>

            <div>
              <Label>Kategori</Label>
              <Select
                value={editFormData.category}
                onValueChange={handleEditCategoryChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Stock</Label>
                <Input
                  type="number"
                  name="stock"
                  value={editFormData.stock}
                  onChange={handleEditInputChange}
                />
              </div>
              <div>
                <Label>Min Stock</Label>
                <Input
                  type="number"
                  name="minStock"
                  value={editFormData.minStock}
                  onChange={handleEditInputChange}
                />
              </div>
            </div>

            <div>
              <Label>Harga</Label>
              <Input
                type="number"
                name="price"
                value={editFormData.price}
                onChange={handleEditInputChange}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleUpdate}>
              Update
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Inventory;
