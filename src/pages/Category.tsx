import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

import TablePagination from "@/components/TablePagination";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { TableLoadingRows } from "@/components/LoadingState";
import { useDebounce } from "@/hooks/useDebounce";

import { API_BASE_URL } from "@/lib/api";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Badge } from "@/components/ui/badge";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Label } from "@/components/ui/label";

import {
  Search,
  Plus,
  Package,
  MoreVertical,
  Edit,
  Trash2,
  Layers3,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* =========================
   TYPES
========================= */

interface CategoryItem {
  _id: string;
  name: string;
  description: string;
  status: string;
  totalProducts: number;
  createdAt: string;
  updatedAt: string;
}

interface CategoryStats {
  total: number;
  active: number;
  totalProducts: number;
}

/* =========================
   BADGE STATUS
========================= */

const getStatusBadge = (status: string) => {
  switch (status) {
    case "active":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-500 border-0">
          Aktif
        </Badge>
      );

    case "inactive":
      return (
        <Badge className="bg-red-500/10 text-red-500 border-0">
          Tidak Aktif
        </Badge>
      );

    default:
      return <Badge>Unknown</Badge>;
  }
};

/* =========================
   PAGE
========================= */

const Category = () => {
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [stats, setStats] = useState<CategoryStats>({ total: 0, active: 0, totalProducts: 0 });
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [editFormData, setEditFormData] = useState({ id: "", name: "", description: "", status: "active" });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const token = localStorage.getItem("token");

  /* =========================
     FETCH CATEGORIES
  ========================= */
  const fetchCategories = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearchQuery) params.append("search", debouncedSearchQuery);
      params.append("page", String(currentPage));
      params.append("limit", "5");

      const res = await fetch(`${API_BASE_URL}/api/categories?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setCategories(json.data);
        setStats(json.stats);
        if (json.pagination) {
          setTotalPages(json.pagination.totalPages);
          setTotalItems(json.pagination.total);
        }
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearchQuery, token]);

  /* =========================
     USEEFFECT
  ========================= */
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  /* =========================
     HANDLE INPUT
  ========================= */

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  /* =========================
     HANDLE CREATE
  ========================= */

  const handleSubmit = async () => {
    if (!formData.name || !formData.description) {
      toast.warning("Semua field harus diisi!");
      return;
    }

    if (!token) {
      toast.error("Token tidak ditemukan. Silakan login kembali.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Kategori berhasil ditambahkan!");
        setFormData({ name: "", description: "" });
        setIsDialogOpen(false);
        fetchCategories();
      } else {
        toast.error("Gagal menambahkan kategori: " + (json.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error adding category:", error);
      toast.error("Terjadi kesalahan saat menambahkan kategori");
    }
  };

  /* =========================
     HANDLE EDIT
  ========================= */

  const openEditDialog = (item: CategoryItem) => {
    setEditFormData({
      id: item._id,
      name: item.name,
      description: item.description,
      status: item.status,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editFormData.name || !editFormData.description) {
      toast.warning("Semua field harus diisi!");
      return;
    }

    if (!token) {
      toast.error("Token tidak ditemukan. Silakan login kembali.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/categories/${editFormData.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editFormData.name,
          description: editFormData.description,
          status: editFormData.status,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Kategori berhasil diupdate!");
        setIsEditDialogOpen(false);
        fetchCategories();
      } else {
        toast.error("Gagal mengupdate kategori: " + (json.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("Terjadi kesalahan saat mengupdate kategori");
    }
  };

  /* =========================
     HANDLE DELETE
  ========================= */

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "Hapus Kategori",
      description: "Yakin ingin menghapus kategori ini?",
      confirmText: "Ya, Hapus",
      variant: "destructive",
    });
    if (!confirmed) return;

    if (!token) {
      toast.error("Token tidak ditemukan. Silakan login kembali.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/categories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Kategori berhasil dihapus!");
        fetchCategories();
      } else {
        toast.error("Gagal menghapus kategori: " + (json.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Terjadi kesalahan saat menghapus kategori");
    }
  };

  return (
    <DashboardLayout title="Kategori">
      <div className="space-y-6">
        {/* =========================
            STATS
        ========================= */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* TOTAL CATEGORY */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Layers3 className="w-5 h-5 text-primary" />
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Kategori
                  </p>

                  <p className="text-2xl font-bold">
                    {stats.total}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ACTIVE */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/10">
                  <Package className="w-5 h-5 text-emerald-500" />
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    Kategori Aktif
                  </p>

                  <p className="text-2xl font-bold">
                    {stats.active}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* TOTAL PRODUCTS */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-yellow-500/10">
                  <Package className="w-5 h-5 text-yellow-500" />
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Produk
                  </p>

                  <p className="text-2xl font-bold">
                    {stats.totalProducts}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* =========================
            TABLE
        ========================= */}

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>
                  Daftar Kategori
                </CardTitle>

                <CardDescription>
                  Kelola kategori produk inventory
                </CardDescription>
              </div>

              {/* ADD CATEGORY */}
              <Dialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Tambah Kategori
                  </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>
                      Tambah Kategori
                    </DialogTitle>

                    <DialogDescription>
                      Tambahkan kategori baru untuk produk inventory
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    {/* NAME */}
                    <div className="space-y-2">
                      <Label>Nama Kategori</Label>

                      <Input
                        name="name"
                        placeholder="Contoh: Minuman"
                        value={formData.name}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* DESCRIPTION */}
                    <div className="space-y-2">
                      <Label>Deskripsi</Label>

                      <Input
                        name="description"
                        placeholder="Deskripsi kategori"
                        value={formData.description}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  {/* BUTTON */}
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Batal
                    </Button>

                    <Button onClick={handleSubmit}>
                      Simpan
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>

          <CardContent>
            {/* SEARCH */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

              <Input
                placeholder="Cari kategori..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* TABLE */}
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Nama Kategori</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead className="text-center">Total Produk</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    <TableLoadingRows columns={5} />
                  ) : categories.length > 0 ? (
                    categories.map((item) => (
                      <TableRow key={item._id}>
                        {/* NAME */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                              <Layers3 className="w-5 h-5 text-primary" />
                            </div>

                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-xs text-muted-foreground">
                                ID: {item._id.slice(-6)}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* DESCRIPTION */}
                        <TableCell className="text-muted-foreground">
                          {item.description}
                        </TableCell>

                        {/* TOTAL */}
                        <TableCell className="text-center font-bold">
                          {item.totalProducts}
                        </TableCell>

                        {/* STATUS */}
                        <TableCell>
                          {getStatusBadge(item.status)}
                        </TableCell>

                        {/* ACTION */}
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="gap-2"
                                onClick={() => openEditDialog(item)}
                              >
                                <Edit className="w-4 h-4" />
                                Edit
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                className="gap-2 text-red-500 focus:text-red-500"
                                onClick={() => handleDelete(item._id)}
                              >
                                <Trash2 className="w-4 h-4" />
                                Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-32 text-center text-muted-foreground"
                      >
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">Belum ada kategori</p>
                          <p className="text-sm">Buat kategori pertama agar produk bisa dikelompokkan.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* FOOTER / PAGINATION */}
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              showing={categories.length}
              onPageChange={setCurrentPage}
              label="kategori"
            />
          </CardContent>
        </Card>

        {/* =========================
            EDIT DIALOG
        ========================= */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Kategori</DialogTitle>
              <DialogDescription>
                Ubah data kategori
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nama Kategori</Label>
                <Input
                  name="name"
                  value={editFormData.name}
                  onChange={handleEditInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label>Deskripsi</Label>
                <Input
                  name="description"
                  value={editFormData.description}
                  onChange={handleEditInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  name="status"
                  value={editFormData.status}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Tidak Aktif</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleUpdate}>
                Update
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <ConfirmDialogComponent />
    </DashboardLayout>
  );
};

export default Category;
