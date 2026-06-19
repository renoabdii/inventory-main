import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import CashierLayout from "@/components/layout/CashierLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ScanBarcode,
  Clock,
  Loader2,
  CheckCircle2,
  RefreshCcw,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

const parseCurrencyInput = (value: string) => value.replace(/[^\d]/g, "");

const roundUpTo = (value: number, step: number) => Math.ceil(value / step) * step;

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

interface ActiveShift {
  _id: string;
  openedAt: string;
}

const POS = () => {
  const navigate = useNavigate();
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
  const [qrisDemoMode, setQrisDemoMode] = useState(false);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [shiftChecked, setShiftChecked] = useState(false);
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

  useEffect(() => {
    if (!token) return;

    fetch(`${API_BASE_URL}/api/cashier-shifts/active`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setActiveShift(json.data);
      })
      .catch(console.error)
      .finally(() => setShiftChecked(true));
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
  const cashShortage = Math.max(totalAmount - paidAmount, 0);
  const cashQuickAmounts = useMemo(() => {
    if (totalAmount <= 0) return [];

    const candidates = [
      totalAmount,
      roundUpTo(totalAmount, 5000),
      roundUpTo(totalAmount, 10000),
      roundUpTo(totalAmount, 50000),
      roundUpTo(totalAmount, 100000),
    ];

    return [...new Set(candidates)].filter((amount) => amount > 0).slice(0, 4);
  }, [totalAmount]);

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

  const refreshProducts = useCallback(async () => {
    if (!token) return;
    const prodRes = await fetch(`${API_BASE_URL}/api/products?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const prodJson = await prodRes.json();
    if (prodJson.success) setProducts(prodJson.data);
  }, [token]);

  const handlePaidQris = useCallback(async (transaction: ReceiptTransaction) => {
    toast.success("Pembayaran QRIS berhasil");
    setLastTransaction(transaction);
    setIsQrisOpen(false);
    setIsReceiptOpen(true);
    await refreshProducts();
  }, [refreshProducts]);

  const checkQrisStatus = useCallback(async (orderId = qrisOrderId, showFeedback = false) => {
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
  }, [handlePaidQris, qrisOrderId, token]);

  const completeDemoQrisPayment = async () => {
    if (!token || !qrisOrderId) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/payments/${qrisOrderId}/simulate-paid`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.message || "Gagal mengonfirmasi pembayaran demo");
        return;
      }

      setQrisStatus(json.data.status);
      if (json.data.transaction) {
        await handlePaidQris(json.data.transaction);
      } else {
        toast.success("Pembayaran demo berhasil dikonfirmasi");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat mengonfirmasi pembayaran demo");
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
  }, [checkQrisStatus, isQrisOpen, qrisOrderId, qrisStatus]);

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
      setQrisDemoMode(Boolean(json.data.simulationEnabled));
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
    if (shiftChecked && !activeShift) {
      toast.warning("Buka shift terlebih dahulu sebelum transaksi");
      navigate("/kasir/shift");
      return;
    }
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

  const handlePaymentAmountChange = (value: string) => {
    setPaymentAmount(parseCurrencyInput(value));
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
    setQrisDemoMode(false);
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
      <div className="space-y-4">
        {shiftChecked && !activeShift && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-amber-500/10 p-2">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold">Shift belum dibuka</p>
                    <p className="text-sm text-muted-foreground">
                      Kasir harus membuka shift sebelum memproses transaksi POS.
                    </p>
                  </div>
                </div>
                <Button onClick={() => navigate("/kasir/shift")}>
                  Buka Shift
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-11rem)]">
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
                    <SelectItem value="qris">QRIS</SelectItem>
                  </SelectContent>
                </Select>

                {paymentMethod === "cash" ? (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Uang diterima</label>
                      <Input
                        inputMode="numeric"
                        placeholder="Rp 0"
                        className="h-12 text-lg font-semibold"
                        value={paymentAmount ? formatCurrency(Number(paymentAmount)) : ""}
                        onChange={(e) => handlePaymentAmountChange(e.target.value)}
                      />
                    </div>

                    {totalAmount > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {cashQuickAmounts.map((amount) => (
                          <Button
                            key={amount}
                            type="button"
                            variant={Number(paymentAmount) === amount ? "default" : "outline"}
                            size="sm"
                            className="justify-center"
                            onClick={() => setPaymentAmount(String(amount))}
                          >
                            {amount === totalAmount ? "Uang Pas" : formatCurrency(amount)}
                          </Button>
                        ))}
                      </div>
                    )}

                    <div
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        paidAmount <= 0
                          ? "bg-muted/40"
                          : cashShortage > 0
                          ? "border-red-500/20 bg-red-500/5"
                          : "border-emerald-500/20 bg-emerald-500/5"
                      }`}
                    >
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">
                          {paidAmount <= 0 ? "Status" : cashShortage > 0 ? "Kurang" : "Kembalian"}
                        </span>
                        <span
                          className={`font-bold ${
                            paidAmount <= 0
                              ? ""
                              : cashShortage > 0
                              ? "text-red-500"
                              : "text-emerald-500"
                          }`}
                        >
                          {paidAmount <= 0
                            ? "Masukkan uang diterima"
                            : cashShortage > 0
                            ? formatCurrency(cashShortage)
                            : formatCurrency(changeAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nominal pembayaran</span>
                      <span className="font-bold">{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>
                )}

                <Button className="w-full gap-2" size="lg" onClick={handleSubmit} disabled={loading || cart.length === 0 || !activeShift}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
                  {loading ? "Memproses..." : activeShift ? "Bayar" : "Buka Shift Dulu"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>

      <Dialog open={isQrisOpen} onOpenChange={setIsQrisOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                <Smartphone className="h-4 w-4 text-primary" />
              </span>
              Scan QRIS untuk Membayar
            </DialogTitle>
            <DialogDescription>
              Minta pelanggan memindai kode QR menggunakan aplikasi pembayaran pilihannya.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-2xl border bg-gradient-to-b from-background to-muted/30 p-4 text-center">
              <div className="flex items-center justify-between gap-3 text-left">
                <div>
                  <h2 className="font-bold">Ely Berkah Mart</h2>
                  <p className="font-mono text-xs text-muted-foreground">{qrisOrderId}</p>
                </div>
                <Badge variant="outline" className="gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  QRIS
                </Badge>
              </div>

              <div className="mx-auto my-4 w-full max-w-[230px] rounded-2xl border bg-white p-3 shadow-sm sm:max-w-[250px]">
                {qrisQrUrl ? (
                  <img
                    src={qrisQrUrl}
                    alt={`QRIS ${qrisOrderId}`}
                    className="h-auto w-full"
                  />
                ) : (
                  <div className="flex aspect-square items-center justify-center">
                    <div className="w-full space-y-3">
                      <Skeleton className="mx-auto h-40 w-40" />
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Menyiapkan kode pembayaran...
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-primary/5 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total pembayaran</p>
                <p className="mt-1 text-3xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
              </div>

              <div className="mt-4 rounded-xl border bg-background p-3 text-left" aria-live="polite">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {qrisStatus === "pending" ? (
                      <span className="relative flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
                      </span>
                    ) : qrisStatus === "settlement" || qrisStatus === "capture" ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <p className="text-sm font-semibold">
                        {qrisStatus === "pending"
                          ? "Menunggu pembayaran"
                          : qrisStatus === "settlement" || qrisStatus === "capture"
                          ? "Pembayaran berhasil"
                          : qrisStatus === "expire"
                          ? "Kode QR sudah kedaluwarsa"
                          : qrisStatus === "failed"
                          ? "Pembayaran gagal diproses"
                          : "Pembayaran tidak berhasil"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {qrisStatus === "pending"
                          ? "Status diperiksa otomatis"
                          : "Silakan lanjutkan sesuai status pembayaran"}
                      </p>
                    </div>
                  </div>
                  <p className="font-mono text-sm font-semibold">
                    {qrisStatus === "pending"
                      ? `${Math.floor(qrisTimeLeft / 60).toString().padStart(2, "0")}:${(qrisTimeLeft % 60)
                          .toString()
                          .padStart(2, "0")}`
                      : ""}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border p-3 text-sm">
              <div className="flex gap-3">
                <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="font-medium">Cara membayar</p>
                  <p className="mt-1 text-muted-foreground">
                    Buka aplikasi pembayaran, pilih menu Scan QRIS, lalu arahkan kamera ke kode di atas.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setIsQrisOpen(false)} disabled={loading}>
                {qrisStatus === "pending" ? "Batalkan" : "Tutup"}
              </Button>
              {qrisStatus === "expire" || qrisStatus === "failed" || qrisStatus === "deny" || qrisStatus === "cancel" ? (
                <Button
                  onClick={async () => {
                    setIsQrisOpen(false);
                    await prepareQris();
                  }}
                  disabled={loading}
                >
                  Buat QR Baru
                </Button>
              ) : (
                <Button onClick={handleConfirmQrisPaid} disabled={loading} className="gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  {loading ? "Memeriksa..." : "Cek Pembayaran"}
                </Button>
              )}
            </div>

            {qrisDemoMode && qrisStatus === "pending" && (
              <div className="rounded-xl border border-dashed bg-muted/30 p-3 text-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Mode Demo</Badge>
                      <span className="text-xs text-muted-foreground">Tidak memindahkan dana nyata</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Gunakan konfirmasi ini setelah pelanggan mendemonstrasikan proses scan.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={completeDemoQrisPayment}
                    disabled={loading}
                    className="shrink-0 gap-2"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Konfirmasi Dibayar
                  </Button>
                </div>
              </div>
            )}

            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Pembayaran diproses melalui Xendit
            </p>
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
