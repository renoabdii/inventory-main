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
import { Button } from "@/components/ui/button";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  AlertTriangle,
  Brain,
  TrendingDown,
  TrendingUp,
  Package,
  Sparkles,
  ShoppingCart,
  RefreshCcw,
} from "lucide-react";

/* =========================
   TYPES
========================= */

interface ForecastItem {
  productId: string;
  product: string;
  sku: string;
  category: string;
  stock: number;
  minStock: number;
  avgOut: number;
  predictedDays: number;
  predictedDaily: number[];
  method: string;
  status: string;
}

interface ForecastStats {
  safe: number;
  restock: number;
  critical: number;
  method: string;
}

/* =========================
   STATUS BADGE
========================= */

const getStatusBadge = (status: string) => {
  switch (status) {
    case "SAFE":
      return <Badge className="bg-emerald-500/10 text-emerald-500 border-0">SAFE</Badge>;
    case "RESTOCK":
      return <Badge className="bg-yellow-500/10 text-yellow-500 border-0">RESTOCK</Badge>;
    case "CRITICAL":
      return <Badge className="bg-red-500/10 text-red-500 border-0">CRITICAL</Badge>;
    default:
      return <Badge>UNKNOWN</Badge>;
  }
};

/* =========================
   PAGE
========================= */

const Forecast = () => {
  const [forecastData, setForecastData] = useState<ForecastItem[]>([]);
  const [stats, setStats] = useState<ForecastStats>({ safe: 0, restock: 0, critical: 0, method: "" });
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  const fetchForecast = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/forecast`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setForecastData(json.data);
        setStats(json.stats);
      }
    } catch (error) {
      console.error("Error fetching forecast:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, [token]);

  const criticalItems = forecastData.filter((i) => i.status === "CRITICAL");
  const restockItems = forecastData.filter((i) => i.status === "RESTOCK");
  const safeItems = forecastData.filter((i) => i.status === "SAFE");

  return (
    <DashboardLayout title="Forecast">
      <div className="space-y-6">
        {/* AI HEADER */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-4 rounded-2xl bg-primary/10">
                  <Brain className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    AI Stock Forecast
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    Prediksi kapan stock akan habis menggunakan metode{" "}
                    <span className="font-medium text-primary">
                      {stats.method === "lstm" ? "LSTM (Deep Learning)" : "Moving Average"}
                    </span>
                    {" "}berdasarkan data historis pergerakan stok.
                  </p>
                </div>
              </div>
              <Button className="gap-2" onClick={fetchForecast} disabled={loading}>
                <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Generating..." : "Generate Forecast"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Safe Products</p>
                  <h2 className="text-3xl font-bold mt-1">{stats.safe}</h2>
                  <p className="text-xs text-emerald-500 mt-2">Stock aman</p>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/10">
                  <Package className="w-6 h-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Need Restock</p>
                  <h2 className="text-3xl font-bold mt-1">{stats.restock}</h2>
                  <p className="text-xs text-yellow-500 mt-2">Segera restock</p>
                </div>
                <div className="p-3 rounded-2xl bg-yellow-500/10">
                  <ShoppingCart className="w-6 h-6 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Critical</p>
                  <h2 className="text-3xl font-bold mt-1">{stats.critical}</h2>
                  <p className="text-xs text-red-500 mt-2">Stock hampir habis</p>
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
                  <p className="text-sm text-muted-foreground">Metode</p>
                  <h2 className="text-lg font-bold mt-1 uppercase">{stats.method || "-"}</h2>
                  <p className="text-xs text-primary mt-2">
                    {stats.method === "lstm" ? "Deep Learning" : "Statistical"}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-primary/10">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SMART RECOMMENDATION */}
        <Card>
          <CardHeader>
            <CardTitle>Smart Recommendation</CardTitle>
            <CardDescription>Rekomendasi otomatis dari sistem forecasting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* CRITICAL */}
            {criticalItems.length > 0 && (
              <div className="p-5 rounded-2xl border border-red-500/20 bg-red-500/5">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-red-500/10">
                    <TrendingDown className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-red-500">Prioritas Restock (≤ 3 hari)</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Produk berikut diprediksi akan habis dalam waktu sangat dekat:
                    </p>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {criticalItems.map((item) => (
                        <Badge key={item.productId} className="bg-red-500/10 text-red-500 border-0">
                          {item.product} ({item.predictedDays} hari)
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* RESTOCK */}
            {restockItems.length > 0 && (
              <div className="p-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/5">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-yellow-500/10">
                    <ShoppingCart className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-yellow-500">Perlu Restock (4-7 hari)</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Produk berikut perlu segera di-restock:
                    </p>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {restockItems.map((item) => (
                        <Badge key={item.productId} className="bg-yellow-500/10 text-yellow-500 border-0">
                          {item.product} ({item.predictedDays} hari)
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SAFE */}
            {safeItems.length > 0 && (
              <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-emerald-500/10">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-emerald-500">Stock Stabil (&gt; 7 hari)</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {safeItems.length} produk memiliki stock aman untuk beberapa hari ke depan.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {forecastData.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Belum ada data untuk diprediksi. Tambahkan produk dan catat pergerakan stok terlebih dahulu.
              </p>
            )}
          </CardContent>
        </Card>

        {/* FORECAST TABLE */}
        <Card>
          <CardHeader>
            <CardTitle>Forecast Prediction</CardTitle>
            <CardDescription>
              Prediksi stock berdasarkan data historis pergerakan stok
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Produk</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="text-center">Avg Out/hari</TableHead>
                    <TableHead>Prediksi Habis</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCcw className="w-4 h-4 animate-spin" />
                          Generating prediction...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : forecastData.length > 0 ? (
                    forecastData.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.product}</p>
                            <p className="text-xs text-muted-foreground">{item.sku}</p>
                          </div>
                        </TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell className="text-center font-bold">{item.stock}</TableCell>
                        <TableCell className="text-center">{item.avgOut}/hari</TableCell>
                        <TableCell>
                          <span className={`font-medium ${
                            item.predictedDays <= 3
                              ? "text-red-500"
                              : item.predictedDays <= 7
                              ? "text-yellow-500"
                              : "text-emerald-500"
                          }`}>
                            {item.predictedDays >= 999 ? "∞" : `${item.predictedDays} Hari`}
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        Belum ada data prediksi
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>Menampilkan {forecastData.length} prediksi stock</span>
              <span>Metode: {stats.method === "lstm" ? "LSTM Neural Network" : "Moving Average"}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Forecast;
