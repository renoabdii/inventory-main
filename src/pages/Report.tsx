import { useState, useEffect } from "react";
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
  Package,
  AlertTriangle,
  Truck,
  ShoppingCart,
  TrendingDown,
  ArrowDownCircle,
  ArrowUpCircle,
  Boxes,
  DollarSign,
  Download,
} from "lucide-react";

/* =========================
   TYPES
========================= */

interface ReportData {
  summary: {
    totalProducts: number;
    criticalCount: number;
    lowCount: number;
    totalValue: number;
    activeSuppliers: number;
    totalPO: number;
    completedPOPeriod: number;
  };
  topProducts: {
    name: string;
    sku: string;
    totalOut: number;
    category: string;
  }[];
  stockMovement: {
    totalIn: number;
    totalOut: number;
    total: number;
  };
  criticalStock: {
    id: string;
    name: string;
    stock: number;
    minStock: number;
    status: string;
    category: string;
  }[];
  categoryValues: {
    name: string;
    value: number;
    productCount: number;
  }[];
  recentActivities: {
    id: string;
    title: string;
    time: string;
    type: string;
    qty: number;
  }[];
  paymentSummary: {
    method: string;
    count: number;
    total: number;
  }[];
}

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

const Reports = () => {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const token = localStorage.getItem("token");

  const fetchReport = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (period === "custom" && startDate && endDate) {
        params.append("startDate", startDate);
        params.append("endDate", endDate);
      }

      const res = await fetch(`${API_BASE_URL}/api/reports?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (error) {
      console.error("Error fetching report:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [period, startDate, endDate, token]);

  const handleExportReport = async () => {
    if (!data) return;
    const rows = [
      { Bagian: "Ringkasan", Keterangan: "Total Produk", Jumlah: data.summary.totalProducts, Nominal: "" },
      { Bagian: "Ringkasan", Keterangan: "Stock Kritis", Jumlah: data.summary.criticalCount, Nominal: "" },
      { Bagian: "Ringkasan", Keterangan: "Stock Rendah", Jumlah: data.summary.lowCount, Nominal: "" },
      { Bagian: "Ringkasan", Keterangan: "Total Nilai Inventory", Jumlah: "", Nominal: data.summary.totalValue },
      { Bagian: "Ringkasan", Keterangan: "Supplier Aktif", Jumlah: data.summary.activeSuppliers, Nominal: "" },
      { Bagian: "Ringkasan", Keterangan: "Total Purchase Order", Jumlah: data.summary.totalPO, Nominal: "" },
      { Bagian: "Pergerakan Stok", Keterangan: "Stock In", Jumlah: data.stockMovement.totalIn, Nominal: "" },
      { Bagian: "Pergerakan Stok", Keterangan: "Stock Out", Jumlah: data.stockMovement.totalOut, Nominal: "" },
      { Bagian: "Pergerakan Stok", Keterangan: "Total Movement", Jumlah: data.stockMovement.total, Nominal: "" },
      ...data.paymentSummary.map((item) => ({
        Bagian: "Metode Pembayaran",
        Keterangan: item.method.toUpperCase(),
        Jumlah: item.count,
        Nominal: item.total,
      })),
    ];

    await exportToStyledXlsx("report-ely-berkah-mart.xlsx", "Laporan Ringkasan Inventory", rows);
  };

  const handleExportReportCsv = () => {
    if (!data) return;
    exportToCsv("report-ely-berkah-mart.csv", [
      { Bagian: "Ringkasan", Keterangan: "Total Produk", Jumlah: data.summary.totalProducts, Nominal: "" },
      { Bagian: "Ringkasan", Keterangan: "Stock Kritis", Jumlah: data.summary.criticalCount, Nominal: "" },
      { Bagian: "Ringkasan", Keterangan: "Stock Rendah", Jumlah: data.summary.lowCount, Nominal: "" },
      { Bagian: "Ringkasan", Keterangan: "Total Nilai Inventory", Jumlah: "", Nominal: data.summary.totalValue },
      { Bagian: "Ringkasan", Keterangan: "Supplier Aktif", Jumlah: data.summary.activeSuppliers, Nominal: "" },
      { Bagian: "Ringkasan", Keterangan: "Total Purchase Order", Jumlah: data.summary.totalPO, Nominal: "" },
      { Bagian: "Pergerakan Stok", Keterangan: "Stock In", Jumlah: data.stockMovement.totalIn, Nominal: "" },
      { Bagian: "Pergerakan Stok", Keterangan: "Stock Out", Jumlah: data.stockMovement.totalOut, Nominal: "" },
      { Bagian: "Pergerakan Stok", Keterangan: "Total Movement", Jumlah: data.stockMovement.total, Nominal: "" },
      ...data.paymentSummary.map((item) => ({
        Bagian: "Metode Pembayaran",
        Keterangan: item.method.toUpperCase(),
        Jumlah: item.count,
        Nominal: item.total,
      })),
    ]);
  };

  if (loading || !data) {
    return (
      <DashboardLayout title="Reports">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Memuat data laporan...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Reports">
      <div className="space-y-6">
        {/* PERIOD FILTER */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Laporan Inventory</h2>
            <p className="text-muted-foreground">Ringkasan data inventory</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Minggu Ini</SelectItem>
                <SelectItem value="month">Bulan Ini</SelectItem>
                <SelectItem value="custom">Tanggal Custom</SelectItem>
                <SelectItem value="all">Semua Waktu</SelectItem>
              </SelectContent>
            </Select>
            {period === "custom" && (
              <>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportReportCsv}>
                  Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportReport}>
                  Export XLSX
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* SUMMARY STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Produk</p>
                  <h2 className="text-3xl font-bold mt-1">{data.summary.totalProducts}</h2>
                  <p className="text-xs text-muted-foreground mt-2">
                    {data.summary.lowCount} stock rendah
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-primary/10">
                  <Package className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Stock Kritis</p>
                  <h2 className="text-3xl font-bold mt-1">{data.summary.criticalCount}</h2>
                  <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    Perlu restock
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-red-500/10">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Supplier Aktif</p>
                  <h2 className="text-3xl font-bold mt-1">{data.summary.activeSuppliers}</h2>
                  <p className="text-xs text-primary mt-2">Supplier terpercaya</p>
                </div>
                <div className="p-3 rounded-2xl bg-primary/10">
                  <Truck className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Purchase Orders</p>
                  <h2 className="text-3xl font-bold mt-1">{data.summary.totalPO}</h2>
                  <p className="text-xs text-emerald-500 mt-2">
                    {data.summary.completedPOPeriod} selesai periode ini
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/10">
                  <ShoppingCart className="w-6 h-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* TOP PRODUCTS */}
          <Card className="xl:col-span-2">
            <CardHeader>
              <div>
                <CardTitle>Top Products</CardTitle>
                <CardDescription>Produk paling banyak keluar (periode ini)</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.topProducts.length > 0 ? (
                data.topProducts.map((product, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 rounded-2xl border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <span className="font-bold text-primary">#{index + 1}</span>
                      </div>
                      <div>
                        <h4 className="font-medium">{product.name}</h4>
                        <p className="text-sm text-muted-foreground">{product.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <h3 className="font-bold text-lg">{product.totalOut}</h3>
                      <p className="text-xs text-muted-foreground">unit keluar</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Belum ada data pergerakan stok keluar
                </p>
              )}
            </CardContent>
          </Card>

          {/* CRITICAL STOCK */}
          <Card>
            <CardHeader>
              <CardTitle>Critical Stock</CardTitle>
              <CardDescription>Produk yang perlu segera direstock</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.criticalStock.length > 0 ? (
                data.criticalStock.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 rounded-2xl border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                        <Boxes className="w-4 h-4 text-red-500" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{item.name}</h4>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                      </div>
                    </div>
                    <Badge
                      className={
                        item.status === "critical"
                          ? "bg-red-500/10 text-red-500 border-0"
                          : "bg-yellow-500/10 text-yellow-500 border-0"
                      }
                    >
                      {item.stock} pcs
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Tidak ada produk kritis 🎉
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* BOTTOM GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* STOCK MOVEMENT */}
          <Card>
            <CardHeader>
              <CardTitle>Stock Movement</CardTitle>
              <CardDescription>Ringkasan movement inventory (periode ini)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-5 rounded-2xl border">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-emerald-500/10">
                    <ArrowDownCircle className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="font-medium">Stock In</h4>
                    <p className="text-sm text-muted-foreground">Barang masuk</p>
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-emerald-500">{data.stockMovement.totalIn}</h2>
              </div>

              <div className="flex items-center justify-between p-5 rounded-2xl border">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-red-500/10">
                    <ArrowUpCircle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h4 className="font-medium">Stock Out</h4>
                    <p className="text-sm text-muted-foreground">Barang keluar</p>
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-red-500">{data.stockMovement.totalOut}</h2>
              </div>

              <div className="p-5 rounded-2xl border bg-primary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Total Movement</h4>
                    <p className="text-sm text-muted-foreground">Total aktivitas</p>
                  </div>
                  <h2 className="text-2xl font-bold">{data.stockMovement.total}</h2>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metode Pembayaran</CardTitle>
              <CardDescription>Ringkasan transaksi POS berdasarkan metode bayar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.paymentSummary.map((item) => (
                <div key={item.method} className="flex items-center justify-between rounded-2xl border p-4">
                  <div>
                    <h4 className="font-medium uppercase">{item.method}</h4>
                    <p className="text-sm text-muted-foreground">{item.count} transaksi</p>
                  </div>
                  <p className="font-bold">{formatCurrency(item.total)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* INVENTORY VALUE PER CATEGORY */}
          <Card>
            <CardHeader>
              <CardTitle>Nilai Inventory per Kategori</CardTitle>
              <CardDescription>Total nilai stok berdasarkan kategori</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.categoryValues.length > 0 ? (
                <>
                  {data.categoryValues.map((cat, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-2xl border"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium">{cat.name}</h4>
                          <p className="text-xs text-muted-foreground">{cat.productCount} produk</p>
                        </div>
                      </div>
                      <p className="font-bold text-sm">{formatCurrency(cat.value)}</p>
                    </div>
                  ))}

                  {/* TOTAL */}
                  <div className="p-4 rounded-2xl border bg-primary/5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Total Nilai Inventory</h4>
                      <p className="font-bold text-primary">{formatCurrency(data.summary.totalValue)}</p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Belum ada data kategori
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
