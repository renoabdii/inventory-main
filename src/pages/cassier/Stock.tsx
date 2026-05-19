import { useState, useEffect } from "react";
import CashierLayout from "@/components/layout/CashierLayout";
import TablePagination from "@/components/TablePagination";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Package } from "lucide-react";

const API_URL = "http://localhost:3000";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

interface ProductItem {
  _id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  price: number;
  status: string;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "normal": return <Badge className="bg-emerald-500/10 text-emerald-500 border-0">Tersedia</Badge>;
    case "low": return <Badge className="bg-yellow-500/10 text-yellow-500 border-0">Menipis</Badge>;
    case "critical": return <Badge className="bg-red-500/10 text-red-500 border-0">Hampir Habis</Badge>;
    default: return <Badge variant="secondary">-</Badge>;
  }
};

const Stock = () => {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  const fetchProducts = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      params.append("page", String(currentPage));
      params.append("limit", "10");

      const res = await fetch(`${API_URL}/api/products?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setProducts(json.data);
        if (json.pagination) {
          setTotalPages(json.pagination.totalPages);
          setTotalItems(json.pagination.total);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [searchQuery, currentPage, token]);

  return (
    <CashierLayout title="Cek Stok">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Cek Stok Produk
            </CardTitle>
            <CardDescription>Lihat ketersediaan stok produk (read-only)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama produk atau SKU..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>

            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Produk</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Harga</TableHead>
                    <TableHead className="text-center">Stok</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Memuat data...</TableCell>
                    </TableRow>
                  ) : products.length > 0 ? (
                    products.map((p) => (
                      <TableRow key={p._id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.sku}</p>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="secondary">{p.category}</Badge></TableCell>
                        <TableCell className="text-right">{formatCurrency(p.price)}</TableCell>
                        <TableCell className={`text-center font-bold ${
                          p.status === "critical" ? "text-red-500" : p.status === "low" ? "text-yellow-500" : "text-emerald-500"
                        }`}>{p.stock}</TableCell>
                        <TableCell>{getStatusBadge(p.status)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Tidak ada produk</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              showing={products.length}
              onPageChange={setCurrentPage}
              label="produk"
            />
          </CardContent>
        </Card>
      </div>
    </CashierLayout>
  );
};

export default Stock;
