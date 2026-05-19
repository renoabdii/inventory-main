import CashierLayout from "@/components/layout/CashierLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DashboardKasir = () => {
  return (
    <CashierLayout title="Dashboard Kasir">
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Dashboard Kasir</h1>
          <p className="text-muted-foreground">
            Halaman kosong untuk kasir. Tambahkan fitur penjualan atau POS di sini.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Belum ada data</CardTitle>
            <CardDescription>
              Dashboard kasir masih kosong dan siap diisi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Tampilan ini dapat digunakan sebagai basis untuk cashier interface.
            </p>
          </CardContent>
        </Card>
      </div>
    </CashierLayout>
  );
};

export default DashboardKasir;
