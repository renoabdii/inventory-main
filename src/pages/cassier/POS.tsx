import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import CashierLayout from "@/components/layout/CashierLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Minus, Trash2, ShoppingBag, ScanBarcode } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API_URL = "http://localhost:3000";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

interface ProductItem {
  _id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  category: string;
}

interface CartItem {
  productId: string;
  name: string;
  sku: string;
  price: number;
  qty: number;
  stock: number;
}

const POS = () => {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [loading, setLoading] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const token = localStorage.getItem("token");

  // Auto-focus barcode input
  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  // Handle barcode scan (Enter key)
  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && barcodeInput.trim()) {
      const product = products.find(
        (p) => p.sku.toLowerCase() === barcodeInput.trim().toLowerCase()
      );
      if (product) {
        addToCart(product);
        toast.success(`${product.name} ditambahkan`);
      } else {
        toast.error(`Produk dengan SKU "${barcodeInput}" tidak ditemukan`);
      }
      setBarcodeInput("");
      barcodeRef.current?.focus();
    }
  };

  // Fetch products
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/products?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((json) => { if (json.success) setProducts(json.data); })
      .catch(console.error);
  }, [token]);

  // Filter products
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Cart functions
  const addToCart = (product: ProductItem) => {
    const existing = cart.find((c) => c.productId === product._id);
    if (existing) {
      if (existing.qty >= product.stock) {
        toast.warning(`Stok ${product.name} tidak cukup`);
        return;
      }
      setCart(cart.map((c) => c.productId === product._id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      if (product.stock <= 0) {
        toast.warning(`${product.name} stok habis`);
        return;
      }
      setCart([...cart, { productId: product._id, name: product.name, sku: product.sku, price: product.price, qty: 1, stock: product.stock }]);
    }
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(cart.map((c) => {
      if (c.productId === productId) {
        const newQty = c.qty + delta;
        if (newQty <= 0) return c;
        if (newQty > c.stock) { toast.warning("Stok tidak cukup"); return c; }
        return { ...c, qty: newQty };
      }
      return c;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((c) => c.productId !== productId));
  };

  const totalAmount = cart.reduce((acc, c) => acc + c.price * c.qty, 0);
  const changeAmount = Number(paymentAmount) - totalAmount;

  // Submit transaction
  const handleSubmit = async () => {
    if (cart.length === 0) { toast.warning("Keranjang masih kosong"); return; }
    if (!paymentAmount || Number(paymentAmount) < totalAmount) {
      toast.warning("Pembayaran kurang dari total belanja");
      return;
    }
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          items: cart.map((c) => ({ productId: c.productId, qty: c.qty })),
          paymentAmount: Number(paymentAmount),
          paymentMethod,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Transaksi berhasil! Kembalian: ${formatCurrency(json.data.changeAmount)}`);
        setCart([]);
        setPaymentAmount("");
        barcodeRef.current?.focus();
        // Refresh products
        const prodRes = await fetch(`${API_URL}/api/products?limit=100`, { headers: { Authorization: `Bearer ${token}` } });
        const prodJson = await prodRes.json();
        if (prodJson.success) setProducts(prodJson.data);
      } else {
        toast.error(json.message || "Gagal memproses transaksi");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <CashierLayout title="POS - Point of Sale">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
        {/* LEFT: Product List */}
        <div className="lg:col-span-2 flex flex-col">
          {/* Barcode Scanner Input */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={barcodeRef}
                placeholder="Scan barcode / ketik SKU lalu Enter..."
                className="pl-10 border-primary/30 focus:border-primary"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeScan}
              />
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama produk..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto flex-1">
            {filteredProducts.map((product) => (
              <Card
                key={product._id}
                className={`cursor-pointer hover:border-primary/50 transition-colors ${product.stock <= 0 ? "opacity-50" : ""}`}
                onClick={() => addToCart(product)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-2">
                    <p className="font-medium text-sm line-clamp-2">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.sku}</p>
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-primary text-sm">{formatCurrency(product.price)}</p>
                      <Badge variant={product.stock > 0 ? "secondary" : "destructive"} className="text-xs">
                        {product.stock}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* RIGHT: Cart */}
        <div className="flex flex-col">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingBag className="w-5 h-5" />
                Keranjang ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {cart.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Keranjang kosong</p>
                ) : (
                  cart.map((item) => (
                    <div key={item.productId} className="flex items-center gap-3 p-3 rounded-xl border">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(item.price)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.productId, -1)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-bold">{item.qty}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.productId, 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-sm font-bold w-20 text-right">{formatCurrency(item.price * item.qty)}</p>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => removeFromCart(item.productId)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {/* Payment */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(totalAmount)}</span>
                </div>

                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="debit">Debit</SelectItem>
                    <SelectItem value="qris">QRIS</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  placeholder="Jumlah bayar"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />

                {Number(paymentAmount) > 0 && Number(paymentAmount) >= totalAmount && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Kembalian</span>
                    <span className="font-bold text-emerald-500">{formatCurrency(changeAmount)}</span>
                  </div>
                )}

                <Button className="w-full gap-2" size="lg" onClick={handleSubmit} disabled={loading || cart.length === 0}>
                  <ShoppingBag className="w-4 h-4" />
                  {loading ? "Memproses..." : "Bayar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </CashierLayout>
  );
};

export default POS;
