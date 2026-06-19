import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "./AppSidebar";
import { Bell, AlertTriangle, Package, ShoppingCart, Truck } from "lucide-react";
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
  timeAgo: string;
  link: string;
}

interface NotifCount {
  total: number;
  danger: number;
  warning: number;
  info: number;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const DashboardLayout = ({ children, title = "Dashboard" }: DashboardLayoutProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [count, setCount] = useState<NotifCount>({ total: 0, danger: 0, warning: 0, info: 0 });
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/dashboard/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data);
        setCount(json.count);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
    // Refresh setiap 30 detik
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "critical_stock":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "low_stock":
        return <Package className="w-4 h-4 text-yellow-500" />;
      case "pending_po":
        return <ShoppingCart className="w-4 h-4 text-blue-500" />;
      case "pending_incoming":
        return <Truck className="w-4 h-4 text-primary" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getSeverityDot = (severity: string) => {
    switch (severity) {
      case "danger":
        return "bg-red-500";
      case "warning":
        return "bg-yellow-500";
      case "info":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const handleNotifClick = (link: string) => {
    setOpen(false);
    navigate(link);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
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
                    {count.total > 0 && (
                      <Badge
                        className={`absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs text-white border-0 ${
                          count.danger > 0 ? "bg-red-500" : count.warning > 0 ? "bg-yellow-500" : "bg-blue-500"
                        }`}
                      >
                        {count.total > 99 ? "99+" : count.total}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  {/* Header */}
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Notifikasi</h3>
                      <div className="flex gap-1">
                        {count.danger > 0 && (
                          <Badge className="bg-red-500/10 text-red-500 border-0 text-xs">
                            {count.danger} kritis
                          </Badge>
                        )}
                        {count.warning > 0 && (
                          <Badge className="bg-yellow-500/10 text-yellow-500 border-0 text-xs">
                            {count.warning} rendah
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* List */}
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.slice(0, 10).map((notif) => (
                        <div
                          key={notif.id}
                          className="flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b last:border-0 transition-colors"
                          onClick={() => handleNotifClick(notif.link)}
                        >
                          <div className="mt-0.5">{getNotifIcon(notif.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${getSeverityDot(notif.severity)}`} />
                              <p className="text-sm font-medium truncate">{notif.title}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {notif.message}
                            </p>
                            <p className="text-xs text-muted-foreground/60 mt-1">{notif.timeAgo}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-sm text-muted-foreground">
                        Tidak ada notifikasi
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  {notifications.length > 10 && (
                    <div className="p-3 border-t text-center">
                      <p className="text-xs text-muted-foreground">
                        +{notifications.length - 10} notifikasi lainnya
                      </p>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
