import { useState, useEffect } from "react";
import { toast } from "sonner";

import TablePagination from "@/components/TablePagination";
import { useConfirmDialog } from "@/components/ConfirmDialog";
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
import { Input } from "@/components/ui/input";

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Search,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Truck,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
} from "lucide-react";

/* =========================
   TYPES
========================= */

interface SupplierItem {
  _id: string;
  supplierId: string;
  name: string;
  phone: string;
  address: string;
  status: string;
  totalPO: number;
  createdAt: string;
}

interface SupplierStats {
  total: number;
  active: number;
  inactive: number;
}

/* =========================
   STATUS BADGE
========================= */

const getStatusBadge = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-500 border-0 gap-1">
          <CheckCircle2 className="w-3 h-3" />
          ACTIVE
        </Badge>
      );
    case "INACTIVE":
      return (
        <Badge className="bg-red-500/10 text-red-500 border-0 gap-1">
          <XCircle className="w-3 h-3" />
          INACTIVE
        </Badge>
      );
    default:
      return <Badge>UNKNOWN</Badge>;
  }
};

/* =========================
   PAGE
========================= */

const Suppliers = () => {
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [stats, setStats] = useState<SupplierStats>({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [formData, setFormData] = useState({ supplierId: "", name: "", phone: "", address: "" });
  const [editFormData, setEditFormData] = useState({ id: "", name: "", phone: "", address: "", status: "ACTIVE" });

  const token = localStorage.getItem("token");

  /* FETCH */
  const fetchSuppliers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      params.append("page", String(currentPage));
      params.append("limit", "5");

      const res = await fetch(`${API_URL}/api/suppliers?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setSuppliers(json.data);
        setStats(json.stats);
        if (json.pagination) {
          setTotalPages(json.pagination.totalPages);
          setTotalItems(json.pagination.total);
        }
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [searchQuery, currentPage, token]);

  /* HANDLERS */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.supplierId || !formData.name || !formData.phone || !formData.address) {
      toast.warning("Semua field harus diisi!");
      return;
    }
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Supplier berhasil ditambahkan!");
        setFormData({ supplierId: "", name: "", phone: "", address: "" });
        setIsDialogOpen(false);
        fetchSuppliers();
      } else {
        toast.error("Gagal: " + (json.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Terjadi kesalahan");
    }
  };

  const openEdit = (item: SupplierItem) => {
    setEditFormData({ id: item._id, name: item.name, phone: item.phone, address: item.address, status: item.status });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/suppliers/${editFormData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: editFormData.name,
          phone: editFormData.phone,
          address: editFormData.address,
          status: editFormData.status,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Supplier berhasil diupdate!");
        setIsEditOpen(false);
        fetchSuppliers();
      } else {
        toast.error("Gagal: " + (json.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Terjadi kesalahan");
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "Hapus Supplier",
      description: "Yakin ingin menghapus supplier ini?",
      confirmText: "Ya, Hapus",
      variant: "destructive",
    });
    if (!confirmed) return;
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/suppliers/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Supplier berhasil dihapus!");
        fetchSuppliers();
      } else {
        toast.error("Gagal: " + (json.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Terjadi kesalahan");
    }
  };

  return (
    <DashboardLayout title="Suppliers">
      <div className="space-y-6">
        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Truck className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Supplier</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/10">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-red-500/10">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Inactive</p>
                  <p className="text-2xl font-bold">{stats.inactive}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* TABLE */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Suppliers</CardTitle>
                <CardDescription>Kelola supplier dan pemasok inventory</CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Tambah Supplier
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Tambah Supplier</DialogTitle>
                    <DialogDescription>Tambahkan supplier baru</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>ID Supplier</Label>
                      <Input name="supplierId" placeholder="SUP-005" value={formData.supplierId} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                      <Label>Nama Supplier</Label>
                      <Input name="name" placeholder="PT Indofood" value={formData.name} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                      <Label>Nomor Telepon</Label>
                      <Input name="phone" placeholder="08xxxxxxxxxx" value={formData.phone} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                      <Label>Alamat</Label>
                      <Input name="address" placeholder="Jakarta" value={formData.address} onChange={handleInputChange} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                    <Button onClick={handleSubmit}>Simpan</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>

          <CardContent>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari supplier..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>

            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Supplier</TableHead>
                    <TableHead>Kontak</TableHead>
                    <TableHead>Alamat</TableHead>
                    <TableHead className="text-center">PO</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Memuat data...</TableCell>
                    </TableRow>
                  ) : suppliers.length > 0 ? (
                    suppliers.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                              <Truck className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-xs text-muted-foreground">{item.supplierId}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="w-4 h-4" />
                            {item.phone}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            {item.address}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold">{item.totalPO}</TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="gap-2" onClick={() => openEdit(item)}>
                                <Edit className="w-4 h-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 text-red-500 focus:text-red-500" onClick={() => handleDelete(item._id)}>
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
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Tidak ada supplier</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              showing={suppliers.length}
              onPageChange={setCurrentPage}
              label="supplier"
            />
          </CardContent>
        </Card>

        {/* EDIT DIALOG */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Supplier</DialogTitle>
              <DialogDescription>Ubah data supplier</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nama Supplier</Label>
                <Input name="name" value={editFormData.name} onChange={handleEditInputChange} />
              </div>
              <div className="space-y-2">
                <Label>Nomor Telepon</Label>
                <Input name="phone" value={editFormData.phone} onChange={handleEditInputChange} />
              </div>
              <div className="space-y-2">
                <Label>Alamat</Label>
                <Input name="address" value={editFormData.address} onChange={handleEditInputChange} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, status: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
              <Button onClick={handleUpdate}>Update</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <ConfirmDialogComponent />
    </DashboardLayout>
  );
};

export default Suppliers;
