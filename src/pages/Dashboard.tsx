import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import CreateCashierDialog from "@/components/CreateCashierDialog";
import { PageLoading } from "@/components/LoadingState";

import { API_BASE_URL } from "@/lib/api";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

import {
  Package,
  AlertTriangle,
  ArrowRight,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Circle,
  ShoppingCart,
  TrendingDown,
  Truck,
  Boxes,
  Tags,
  UserCog,
} from "lucide-react";

/* =========================
   TYPES
========================= */

interface DashboardData {
  summary: {
    totalProducts: number;
    criticalCount: number;
    lowCount: number;
    todayStockIn: number;
    totalPO: number;
    pendingPO: number;
    shippingPO: number;
    pendingIncoming: number;
    todayTransactions: number;
    todaySales: number;
  };
  stockMovement: {
    weekIn: number;
    weekOut: number;
    weekTotal: number;
  };
  criticalStock: {
    id: string;
    product: string;
    stock: number;
    minStock: number;
  }[];
  pendingIncoming: {
    id: string;
    receiptId: string;
    supplier: string;
    status: string;
    totalItems: number;
    totalQty: number;
  }[];
  recentActivities: {
    id: string;
    title: string;
    time: string;
    type: string;
    qty: number;
  }[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value || 0);

interface OnboardingCounts {
  products: number;
  categories: number;
  suppliers: number;
  cashiers: number;
}

interface PaginatedResponse {
  pagination?: {
    total?: number;
  };
  data?: unknown[];
}

/* =========================
   PAGE
========================= */

const Dashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingCounts | null>(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  const getPaginationTotal = (json: PaginatedResponse) => {
    if (typeof json?.pagination?.total === "number") return json.pagination.total;
    if (Array.isArray(json?.data)) return json.data.length;
    return 0;
  };

  const fetchDashboard = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/dashboard/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (error) {
      console.error("Error fetching dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchOnboarding = useCallback(async () => {
    if (!token) return;

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [productsRes, categoriesRes, suppliersRes, cashiersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/products?page=1&limit=1`, { headers }),
        fetch(`${API_BASE_URL}/api/categories?page=1&limit=1`, { headers }),
        fetch(`${API_BASE_URL}/api/suppliers?page=1&limit=1`, { headers }),
        fetch(`${API_BASE_URL}/api/cashier-accounts?page=1&limit=1`, { headers }),
      ]);

      const [products, categories, suppliers, cashiers] = await Promise.all([
        productsRes.json(),
        categoriesRes.json(),
        suppliersRes.json(),
        cashiersRes.json(),
      ]);

      setOnboarding({
        products: getPaginationTotal(products),
        categories: getPaginationTotal(categories),
        suppliers: getPaginationTotal(suppliers),
        cashiers: getPaginationTotal(cashiers),
      });
    } catch (error) {
      console.error("Error fetching onboarding status:", error);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboard();
    fetchOnboarding();
  }, [fetchDashboard, fetchOnboarding]);

  const today = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (loading || !data) {
    return (
      <DashboardLayout title="Dashboard">
        <PageLoading message="Memuat data dashboard..." />
      </DashboardLayout>
    );
  }

  const onboardingCounts = onboarding || {
    products: data.summary.totalProducts,
    categories: 0,
    suppliers: 0,
    cashiers: 0,
  };

  const onboardingSteps = [
    {
      title: "Buat kategori",
      description: "Siapkan pengelompokan produk.",
      path: "/dashboard/category",
      done: onboardingCounts.categories > 0,
      icon: Tags,
    },
    {
      title: "Tambah produk",
      description: "Masukkan barang, harga, dan stok awal.",
      path: "/dashboard/inventory",
      done: onboardingCounts.products > 0,
      icon: Package,
    },
    {
      title: "Tambah supplier",
      description: "Lengkapi sumber pembelian barang.",
      path: "/dashboard/supplier",
      done: onboardingCounts.suppliers > 0,
      icon: Truck,
    },
    {
      title: "Buat akun kasir",
      description: "Hubungkan kasir dengan data admin ini.",
      path: "/dashboard/cashiers",
      done: onboardingCounts.cashiers > 0,
      icon: UserCog,
    },
  ];

  const showOnboarding = onboardingSteps.some((step) => !step.done);

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Selamat Datang, Admin</h1>
            <p className="text-muted-foreground mt-1">
              Berikut ringkasan inventory hari ini.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <CreateCashierDialog />
            <Badge className="w-fit bg-primary/10 text-primary border-0 px-4 py-2 text-sm">
              {today}
            </Badge>
          </div>
        </div>

        {showOnboarding && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <CardTitle>Onboarding Admin Baru</CardTitle>
                  <CardDescription>
                    Lengkapi data awal supaya POS kasir bisa langsung dipakai.
                  </CardDescription>
                </div>
                <Badge className="w-fit bg-background text-foreground border">
                  {onboardingSteps.filter((step) => step.done).length}/{onboardingSteps.length} selesai
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {onboardingSteps.map((step) => {
                  const Icon = step.icon;
                  return (
                    <button
                      key={step.title}
                      type="button"
                      onClick={() => navigate(step.path)}
                      className="text-left rounded-lg border bg-background p-4 transition-colors hover:border-primary/60 hover:bg-primary/5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-medium">{step.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                          </div>
                        </div>
                        {step.done ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                        )}
                      </div>
                      <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary">
                        Buka
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Prioritas Hari Ini</CardTitle>
            <CardDescription>Mulai dari item yang paling butuh tindakan admin.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => navigate("/dashboard/inventory?status=critical")}
                className="rounded-lg border bg-background p-4 text-left transition-colors hover:border-red-500/60"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Restock stok kritis</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {data.summary.criticalCount} produk perlu dicek.
                    </p>
                  </div>
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigate("/dashboard/incoming")}
                className="rounded-lg border bg-background p-4 text-left transition-colors hover:border-emerald-500/60"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Verifikasi barang masuk</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {data.summary.pendingIncoming} penerimaan menunggu.
                    </p>
                  </div>
                  <Truck className="w-5 h-5 text-emerald-500" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigate("/dashboard/purchaseorder?status=PENDING")}
                className="rounded-lg border bg-background p-4 text-left transition-colors hover:border-primary/60"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Proses purchase order</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {data.summary.pendingPO} pending, {data.summary.shippingPO} shipping.
                    </p>
                  </div>
                  <ShoppingCart className="w-5 h-5 text-primary" />
                </div>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* TOTAL PRODUCT */}
          <Card className="cursor-pointer transition-colors hover:border-primary/50" onClick={() => navigate("/dashboard/inventory")}>
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

          {/* STOCK CRITICAL */}
          <Card className="cursor-pointer transition-colors hover:border-red-500/50" onClick={() => navigate("/dashboard/inventory?status=critical")}>
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

          {/* STOCK IN TODAY */}
          <Card className="cursor-pointer transition-colors hover:border-emerald-500/50" onClick={() => navigate("/dashboard/stockmovement?type=IN")}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Stock In Hari Ini</p>
                  <h2 className="text-3xl font-bold mt-1">{data.summary.todayStockIn}</h2>
                  <p className="text-xs text-emerald-500 mt-2">Barang masuk</p>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/10">
                  <ArrowDownCircle className="w-6 h-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PURCHASE ORDER */}
          <Card className="cursor-pointer transition-colors hover:border-primary/50" onClick={() => navigate("/dashboard/purchaseorder?status=PENDING")}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Purchase Orders</p>
                  <h2 className="text-3xl font-bold mt-1">{data.summary.totalPO}</h2>
                  <p className="text-xs text-primary mt-2">{data.summary.pendingPO} pending</p>
                </div>
                <div className="p-3 rounded-2xl bg-primary/10">
                  <ShoppingCart className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-colors hover:border-emerald-500/50" onClick={() => navigate("/dashboard/report")}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Penjualan Hari Ini</p>
                  <h2 className="text-2xl font-bold mt-1">{formatCurrency(data.summary.todaySales)}</h2>
                  <p className="text-xs text-emerald-500 mt-2">{data.summary.todayTransactions} transaksi</p>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/10">
                  <ShoppingCart className="w-6 h-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ANALYTICS GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* STOCK MOVEMENT */}
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Stock Movement</CardTitle>
              <CardDescription>Ringkasan movement inventory minggu ini</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {/* STOCK IN */}
                <div className="flex items-center justify-between p-5 rounded-2xl border">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-emerald-500/10">
                      <ArrowDownCircle className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <h4 className="font-medium">Stock In</h4>
                      <p className="text-sm text-muted-foreground">Barang masuk minggu ini</p>
                    </div>
                  </div>
                  <h2 className="text-3xl font-bold text-emerald-500">{data.stockMovement.weekIn}</h2>
                </div>

                {/* STOCK OUT */}
                <div className="flex items-center justify-between p-5 rounded-2xl border">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-red-500/10">
                      <ArrowUpCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <h4 className="font-medium">Stock Out</h4>
                      <p className="text-sm text-muted-foreground">Barang keluar minggu ini</p>
                    </div>
                  </div>
                  <h2 className="text-3xl font-bold text-red-500">{data.stockMovement.weekOut}</h2>
                </div>

                {/* TOTAL */}
                <div className="p-5 rounded-2xl border bg-primary/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Total Movement</h4>
                      <p className="text-sm text-muted-foreground">Total aktivitas stock</p>
                    </div>
                    <h2 className="text-3xl font-bold">{data.stockMovement.weekTotal}</h2>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CRITICAL STOCK */}
          <Card>
            <CardHeader>
              <CardTitle>Critical Stock</CardTitle>
              <CardDescription>Produk dengan stock terendah</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.criticalStock.length > 0 ? (
                data.criticalStock.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 rounded-2xl border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-11 w-11 rounded-xl bg-red-500/10 flex items-center justify-center">
                        <Boxes className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <h4 className="font-medium">{item.product}</h4>
                        <p className="text-sm text-muted-foreground">Min: {item.minStock}</p>
                      </div>
                    </div>
                    <Badge className="bg-red-500/10 text-red-500 border-0">
                      {item.stock} pcs
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Tidak ada produk dengan stock kritis.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Barang Masuk Menunggu Verifikasi</CardTitle>
            <CardDescription>Penerimaan yang belum menambah stok final.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.pendingIncoming.length > 0 ? (
              data.pendingIncoming.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate("/dashboard/incoming")}
                  className="flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors hover:border-primary/60"
                >
                  <div>
                    <p className="font-medium">{item.receiptId}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.supplier} - {item.totalItems} item / {item.totalQty} unit
                    </p>
                  </div>
                  <Badge variant="secondary">{item.status}</Badge>
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Tidak ada penerimaan yang menunggu verifikasi.
              </p>
            )}
          </CardContent>
        </Card>

        {/* RECENT ACTIVITIES */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>Aktivitas inventory terbaru</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.recentActivities.length > 0 ? (
              data.recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-4 rounded-2xl border"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                        activity.type === "IN"
                          ? "bg-emerald-500/10"
                          : activity.type === "OUT"
                          ? "bg-red-500/10"
                          : "bg-primary/10"
                      }`}
                    >
                      {activity.type === "IN" ? (
                        <ArrowDownCircle className="w-5 h-5 text-emerald-500" />
                      ) : activity.type === "OUT" ? (
                        <ArrowUpCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <Truck className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium">{activity.title}</h4>
                      <p className="text-sm text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                  <Badge
                    className={
                      activity.type === "IN"
                        ? "bg-emerald-500/10 text-emerald-500 border-0"
                        : "bg-red-500/10 text-red-500 border-0"
                    }
                  >
                    {activity.type === "IN" ? "+" : "-"}{activity.qty}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Belum ada aktivitas
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
