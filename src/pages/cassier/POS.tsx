import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import CashierLayout from "@/components/layout/CashierLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Minus, Trash2, ShoppingBag, ScanBarcode } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { API_BASE_URL } from "@/lib/api";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

interface ProductItem {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
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

interface ReceiptTransaction {
  invoiceNumber: string;
  items: {
    productName: string;
    sku: string;
    qty: number;
    price: number;
    subtotal: number;
  }[];
  totalAmount: number;
  paymentAmount: number;
  changeAmount: number;
  paymentMethod: string;
  createdAt: string;
}

const POS = () => {
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [loading, setLoading] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<ReceiptTransaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isQrisOpen, setIsQrisOpen] = useState(false);
  const [qrisOrderId, setQrisOrderId] = useState("");
  const [qrisQrUrl, setQrisQrUrl] = useState("");
  const [qrisStatus, setQrisStatus] = useState<"pending" | "settlement" | "capture" | "expire" | "deny" | "cancel" | "failed">("pending");
  const [qrisTimeLeft, setQrisTimeLeft] = useState(900);
  const [qrisExpiresAt, setQrisExpiresAt] = useState<number | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  const cashierName = storedUser ? JSON.parse(storedUser).username : "-";

  // Auto-focus barcode input
  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  // Handle barcode scan (Enter key)
  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && barcodeInput.trim()) {
      const input = barcodeInput.trim().toLowerCase();
      const product = products.find(
        (p) =>
          p.sku.toLowerCase() === input ||
          (p.barcode && p.barcode.toLowerCase() === input)
      );
      if (product) {
        addToCart(product);
        toast.success(`${product.name} ditambahkan`);
      } else {
        toast.error(`Produk dengan kode "${barcodeInput}" tidak ditemukan`);
      }
      setBarcodeInput("");
      barcodeRef.current?.focus();
    }
  };

  // Fetch products
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/api/products?limit=100`, {
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
  const paidAmount = paymentMethod === "cash" ? Number(paymentAmount) : totalAmount;
  const changeAmount = paidAmount - totalAmount;

  useEffect(() => {
    if (!isQrisOpen || qrisStatus !== "pending" || !qrisExpiresAt) return;

    const interval = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((qrisExpiresAt - Date.now()) / 1000));
      setQrisTimeLeft(remaining);

      if (remaining <= 0) {
        setQrisStatus("expire");
        window.clearInterval(interval);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isQrisOpen, qrisExpiresAt, qrisStatus]);

  const refreshProducts = async () => {
    if (!token) return;
    const prodRes = await fetch(`${API_BASE_URL}/api/products?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const prodJson = await prodRes.json();
    if (prodJson.success) setProducts(prodJson.data);
  };

  const handlePaidQris = async (transaction: ReceiptTransaction) => {
    toast.success("Pembayaran QRIS berhasil");
    setLastTransaction(transaction);
    setIsQrisOpen(false);
    setIsReceiptOpen(true);
    await refreshProducts();
  };

  const checkQrisStatus = async (orderId = qrisOrderId, showFeedback = false) => {
    if (!token || !orderId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/payments/${orderId}/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.message || "Gagal mengecek status QRIS");
        return;
      }

      setQrisStatus(json.data.status);

      if (json.data.transaction) {
        await handlePaidQris(json.data.transaction);
      } else if (json.data.status === "pending") {
        if (showFeedback) {
          toast.info("Pembayaran QRIS masih menunggu.");
        }
      } else if (json.data.status === "settlement" || json.data.status === "capture") {
        if (showFeedback) {
          toast.info("Pembayaran sudah sukses, transaksi sedang diproses.");
        }
      } else if (json.data.status === "expire") {
        toast.error("QRIS sudah kadaluarsa. Buat pembayaran baru.");
      } else if (json.data.status === "failed") {
        toast.error(json.data.failureReason || "Pembayaran diterima, tetapi transaksi gagal diproses");
      } else if (showFeedback) {
        toast.warning(`Status QRIS: ${json.data.status}`);
      }
    } catch (error) {
      toast.error("Gagal mengecek status QRIS");
    }
  };

  const simulateQrisPaid = async () => {
    if (!token || !qrisOrderId) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/payments/${qrisOrderId}/simulate-paid`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.message || "Gagal mensimulasikan pembayaran QRIS");
        return;
      }

      setQrisStatus(json.data.status);
      if (json.data.transaction) {
        await handlePaidQris(json.data.transaction);
      } else {
        toast.success("Pembayaran QRIS disimulasikan sukses");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat simulasi QRIS");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isQrisOpen || !qrisOrderId || qrisStatus !== "pending") return;

    const interval = window.setInterval(() => {
      checkQrisStatus(qrisOrderId);
    }, 3000);

    return () => window.clearInterval(interval);
  }, [isQrisOpen, qrisOrderId, qrisStatus]);

  const prepareQris = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/payments/qris/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          items: cart.map((c) => ({ productId: c.productId, qty: c.qty })),
        }),
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.message || "Gagal membuat pembayaran QRIS");
        return;
      }

      setQrisOrderId(json.data.orderId);
      setQrisQrUrl(json.data.qrCodeUrl);
      setQrisStatus(json.data.status || "pending");
      const expires = json.data.expiredAt ? new Date(json.data.expiredAt).getTime() : Date.now() + 15 * 60 * 1000;
      setQrisExpiresAt(expires);
      setQrisTimeLeft(Math.max(0, Math.ceil((expires - Date.now()) / 1000)));
      setIsQrisOpen(true);
    } catch (error) {
      toast.error("Terjadi kesalahan saat membuat QRIS");
    } finally {
      setLoading(false);
    }
  };

  const processTransaction = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          items: cart.map((c) => ({ productId: c.productId, qty: c.qty })),
          paymentAmount: paidAmount,
          paymentMethod,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Transaksi berhasil! Kembalian: ${formatCurrency(json.data.changeAmount)}`);
        setLastTransaction(json.data);
        setIsReceiptOpen(true);
        await refreshProducts();
      } else {
        toast.error(json.message || "Gagal memproses transaksi");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  // Submit transaction
  const handleSubmit = async () => {
    if (cart.length === 0) { toast.warning("Keranjang masih kosong"); return; }
    if (paymentMethod === "cash" && (!paymentAmount || Number(paymentAmount) < totalAmount)) {
      toast.warning("Pembayaran kurang dari total belanja");
      return;
    }
    if (!token) return;

    if (paymentMethod === "qris") {
      await prepareQris();
      return;
    }

    const confirmed = await confirm({
      title: "Konfirmasi Pembayaran",
      description: `Total ${formatCurrency(totalAmount)} dibayar dengan ${paymentMethod.toUpperCase()}${
        paymentMethod === "cash" ? `, kembalian ${formatCurrency(changeAmount)}` : ""
      }. Lanjutkan transaksi?`,
      confirmText: "Ya, Bayar",
    });
    if (!confirmed) return;

    processTransaction();
  };

  const handleConfirmQrisPaid = async () => {
    if (qrisStatus === "expire") {
      toast.error("QRIS sudah kadaluarsa. Mohon buat ulang pembayaran.");
      return;
    }

    await checkQrisStatus(qrisOrderId, true);
  };

  const handleClearCart = async () => {
    if (cart.length === 0) return;
    const confirmed = await confirm({
      title: "Kosongkan Keranjang",
      description: "Semua item di keranjang akan dihapus. Lanjutkan?",
      confirmText: "Ya, Kosongkan",
      variant: "destructive",
    });
    if (!confirmed) return;

    setCart([]);
    setPaymentAmount("");
    setPaymentMethod("cash");
    barcodeRef.current?.focus();
  };

  const handlePaymentMethodChange = (value: string) => {
    setPaymentMethod(value);
    if (value !== "cash") {
      setPaymentAmount("");
    }
  };

  const handleNewTransaction = () => {
    setCart([]);
    setPaymentAmount("");
    setPaymentMethod("cash");
    setLastTransaction(null);
    setIsReceiptOpen(false);
    setQrisOrderId("");
    setQrisQrUrl("");
    setQrisStatus("pending");
    setTimeout(() => barcodeRef.current?.focus(), 0);
  };

  const handlePrintReceipt = () => {
    if (!lastTransaction) return;

    const receiptDate = new Date(lastTransaction.createdAt).toLocaleString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const rows = lastTransaction.items
      .map(
        (item) => `
          <tr>
            <td colspan="3">${item.productName}</td>
          </tr>
          <tr>
            <td>${item.qty} x ${formatCurrency(item.price)}</td>
            <td></td>
            <td class="right">${formatCurrency(item.subtotal)}</td>
          </tr>
        `
      )
      .join("");

    const printWindow = window.open("", "_blank", "width=380,height=640");
    if (!printWindow) {
      toast.error("Popup print diblokir browser");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Nota ${lastTransaction.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; width: 300px; margin: 0 auto; padding: 16px; color: #111; }
            h1 { font-size: 18px; margin: 0; text-align: center; }
            .center { text-align: center; }
            .muted { color: #555; font-size: 12px; }
            .line { border-top: 1px dashed #111; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            td { padding: 2px 0; vertical-align: top; }
            .right { text-align: right; }
            .total td { font-weight: 700; font-size: 13px; }
          </style>
        </head>
        <body>
          <h1>Ely Berkah Mart</h1>
          <div class="center muted">Nota Penjualan</div>
          <div class="line"></div>
          <table>
            <tr><td>No</td><td>:</td><td>${lastTransaction.invoiceNumber}</td></tr>
            <tr><td>Tanggal</td><td>:</td><td>${receiptDate}</td></tr>
            <tr><td>Kasir</td><td>:</td><td>${cashierName}</td></tr>
            <tr><td>Bayar</td><td>:</td><td>${lastTransaction.paymentMethod.toUpperCase()}</td></tr>
          </table>
          <div class="line"></div>
          <table>${rows}</table>
          <div class="line"></div>
          <table>
            <tr class="total"><td>Total</td><td class="right">${formatCurrency(lastTransaction.totalAmount)}</td></tr>
            <tr><td>Tunai</td><td class="right">${formatCurrency(lastTransaction.paymentAmount)}</td></tr>
            <tr><td>Kembali</td><td class="right">${formatCurrency(lastTransaction.changeAmount)}</td></tr>
          </table>
          <div class="line"></div>
          <div class="center muted">Terima kasih atas kunjungan Anda</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
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
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShoppingBag className="w-5 h-5" />
                  Keranjang ({cart.length})
                </CardTitle>
                {cart.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600"
                    onClick={handleClearCart}
                  >
                    Kosongkan
                  </Button>
                )}
              </div>
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

                <Select value={paymentMethod} onValueChange={handlePaymentMethodChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="debit">Debit</SelectItem>
                    <SelectItem value="qris">QRIS</SelectItem>
                  </SelectContent>
                </Select>

                {paymentMethod === "cash" ? (
                  <Input
                    type="number"
                    placeholder="Jumlah bayar"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                ) : (
                  <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nominal pembayaran</span>
                      <span className="font-bold">{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>
                )}

                {paymentMethod === "cash" && Number(paymentAmount) > 0 && Number(paymentAmount) >= totalAmount && (
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

      <Dialog open={isQrisOpen} onOpenChange={setIsQrisOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Pembayaran QRIS</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border p-4 text-center">
              <h2 className="text-lg font-bold">Ely Berkah Mart</h2>
              <p className="text-sm text-muted-foreground">Invoice {qrisOrderId}</p>

              <div className="mx-auto my-5 w-[260px] rounded-lg border bg-white p-3">
                {qrisQrUrl ? (
                  <img
                    src={qrisQrUrl}
                    alt={`QRIS ${qrisOrderId}`}
                    className="h-auto w-full"
                  />
                ) : (
                  <div className="flex aspect-square items-center justify-center text-sm text-muted-foreground">
                    Memuat QRIS...
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm text-muted-foreground">Total Pembayaran</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 text-left text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">
                    {qrisStatus === "pending"
                      ? "Menunggu pembayaran..."
                      : qrisStatus === "settlement" || qrisStatus === "capture"
                      ? "Pembayaran berhasil"
                      : qrisStatus === "expire"
                      ? "QRIS kadaluarsa"
                      : qrisStatus === "failed"
                      ? "Gagal diproses"
                      : "Pembayaran tidak berhasil"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Kadaluarsa</p>
                  <p className="font-medium">
                    {Math.floor(qrisTimeLeft / 60)
                      .toString()
                      .padStart(2, "0")}:
                    {(qrisTimeLeft % 60).toString().padStart(2, "0")}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-sm">
              <p className="font-medium text-blue-700">QRIS Xendit</p>
              <p className="text-muted-foreground mt-1">
                Tampilkan QR ini ke pelanggan. Sistem akan mengecek status pembayaran otomatis, atau klik tombol cek status setelah pelanggan membayar.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" onClick={() => setIsQrisOpen(false)} disabled={loading}>
                Batal
              </Button>
              <Button variant="secondary" onClick={simulateQrisPaid} disabled={loading || qrisStatus === "expire"}>
                Simulasi Paid
              </Button>
              <Button onClick={handleConfirmQrisPaid} disabled={loading || qrisStatus === "expire"}>
                {loading ? "Memproses..." : "Cek Status"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Nota Pembayaran</DialogTitle>
          </DialogHeader>

          {lastTransaction && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 text-sm">
                <div className="text-center">
                  <h2 className="text-lg font-bold">Ely Berkah Mart</h2>
                  <p className="text-xs text-muted-foreground">Nota Penjualan</p>
                </div>

                <div className="my-3 border-t border-dashed" />

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">No Nota</span>
                    <span className="font-medium text-right">{lastTransaction.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Tanggal</span>
                    <span>
                      {new Date(lastTransaction.createdAt).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Kasir</span>
                    <span>{cashierName}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Metode</span>
                    <span className="uppercase">{lastTransaction.paymentMethod}</span>
                  </div>
                </div>

                <div className="my-3 border-t border-dashed" />

                <div className="space-y-3">
                  {lastTransaction.items.map((item) => (
                    <div key={`${item.sku}-${item.qty}`}>
                      <div className="flex justify-between gap-3">
                        <span className="font-medium">{item.productName}</span>
                        <span>{formatCurrency(item.subtotal)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.qty} x {formatCurrency(item.price)} | {item.sku}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="my-3 border-t border-dashed" />

                <div className="space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(lastTransaction.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Bayar</span>
                    <span>{formatCurrency(lastTransaction.paymentAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Kembalian</span>
                    <span className="font-bold text-emerald-500">
                      {formatCurrency(lastTransaction.changeAmount)}
                    </span>
                  </div>
                </div>

                <div className="my-3 border-t border-dashed" />
                <p className="text-center text-xs text-muted-foreground">
                  Terima kasih atas kunjungan Anda
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={handlePrintReceipt}>
                  Cetak
                </Button>
                <Button onClick={handleNewTransaction}>
                  Transaksi Baru
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialogComponent />
    </CashierLayout>
  );
};

export default POS;
