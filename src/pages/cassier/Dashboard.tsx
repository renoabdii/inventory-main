import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CashierLayout from "@/components/layout/CashierLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListLoading } from "@/components/LoadingState";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  CreditCard,
  Package,
  ReceiptText,
  Search,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";

import { API_BASE_URL } from "@/lib/api";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

interface CashierStats {
  todayTransactions: number;
  todayTotal: number;
  todayItems: number;
  allTransactions: number;
}

interface LowStockProduct {
  _id: string;
  name: string;
  sku: string;
  stock: number;
  minStock: number;
  status: string;
}

interface TransactionItem {
  qty: number;
}

interface RecentTransaction {
  _id: string;
  invoiceNumber: string;
  totalAmount: number;
  paymentMethod: string;
  createdAt: string;
  items: TransactionItem[];
}

interface ActiveShift {
  _id: string;
  openedAt: string;
  openingCash: number;
  totalTransactions: number;
}

const DashboardKasir = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<CashierStats>({
    todayTransactions: 0,
    todayTotal: 0,
    todayItems: 0,
    allTransactions: 0,
  });
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || '{"username":"Kasir"}');

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };
    setLoading(true);

    Promise.all([
      fetch(`${API_BASE_URL}/api/transactions/cashier-stats`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE_URL}/api/cashier-shifts/active`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE_URL}/api/products/low-stock`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE_URL}/api/transactions?limit=5`, { headers }).then((r) => r.json()),
    ])
      .then(([statsJson, shiftJson, stockJson, transactionsJson]) => {
        if (statsJson.success) setStats(statsJson.data);
        if (shiftJson.success) setActiveShift(shiftJson.data);
        if (stockJson.success) setLowStock(stockJson.data.slice(0, 5));
        if (transactionsJson.success) setRecentTransactions(transactionsJson.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const today = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const currentTime = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const averageTransaction =
    stats.todayTransactions > 0 ? stats.todayTotal / stats.todayTransactions : 0;

  const quickActions = [
    {
      label: activeShift ? "Mulai Transaksi" : "Buka Shift",
      description: activeShift ? "Buka POS untuk penjualan baru" : "Mulai sesi kerja sebelum transaksi",
      icon: ShoppingBag,
      path: activeShift ? "/kasir/pos" : "/kasir/shift",
      className: activeShift
        ? "bg-emerald-500 text-white hover:bg-emerald-600"
        : "bg-amber-500 text-white hover:bg-amber-600",
    },
    {
      label: "Riwayat",
      description: "Cek transaksi kasir",
      icon: ReceiptText,
      path: "/kasir/transactions",
      className: "bg-primary text-primary-foreground hover:bg-primary/90",
    },
    {
      label: "Cek Stok",
      description: "Cari stok produk",
      icon: Search,
      path: "/kasir/stock",
      className: "bg-slate-900 text-white hover:bg-slate-800",
    },
  ];

  return (
    <CashierLayout title="Dashboard Kasir">
      <div className="space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge className="bg-emerald-500/10 text-emerald-600 border-0">
                {activeShift ? "Shift Aktif" : "Shift Belum Dibuka"}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Clock className="w-3 h-3" />
                {currentTime}
              </Badge>
            </div>
            <h1 className="text-3xl font-bold capitalize">Halo, {user.username}</h1>
            <p className="text-muted-foreground mt-1">
              Ringkasan operasional kasir untuk {today}.
            </p>
          </div>

          <Button
            size="lg"
            className="gap-2"
            onClick={() => navigate(activeShift ? "/kasir/pos" : "/kasir/shift")}
          >
            <ShoppingBag className="w-4 h-4" />
            {activeShift ? "Mulai Transaksi" : "Buka Shift"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Transaksi Hari Ini</p>
                  <h2 className="text-3xl font-bold mt-1">{stats.todayTransactions}</h2>
                </div>
                <div className="p-3 rounded-xl bg-primary/10">
                  <ShoppingCart className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Total Penjualan</p>
                  <h2 className="text-2xl font-bold mt-1">{formatCurrency(stats.todayTotal)}</h2>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10">
                  <CreditCard className="w-6 h-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Item Terjual</p>
                  <h2 className="text-3xl font-bold mt-1">{stats.todayItems}</h2>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10">
                  <Package className="w-6 h-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Rata-rata Transaksi</p>
                  <h2 className="text-2xl font-bold mt-1">{formatCurrency(averageTransaction)}</h2>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/10">
                  <TrendingUp className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <button
              key={action.path}
              type="button"
              onClick={() => navigate(action.path)}
              className={`${action.className} rounded-lg p-5 text-left transition-colors`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-lg bg-white/15 flex items-center justify-center">
                    <action.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{action.label}</p>
                    <p className="text-sm opacity-80">{action.description}</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 opacity-80" />
              </div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Perhatian Stok
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <ListLoading rows={4} />
              ) : lowStock.length > 0 ? (
                lowStock.map((product) => (
                  <div
                    key={product._id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.sku}</p>
                    </div>
                    <Badge
                      className={
                        product.status === "critical"
                          ? "bg-red-500/10 text-red-500 border-0"
                          : "bg-amber-500/10 text-amber-600 border-0"
                      }
                    >
                      {product.stock} tersisa
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <p className="font-medium text-emerald-600">Semua stok aman</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Belum ada produk yang masuk kategori stok rendah.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="xl:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Transaksi Terakhir</CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate("/kasir/transactions")}>
                Lihat Semua
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <ListLoading rows={4} />
              ) : recentTransactions.length > 0 ? (
                recentTransactions.map((transaction) => {
                  const totalItems = transaction.items.reduce((acc, item) => acc + item.qty, 0);
                  return (
                    <div
                      key={transaction._id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <ReceiptText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{transaction.invoiceNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(transaction.createdAt).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            - {totalItems} item - {transaction.paymentMethod.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <p className="font-bold text-right">{formatCurrency(transaction.totalAmount)}</p>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-lg border p-4">
                  <p className="font-medium">Belum ada transaksi hari ini</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Mulai transaksi pertama dari tombol POS.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </CashierLayout>
  );
};

export default DashboardKasir;
