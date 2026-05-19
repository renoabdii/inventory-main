import { useState, useEffect } from "react";
import CashierLayout from "@/components/layout/CashierLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, DollarSign, Package, TrendingUp } from "lucide-react";

const API_URL = "http://localhost:3000";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

const DashboardKasir = () => {
  const [stats, setStats] = useState({ todayTransactions: 0, todayTotal: 0, todayItems: 0, allTransactions: 0 });
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || '{"username":"Kasir"}');

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/transactions/cashier-stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((json) => { if (json.success) setStats(json.data); })
      .catch(console.error);
  }, [token]);

  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <CashierLayout title="Dashboard">
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Halo, {user.username} 👋</h1>
            <p className="text-muted-foreground mt-1">Ringkasan penjualan hari ini.</p>
          </div>
          <Badge className="w-fit bg-primary/10 text-primary border-0 px-4 py-2 text-sm">{today}</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Transaksi Hari Ini</p>
                  <h2 className="text-3xl font-bold mt-1">{stats.todayTransactions}</h2>
                </div>
                <div className="p-3 rounded-2xl bg-primary/10">
                  <ShoppingCart className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Penjualan</p>
                  <h2 className="text-2xl font-bold mt-1">{formatCurrency(stats.todayTotal)}</h2>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/10">
                  <DollarSign className="w-6 h-6 text-emerald-500" />
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
                <div className="p-3 rounded-2xl bg-yellow-500/10">
                  <Package className="w-6 h-6 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Semua Transaksi</p>
                  <h2 className="text-3xl font-bold mt-1">{stats.allTransactions}</h2>
                </div>
                <div className="p-3 rounded-2xl bg-blue-500/10">
                  <TrendingUp className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </CashierLayout>
  );
};

export default DashboardKasir;
