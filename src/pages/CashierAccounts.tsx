import { useEffect, useState } from "react";
import { toast } from "sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import TablePagination from "@/components/TablePagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Plus, Search, UserCog } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface CashierAccount {
  _id: string;
  username: string;
  role: "kasir";
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const initialForm = {
  username: "",
  password: "",
  isActive: true,
};

const CashierAccounts = () => {
  const [cashiers, setCashiers] = useState<CashierAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCashier, setEditingCashier] = useState<CashierAccount | null>(null);
  const [formData, setFormData] = useState(initialForm);

  const token = localStorage.getItem("token");

  const fetchCashiers = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      params.append("page", String(currentPage));
      params.append("limit", "8");

      const res = await fetch(`${API_BASE_URL}/api/cashier-accounts?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();

      if (json.success) {
        setCashiers(json.data);
        setTotalPages(json.pagination?.totalPages || 1);
        setTotalItems(json.pagination?.total || 0);
      } else {
        toast.error(json.message || "Gagal memuat akun kasir");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat memuat akun kasir");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashiers();
  }, [searchQuery, currentPage, token]);

  const openCreateDialog = () => {
    setEditingCashier(null);
    setFormData(initialForm);
    setDialogOpen(true);
  };

  const openEditDialog = (cashier: CashierAccount) => {
    setEditingCashier(cashier);
    setFormData({
      username: cashier.username,
      password: "",
      isActive: cashier.isActive,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!token) return;

    const username = formData.username.trim();
    const password = formData.password.trim();

    if (!username) {
      toast.warning("Username wajib diisi");
      return;
    }

    if (!editingCashier && !password) {
      toast.warning("Password wajib diisi untuk akun baru");
      return;
    }

    setLoading(true);
    try {
      const url = editingCashier
        ? `${API_BASE_URL}/api/cashier-accounts/${editingCashier._id}`
        : `${API_BASE_URL}/api/cashier-accounts`;

      const body: Record<string, string | boolean> = {
        username,
        isActive: formData.isActive,
      };

      if (password) {
        body.password = password;
      }

      const res = await fetch(url, {
        method: editingCashier ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.message || "Gagal menyimpan akun kasir");
        return;
      }

      toast.success(editingCashier ? "Akun kasir diperbarui" : "Akun kasir dibuat");
      setDialogOpen(false);
      setFormData(initialForm);
      setEditingCashier(null);
      fetchCashiers();
    } catch (error) {
      toast.error("Terjadi kesalahan saat menyimpan akun kasir");
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (cashier: CashierAccount) => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/cashier-accounts/${cashier._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !cashier.isActive }),
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.message || "Gagal mengubah status akun");
        return;
      }

      toast.success(!cashier.isActive ? "Akun kasir diaktifkan" : "Akun kasir dinonaktifkan");
      fetchCashiers();
    } catch (error) {
      toast.error("Terjadi kesalahan saat mengubah status akun");
    }
  };

  return (
    <DashboardLayout title="Akun Kasir">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="w-5 h-5" />
                  Manajemen Akun Kasir
                </CardTitle>
                <CardDescription>Tambah, ubah, dan aktifkan akun khusus kasir</CardDescription>
              </div>
              <Button onClick={openCreateDialog} className="gap-2">
                <Plus className="w-4 h-4" />
                Tambah Kasir
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari username kasir..."
                className="pl-10"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dibuat</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        Memuat akun kasir...
                      </TableCell>
                    </TableRow>
                  ) : cashiers.length > 0 ? (
                    cashiers.map((cashier) => (
                      <TableRow key={cashier._id}>
                        <TableCell className="font-medium">{cashier.username}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">Kasir</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              cashier.isActive
                                ? "bg-emerald-500/10 text-emerald-600 border-0"
                                : "bg-red-500/10 text-red-500 border-0"
                            }
                          >
                            {cashier.isActive ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {cashier.createdAt
                            ? new Date(cashier.createdAt).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => toggleActive(cashier)}>
                              {cashier.isActive ? "Nonaktifkan" : "Aktifkan"}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(cashier)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        Belum ada akun kasir
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
              showing={cashiers.length}
              onPageChange={setCurrentPage}
              label="akun kasir"
            />
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCashier ? "Edit Akun Kasir" : "Tambah Akun Kasir"}</DialogTitle>
            <DialogDescription>
              {editingCashier
                ? "Kosongkan password jika tidak ingin mengganti password."
                : "Akun baru otomatis dibuat dengan role kasir."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(event) => setFormData((prev) => ({ ...prev, username: event.target.value }))}
                placeholder="Contoh: kasir2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
                placeholder={editingCashier ? "Password baru opsional" : "Password kasir"}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="isActive">Status akun</Label>
                <p className="text-sm text-muted-foreground">Kasir hanya bisa login jika akun aktif</p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CashierAccounts;
