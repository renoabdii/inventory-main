import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  TrendingDown,
  TrendingUp,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";

// Mock anomaly data - Swalayan items
const anomalyData = [
  { id: 1, item: "Minyak Goreng Bimoli 2L", type: "sudden_drop", severity: "high", detected: "2024-01-15 10:30", change: -45, description: "Penurunan stock mendadak 45 unit dalam 2 jam" },
  { id: 2, item: "Gula Pasir Gulaku 1kg", type: "unusual_pattern", severity: "medium", detected: "2024-01-15 09:15", change: -32, description: "Pola pengeluaran tidak normal terdeteksi" },
  { id: 3, item: "Tepung Terigu Segitiga Biru 1kg", type: "low_stock_alert", severity: "high", detected: "2024-01-14 16:00", change: -25, description: "Stock di bawah batas minimum" },
  { id: 4, item: "Indomie Goreng (karton)", type: "sudden_increase", severity: "low", detected: "2024-01-14 14:30", change: 200, description: "Peningkatan stock dari pengiriman besar" },
  { id: 5, item: "Telur Ayam 1kg", type: "data_inconsistency", severity: "medium", detected: "2024-01-13 11:45", change: 0, description: "Ketidaksesuaian data antara sistem kasir dan gudang" },
];

// Mock trend data with anomaly
const trendData = [
  { date: "01", value: 100, expected: 100 },
  { date: "02", value: 98, expected: 98 },
  { date: "03", value: 95, expected: 96 },
  { date: "04", value: 92, expected: 94 },
  { date: "05", value: 88, expected: 92 },
  { date: "06", value: 45, expected: 90 }, // Anomaly point
  { date: "07", value: 42, expected: 88 },
  { date: "08", value: 40, expected: 86 },
];

// Mock scatter data for anomaly visualization
const scatterData = [
  { x: 100, y: 50, z: 200, name: "Normal", status: "normal" },
  { x: 120, y: 55, z: 180, name: "Normal", status: "normal" },
  { x: 90, y: 45, z: 220, name: "Normal", status: "normal" },
  { x: 200, y: 20, z: 300, name: "Anomali", status: "anomaly" },
  { x: 110, y: 52, z: 190, name: "Normal", status: "normal" },
  { x: 15, y: 80, z: 150, name: "Anomali", status: "anomaly" },
  { x: 105, y: 48, z: 210, name: "Normal", status: "normal" },
];

const getSeverityBadge = (severity: string) => {
  switch (severity) {
    case "high":
      return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-0 gap-1"><XCircle className="w-3 h-3" /> Tinggi</Badge>;
    case "medium":
      return <Badge className="bg-warning/10 text-warning hover:bg-warning/20 border-0 gap-1"><AlertCircle className="w-3 h-3" /> Sedang</Badge>;
    case "low":
      return <Badge className="bg-info/10 text-info hover:bg-info/20 border-0 gap-1"><CheckCircle className="w-3 h-3" /> Rendah</Badge>;
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
};

const getTypeLabel = (type: string) => {
  const types: Record<string, string> = {
    sudden_drop: "Penurunan Mendadak",
    sudden_increase: "Peningkatan Mendadak",
    unusual_pattern: "Pola Tidak Normal",
    low_stock_alert: "Stock Rendah",
    data_inconsistency: "Inkonsistensi Data",
  };
  return types[type] || type;
};

const AnomalyDetection = () => {
  const highSeverity = anomalyData.filter(a => a.severity === "high").length;
  const mediumSeverity = anomalyData.filter(a => a.severity === "medium").length;
  const lowSeverity = anomalyData.filter(a => a.severity === "low").length;

  return (
    <DashboardLayout title="Deteksi Anomali">
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
                  <p className="text-sm text-muted-foreground">Total Anomali</p>
                  <p className="text-xl font-bold">{anomalyData.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <XCircle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tinggi</p>
                  <p className="text-xl font-bold">{highSeverity}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <AlertCircle className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sedang</p>
                  <p className="text-xl font-bold">{mediumSeverity}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-info/10">
                  <CheckCircle className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rendah</p>
                  <p className="text-xl font-bold">{lowSeverity}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Anomaly Trend Chart */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Deteksi Tren Anomali</CardTitle>
              <CardDescription>Perbandingan nilai aktual vs ekspektasi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expected"
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      dot={false}
                      name="Ekspektasi"
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                      name="Aktual"
                    />
                    <ReferenceLine y={50} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ value: "Anomali", fill: "hsl(var(--destructive))", fontSize: 12 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Scatter Plot for Anomaly Detection */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Pemetaan Anomali</CardTitle>
              <CardDescription>Visualisasi outlier dalam data stock</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" dataKey="x" name="Stock" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis type="number" dataKey="y" name="Turnover" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <ZAxis type="number" dataKey="z" range={[50, 400]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number, name: string) => [value, name]}
                    />
                    <Scatter
                      name="Data Points"
                      data={scatterData}
                      fill="hsl(var(--primary))"
                      shape={(props: { cx?: number; cy?: number; payload?: { status?: string } }) => {
                        const { cx, cy, payload } = props;
                        const isAnomaly = payload?.status === "anomaly";
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={isAnomaly ? 10 : 6}
                            fill={isAnomaly ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                            opacity={0.8}
                          />
                        );
                      }}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Normal</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-destructive" />
                  <span className="text-muted-foreground">Anomali</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Anomaly Table */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Daftar Anomali Terdeteksi</CardTitle>
                <CardDescription>Anomali stock yang memerlukan perhatian</CardDescription>
              </div>
              <Button variant="outline" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Scan Ulang
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Barang</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Perubahan</TableHead>
                    <TableHead>Terdeteksi</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anomalyData.map((item) => (
                    <TableRow key={item.id} className="border-border/50">
                      <TableCell className="font-medium">{item.item}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">{getTypeLabel(item.type)}</Badge>
                      </TableCell>
                      <TableCell>{getSeverityBadge(item.severity)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {item.change > 0 ? (
                            <TrendingUp className="w-4 h-4 text-success" />
                          ) : item.change < 0 ? (
                            <TrendingDown className="w-4 h-4 text-destructive" />
                          ) : null}
                          <span className={item.change > 0 ? "text-success" : item.change < 0 ? "text-destructive" : ""}>
                            {item.change > 0 ? `+${item.change}` : item.change}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{item.detected}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{item.description}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="w-4 h-4" />
                        </Button>
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

export default AnomalyDetection;
