import { useState, useEffect } from "react";
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

import {
  Package,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  ShoppingCart,
  TrendingDown,
  Truck,
  Boxes,
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
  recentActivities: {
    id: string;
    title: string;
    time: string;
    type: string;
    qty: number;
  }[];
}

/* =========================
   PAGE
========================= */

const Dashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  const fetchDashboard = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/dashboard/summary`, {
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
  };

  useEffect(() => {
    fetchDashboard();
  }, [token]);

  const today = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (loading || !data) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Memuat data dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Selamat Datang, Admin 👋</h1>
            <p className="text-muted-foreground mt-1">
              Berikut ringkasan inventory hari ini.
            </p>
          </div>
          <Badge className="w-fit bg-primary/10 text-primary border-0 px-4 py-2 text-sm">
            {today}
          </Badge>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* TOTAL PRODUCT */}
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

          {/* STOCK CRITICAL */}
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

          {/* STOCK IN TODAY */}
          <Card>
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
          <Card>
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
                  Tidak ada produk dengan stock kritis 🎉
                </p>
              )}
            </CardContent>
          </Card>
        </div>

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
