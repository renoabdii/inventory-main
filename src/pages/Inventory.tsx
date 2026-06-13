import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import TablePagination from "@/components/TablePagination";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import DashboardLayout from "@/components/layout/DashboardLayout";

import { API_BASE_URL } from "@/lib/api";
import { exportToCsv, exportToStyledXlsx } from "@/lib/export";

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
  Download,
  Upload,
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
  barcode?: string;
  category: string;
  stock: number;
  minStock: number;
  price: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface StockHistoryItem {
  _id: string;
  type: string;
  qty: number;
  stockBefore: number;
  stockAfter: number;
  reference?: string;
  note?: string;
  createdAt: string;
}

interface ImportProductRow {
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  stock: number;
  minStock: number;
  price: number;
}

interface ImportErrorRow {
  row: number;
  sku?: string;
  name?: string;
  errors: string[];
}

const Inventory = () => {
  const location = useLocation();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [inventoryData, setInventoryData] = useState<ProductItem[]>([]);
  const [lowStockData, setLowStockData] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [stats, setStats] = useState({ total: 0, lowStock: 0, criticalStock: 0, totalValue: 0 });
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [stockHistory, setStockHistory] = useState<StockHistoryItem[]>([]);
  const [importRows, setImportRows] = useState<ImportProductRow[]>([]);
  const [importErrors, setImportErrors] = useState<ImportErrorRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    barcode: "",
    category: "",
    stock: "",
    minStock: "",
    price: "",
  });
  const [editFormData, setEditFormData] = useState({
    id: "",
    name: "",
    sku: "",
    barcode: "",
    category: "",
    stock: "",
    minStock: "",
    price: "",
  });
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  const normalizeImportHeader = (value: unknown) =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const parseImportNumber = (value: unknown) => {
    if (typeof value === "number") return value;
    const text = String(value ?? "")
      .trim()
      .replace(/rp/gi, "")
      .replace(/\s/g, "");

    if (text.includes(",") && text.includes(".")) {
      return Number(text.replace(/\./g, "").replace(",", "."));
    }

    if (text.includes(",")) {
      return Number(text.replace(/,/g, ""));
    }

    return Number(text);
  };

  const getImportCell = (
    row: unknown[],
    headerMap: Record<string, number>,
    aliases: string[]
  ) => {
    for (const alias of aliases) {
      const index = headerMap[normalizeImportHeader(alias)];
      if (index !== undefined) return row[index] ?? "";
    }
    return "";
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get("status");
    if (status === "critical" || status === "low") {
      setSearchQuery("");
    }
  }, [location.search]);

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
      params.append("limit", "10");

      const res = await fetch(`${API_BASE_URL}/api/products?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        const status = new URLSearchParams(location.search).get("status");
        const products = status ? json.data.filter((item: ProductItem) => item.status === status) : json.data;
        setInventoryData(products);
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
      const res = await fetch(`${API_BASE_URL}/api/categories`, {
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
     FETCH LOW STOCK
  ========================= */
  const fetchLowStock = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/products/low-stock`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setLowStockData(json.data);
      }
    } catch (error) {
      console.error("Error fetching low stock:", error);
    }
  };

  /* =========================
     USEEFFECT - FETCH CATEGORIES
  ========================= */
  useEffect(() => {
    fetchCategories();
    fetchLowStock();
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
      const res = await fetch(`${API_BASE_URL}/api/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          sku: formData.sku,
          barcode: formData.barcode || undefined,
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
          barcode: "",
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
    const confirmed = await confirm({
      title: "Hapus Barang",
      description: "Yakin ingin menghapus barang ini?",
      confirmText: "Ya, Hapus",
      variant: "destructive",
    });
    if (!confirmed) return;

    if (!token) {
      toast.error("Token tidak ditemukan. Silakan login kembali.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${id}`, {
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
  const openDetail = async (item: ProductItem) => {
    setSelectedProduct(item);
    setStockHistory([]);
    setIsDetailOpen(true);
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/stock-movements?productId=${item._id}&limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setStockHistory(json.data);
    } catch (error) {
      console.error("Error fetching stock history:", error);
    }
  };

  const handleExportInventory = async () => {
    const rows = inventoryData.map((item, index) => ({
      No: index + 1,
      "Nama Barang": item.name,
      SKU: item.sku,
      Barcode: item.barcode || "",
      Kategori: item.category,
      Stok: item.stock,
      "Min Stok": item.minStock,
      Harga: item.price,
      "Nilai Stok": item.price * item.stock,
      Status:
        item.status === "critical"
          ? "Kritis"
          : item.status === "low"
          ? "Rendah"
          : "Normal",
    }));

    await exportToStyledXlsx(
      "inventory-ely-berkah-mart.xlsx",
      "Laporan Inventory",
      rows
    );
  };

  const handleExportInventoryCsv = () => {
    exportToCsv(
      "inventory-ely-berkah-mart.csv",
      inventoryData.map((item, index) => ({
        No: index + 1,
        "Nama Barang": item.name,
        SKU: item.sku,
        Barcode: item.barcode || "",
        Kategori: item.category,
        Stok: item.stock,
        "Min Stok": item.minStock,
        Harga: item.price,
        "Nilai Stok": item.price * item.stock,
        Status:
          item.status === "critical"
            ? "Kritis"
            : item.status === "low"
            ? "Rendah"
            : "Normal",
      }))
    );
  };

  const handleDownloadTemplate = async () => {
    await exportToStyledXlsx("template-import-inventory.xlsx", "Template Import Inventory", [
      {
        "Nama Barang": "Contoh Produk",
        SKU: "PRD-001",
        Barcode: "899000000001",
        Kategori: categories[0] || "Makanan",
        Stok: 20,
        "Min Stok": 5,
        Harga: 15000,
      },
    ]);
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: "",
        raw: false,
      });
      const headerRowIndex = rows.findIndex((row) => {
        const normalized = row.map(normalizeImportHeader);
        return normalized.includes("nama barang") && normalized.includes("sku");
      });

      if (headerRowIndex === -1) {
        toast.error("Header tidak ditemukan. Pastikan ada kolom Nama Barang dan SKU.");
        return;
      }

      const headerMap = rows[headerRowIndex].reduce<Record<string, number>>((acc, value, index) => {
        const header = normalizeImportHeader(value);
        if (header) acc[header] = index;
        return acc;
      }, {});

      const parsedRows = rows
        .slice(headerRowIndex + 1)
        .map((row) => ({
          name: String(getImportCell(row, headerMap, ["Nama Barang", "Name", "Nama"])).trim(),
          sku: String(getImportCell(row, headerMap, ["SKU"])).trim(),
          barcode: String(getImportCell(row, headerMap, ["Barcode"])).trim() || undefined,
          category: String(getImportCell(row, headerMap, ["Kategori", "Category"])).trim(),
          stock: parseImportNumber(getImportCell(row, headerMap, ["Stok", "Stock"])),
          minStock: parseImportNumber(getImportCell(row, headerMap, ["Min Stok", "MinStock", "Minimum Stock"])),
          price: parseImportNumber(getImportCell(row, headerMap, ["Harga", "Price"])),
        }))
        .filter((row) => row.name || row.sku || row.category);

      setImportRows(parsedRows);
      setImportErrors([]);

      if (parsedRows.length === 0) {
        toast.warning("File tidak memiliki data produk.");
      } else {
        toast.success(`${parsedRows.length} baris siap dipreview.`);
      }
    } catch (error) {
      console.error("Error parsing import file:", error);
      toast.error("Gagal membaca file. Pastikan format CSV/XLSX benar.");
    }
  };

  const handleImportSubmit = async () => {
    if (!token) {
      toast.error("Token tidak ditemukan. Silakan login kembali.");
      return;
    }
    if (importRows.length === 0) {
      toast.warning("Pilih file import terlebih dahulu.");
      return;
    }

    setImporting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/products/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items: importRows }),
      });
      const json = await res.json();
      const errors = json.data?.errors || [];
      setImportErrors(errors);

      if (json.success) {
        toast.success(`${json.data.created} produk berhasil diimport.`);
        if (errors.length === 0) {
          setIsImportOpen(false);
          setImportRows([]);
        }
        fetchProducts();
        fetchLowStock();
      } else {
        toast.error(json.message || "Import gagal.");
      }
    } catch (error) {
      console.error("Error importing products:", error);
      toast.error("Terjadi kesalahan saat import.");
    } finally {
      setImporting(false);
    }
  };

  /* =========================
     HANDLE EDIT
  ========================= */
  const openEdit = (item: ProductItem) => {
    setEditFormData({
      id: item._id,
      name: item.name,
      sku: item.sku,
      barcode: item.barcode || "",
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
      const res = await fetch(`${API_BASE_URL}/api/products/${editFormData.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editFormData.name,
          sku: editFormData.sku,
          barcode: editFormData.barcode || undefined,
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

              {lowStockData.length > 0 ? (
                lowStockData.map((item) => (
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
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Semua stok aman 🎉</p>
              )}
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
                      <Label>Barcode (opsional)</Label>

                      <Input
                        name="barcode"
                        placeholder="Nomor barcode di kemasan"
                        value={formData.barcode}
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
              <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Upload className="w-4 h-4" />
                    Import
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Import Data Inventory</DialogTitle>
                    <DialogDescription>
                      Upload file CSV/XLSX dengan kolom sesuai template.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button variant="outline" onClick={handleDownloadTemplate}>
                        Download Template
                      </Button>
                      <Input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleImportFile}
                      />
                    </div>

                    <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                      Kolom wajib: Nama Barang, SKU, Kategori, Stok, Min Stok, Harga.
                      Barcode opsional. Kategori harus sudah aktif di sistem.
                    </div>

                    {importRows.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">Preview ({importRows.length} baris)</p>
                          <Badge variant="secondary">Create produk baru</Badge>
                        </div>

                        <div className="rounded-lg border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead>Nama</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead>Kategori</TableHead>
                                <TableHead className="text-right">Stok</TableHead>
                                <TableHead className="text-right">Harga</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {importRows.slice(0, 6).map((row, index) => (
                                <TableRow key={`${row.sku}-${index}`}>
                                  <TableCell>{row.name}</TableCell>
                                  <TableCell>{row.sku}</TableCell>
                                  <TableCell>{row.category}</TableCell>
                                  <TableCell className="text-right">{row.stock}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(row.price || 0)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {importRows.length > 6 && (
                          <p className="text-xs text-muted-foreground">
                            Menampilkan 6 baris pertama dari {importRows.length} baris.
                          </p>
                        )}
                      </div>
                    )}

                    {importErrors.length > 0 && (
                      <div className="space-y-2">
                        <p className="font-medium text-red-500">Data yang gagal diimport</p>
                        <div className="max-h-48 overflow-y-auto rounded-lg border">
                          {importErrors.map((error) => (
                            <div key={`${error.row}-${error.sku}`} className="border-b p-3 text-sm last:border-0">
                              <p className="font-medium">
                                Baris {error.row}: {error.sku || error.name || "-"}
                              </p>
                              <p className="text-red-500">{error.errors.join(", ")}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsImportOpen(false)}>
                        Tutup
                      </Button>
                      <Button onClick={handleImportSubmit} disabled={importing || importRows.length === 0}>
                        {importing ? "Mengimport..." : "Konfirmasi Import"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportInventoryCsv}>
                    Export CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportInventory}>
                    Export XLSX
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

              <div className="pt-2 border-t">
                <p className="text-sm font-medium mb-3">Riwayat Stok Terakhir</p>
                <div className="space-y-2">
                  {stockHistory.length > 0 ? (
                    stockHistory.map((history) => (
                      <div key={history._id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="text-sm font-medium">
                            {history.type === "IN" ? "Stock Masuk" : "Stock Keluar"} ({history.qty})
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {history.stockBefore} {"->"} {history.stockAfter} | {history.note || history.reference || "-"}
                          </p>
                        </div>
                        <Badge className={history.type === "IN" ? "bg-emerald-500/10 text-emerald-500 border-0" : "bg-red-500/10 text-red-500 border-0"}>
                          {history.type}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Belum ada riwayat stok.</p>
                  )}
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
              <Label>Barcode (opsional)</Label>
              <Input
                name="barcode"
                placeholder="Nomor barcode di kemasan"
                value={editFormData.barcode}
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
      <ConfirmDialogComponent />
    </DashboardLayout>
  );
};

export default Inventory;
