import { useState, useEffect, useCallback } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import CashierSidebar from "./CashierSidebar";
import { Bell, Package, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { API_BASE_URL } from "@/lib/api";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: "danger" | "warning" | "info";
}

interface CashierLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const CashierLayout = ({ children, title = "Dashboard Kasir" }: CashierLayoutProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const token = localStorage.getItem("token");

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      // Kasir hanya perlu tahu produk yang stoknya rendah/kritis
      const res = await fetch(`${API_BASE_URL}/api/products/low-stock`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        const notifs: Notification[] = json.data.map((p: { _id: string; name: string; stock: number; status: string }) => ({
          id: p._id,
          type: p.status === "critical" ? "critical_stock" : "low_stock",
          title: p.status === "critical" ? `Stok kritis: ${p.name}` : `Stok menipis: ${p.name}`,
          message: `Sisa ${p.stock} unit`,
          severity: p.status === "critical" ? "danger" : "warning",
        }));
        setNotifications(notifs);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "critical_stock":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "low_stock":
        return <Package className="w-4 h-4 text-yellow-500" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <CashierSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <h1 className="text-lg font-semibold text-foreground hidden sm:block">{title}</h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Notifications */}
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5 text-muted-foreground" />
                    {notifications.length > 0 && (
                      <Badge
                        className={`absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs text-white border-0 ${
                          notifications.some((n) => n.severity === "danger") ? "bg-red-500" : "bg-yellow-500"
                        }`}
                      >
                        {notifications.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="end">
                  <div className="p-3 border-b">
                    <h3 className="font-semibold text-sm">Notifikasi Stok</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className="flex items-start gap-3 p-3 border-b last:border-0"
                        >
                          <div className="mt-0.5">{getNotifIcon(notif.type)}</div>
                          <div>
                            <p className="text-sm font-medium">{notif.title}</p>
                            <p className="text-xs text-muted-foreground">{notif.message}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-sm text-muted-foreground">
                        Semua stok aman.
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default CashierLayout;
