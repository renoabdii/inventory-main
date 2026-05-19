import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle,
  Package,
  Clock,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Line,
  Bar,
} from "recharts";
import { useState } from "react";

// Mock prediction data
const predictionData = [
  { month: "Jan", actual: 2400, predicted: null, lower: null, upper: null },
  { month: "Feb", actual: 2210, predicted: null, lower: null, upper: null },
  { month: "Mar", actual: 2290, predicted: null, lower: null, upper: null },
  { month: "Apr", actual: 2000, predicted: null, lower: null, upper: null },
  { month: "Mei", actual: 2181, predicted: null, lower: null, upper: null },
  { month: "Jun", actual: 2500, predicted: null, lower: null, upper: null },
  { month: "Jul", actual: 2847, predicted: 2847, lower: 2700, upper: 2994 },
  { month: "Agu", actual: null, predicted: 2650, lower: 2450, upper: 2850 },
  { month: "Sep", actual: null, predicted: 2480, lower: 2200, upper: 2760 },
  { month: "Okt", actual: null, predicted: 2320, lower: 1950, upper: 2690 },
  { month: "Nov", actual: null, predicted: 2150, lower: 1700, upper: 2600 },
  { month: "Des", actual: null, predicted: 2050, lower: 1500, upper: 2600 },
];

// Mock item predictions - Swalayan items
const itemPredictions = [
  { id: 1, name: "Minyak Goreng Bimoli 2L", currentStock: 18, predictedDays: 5, trend: "down", riskLevel: "high", reorderQty: 80 },
  { id: 2, name: "Gula Pasir Gulaku 1kg", currentStock: 8, predictedDays: 2, trend: "down", riskLevel: "critical", reorderQty: 100 },
  { id: 3, name: "Tepung Terigu Segitiga Biru 1kg", currentStock: 5, predictedDays: 1, trend: "down", riskLevel: "critical", reorderQty: 80 },
  { id: 4, name: "Teh Botol Sosro 450ml", currentStock: 12, predictedDays: 3, trend: "down", riskLevel: "critical", reorderQty: 120 },
  { id: 5, name: "Telur Ayam 1kg", currentStock: 28, predictedDays: 7, trend: "down", riskLevel: "medium", reorderQty: 50 },
  { id: 6, name: "Indomie Goreng (karton)", currentStock: 245, predictedDays: 30, trend: "stable", riskLevel: "low", reorderQty: 0 },
  { id: 7, name: "Susu Ultra Full Cream 1L", currentStock: 156, predictedDays: 21, trend: "stable", riskLevel: "low", reorderQty: 0 },
  { id: 8, name: "Royco Ayam 100g", currentStock: 15, predictedDays: 6, trend: "down", riskLevel: "high", reorderQty: 60 },
];

// Mock demand forecast
const demandForecast = [
  { name: "Minggu 1", demand: 120, capacity: 150 },
  { name: "Minggu 2", demand: 145, capacity: 150 },
  { name: "Minggu 3", demand: 180, capacity: 150 },
  { name: "Minggu 4", demand: 160, capacity: 150 },
];

const getRiskBadge = (risk: string) => {
  switch (risk) {
    case "critical":
      return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-0">Kritis</Badge>;
    case "high":
      return <Badge className="bg-warning/10 text-warning hover:bg-warning/20 border-0">Tinggi</Badge>;
    case "medium":
      return <Badge className="bg-info/10 text-info hover:bg-info/20 border-0">Sedang</Badge>;
    case "low":
      return <Badge className="bg-success/10 text-success hover:bg-success/20 border-0">Rendah</Badge>;
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
};

const StockPrediction = () => {
  const [timeRange, setTimeRange] = useState("6months");

  const criticalItems = itemPredictions.filter(i => i.riskLevel === "critical").length;
  const highRiskItems = itemPredictions.filter(i => i.riskLevel === "high").length;
  const avgDaysToStockout = Math.round(itemPredictions.reduce((acc, i) => acc + i.predictedDays, 0) / itemPredictions.length);

  return (
    <DashboardLayout title="Prediksi Stock">
      <div className="space-y-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kritis</p>
                  <p className="text-xl font-bold">{criticalItems} item</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Package className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Risiko Tinggi</p>
                  <p className="text-xl font-bold">{highRiskItems} item</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rata-rata Habis</p>
                  <p className="text-xl font-bold">{avgDaysToStockout} hari</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Akurasi Model</p>
                  <p className="text-xl font-bold">94.2%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Prediction Chart */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Prediksi Stock Total</CardTitle>
                <CardDescription>Proyeksi stock dengan interval kepercayaan 95%</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-40">
                    <Calendar className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3months">3 Bulan</SelectItem>
                    <SelectItem value="6months">6 Bulan</SelectItem>
                    <SelectItem value="12months">12 Bulan</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={predictionData}>
                  <defs>
                    <linearGradient id="predictionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="upper"
                    stroke="transparent"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.1}
                    name="Batas Atas"
                  />
                  <Area
                    type="monotone"
                    dataKey="lower"
                    stroke="transparent"
                    fill="hsl(var(--background))"
                    name="Batas Bawah"
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="hsl(var(--foreground))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--foreground))", strokeWidth: 2 }}
                    name="Aktual"
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                    name="Prediksi"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Demand Forecast Chart */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Perkiraan Permintaan</CardTitle>
              <CardDescription>Prediksi permintaan vs kapasitas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={demandForecast}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="demand" fill="hsl(var(--primary))" name="Permintaan" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="capacity" stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="5 5" name="Kapasitas" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Reorder Recommendations */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Rekomendasi Pemesanan</CardTitle>
              <CardDescription>Item yang perlu segera dipesan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {itemPredictions.filter(i => i.reorderQty > 0).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Stock: {item.currentStock}</span>
                      <span>•</span>
                      <span className={item.predictedDays <= 3 ? "text-destructive" : ""}>
                        Habis dalam {item.predictedDays} hari
                      </span>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-bold text-primary">+{item.reorderQty}</p>
                    <p className="text-xs text-muted-foreground">unit</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Prediction Table */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Detail Prediksi per Item</CardTitle>
                <CardDescription>Estimasi waktu kehabisan stock untuk setiap item</CardDescription>
              </div>
              <Button variant="outline" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Perbarui Prediksi
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Nama Barang</TableHead>
                    <TableHead className="text-right">Stock Saat Ini</TableHead>
                    <TableHead className="text-right">Prediksi Habis</TableHead>
                    <TableHead>Tren</TableHead>
                    <TableHead>Risiko</TableHead>
                    <TableHead className="text-right">Reorder Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemPredictions.map((item) => (
                    <TableRow key={item.id} className="border-border/50">
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{item.currentStock}</TableCell>
                      <TableCell className="text-right">
                        <span className={item.predictedDays <= 3 ? "text-destructive font-medium" : ""}>
                          {item.predictedDays} hari
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {item.trend === "down" ? (
                            <TrendingDown className="w-4 h-4 text-destructive" />
                          ) : item.trend === "up" ? (
                            <TrendingUp className="w-4 h-4 text-success" />
                          ) : (
                            <span className="w-4 h-4 text-muted-foreground">—</span>
                          )}
                          <span className="text-sm text-muted-foreground capitalize">{item.trend}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getRiskBadge(item.riskLevel)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {item.reorderQty > 0 ? (
                          <span className="text-primary">+{item.reorderQty}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StockPrediction;
