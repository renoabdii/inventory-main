import { useState, useEffect, useCallback } from "react";
import CashierLayout from "@/components/layout/CashierLayout";
import TablePagination from "@/components/TablePagination";
import { TableLoadingRows } from "@/components/LoadingState";
import { useDebounce } from "@/hooks/useDebounce";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Package } from "lucide-react";

import { API_BASE_URL } from "@/lib/api";

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
  const debouncedSearchQuery = useDebounce(searchQuery);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  const fetchProducts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearchQuery) params.append("search", debouncedSearchQuery);
      params.append("page", String(currentPage));
      params.append("limit", "10");

      const res = await fetch(`${API_BASE_URL}/api/products?${params}`, {
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
  }, [currentPage, debouncedSearchQuery, token]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <CashierLayout title="Cek Stok">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Cek Stok Produk
            </CardTitle>
            <CardDescription>
              Lihat ketersediaan stok produk. Kasir tidak mengubah stok dari halaman ini.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-sm">
              <p className="font-medium text-blue-700">Flow stok kasir</p>
              <p className="text-muted-foreground mt-1">
                Gunakan halaman ini untuk mengecek stok sebelum transaksi. Jika stok menipis atau hampir habis, admin melakukan restock lewat Purchase Order atau Barang Masuk.
              </p>
            </div>

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
                    <TableLoadingRows columns={5} />
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
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">Tidak ada produk</p>
                          <p className="text-sm">Hubungi admin untuk menambahkan produk atau coba kata kunci lain.</p>
                        </div>
                      </TableCell>
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
