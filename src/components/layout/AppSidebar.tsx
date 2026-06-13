import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  Package,
  PackagePlus,
  TrendingUp,
  LogOut,
  User,
  LayoutGrid,
  Truck,
  ShoppingCart,
  ArrowLeftRight,
  FileBarChart,
  Brain,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const menuGroups = [
  {
    label: "Menu Utama",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Produk", url: "/dashboard/inventory", icon: Package },
      { title: "Kategori", url: "/dashboard/category", icon: LayoutGrid },
    ],
  },
  {
    label: "Stok",
    items: [
      { title: "Barang Masuk", url: "/dashboard/incoming", icon: PackagePlus },
      { title: "Pergerakan Stok", url: "/dashboard/stockmovement", icon: ArrowLeftRight },
    ],
  },
  {
    label: "Pembelian",
    items: [
      { title: "Supplier", url: "/dashboard/supplier", icon: Truck },
      { title: "Purchase Order", url: "/dashboard/purchaseorder", icon: ShoppingCart },
    ],
  },
  {
    label: "Analitik",
    items: [
      { title: "Laporan", url: "/dashboard/report", icon: FileBarChart },
      { title: "Prediksi Stok", url: "/dashboard/forecast", icon: Brain },
    ],
  },
  {
    label: "Akun",
    items: [
      { title: "Akun Kasir", url: "/dashboard/cashiers", icon: UserCog },
    ],
  },
];

const AppSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const isActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    queryClient.clear();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const user = JSON.parse(localStorage.getItem("user") || '{"username":"Admin"}');

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      {/* Header */}
      <SidebarHeader className="p-4 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
            <Package className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-sidebar-foreground tracking-tight">InventoryPro</span>
              <span className="text-[11px] text-sidebar-foreground/50">Admin Panel</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Menu */}
      <SidebarContent className="px-0 space-y-0">
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label} className="space-y-0 mt-0">
            <SidebarGroupLabel className="text-[11px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest px-3 mb-0 py-2">
              {!collapsed && group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={item.url}
                        end={item.url === "/dashboard"}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                        activeClassName="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-600 dark:text-indigo-400 font-medium shadow-sm border border-indigo-500/10"
                      >
                        <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                        {!collapsed && <span className="text-[13px]">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="p-4 border-t border-sidebar-border/50">
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9 ring-2 ring-sidebar-border/50">
            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold">
              {user.username?.charAt(0).toUpperCase() || "A"}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate capitalize">{user.username}</p>
              <p className="text-[11px] text-sidebar-foreground/50 truncate">Administrator</p>
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowLogoutDialog(true)}
              className="h-8 w-8 text-sidebar-foreground/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </SidebarFooter>

      {/* Logout Confirmation */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin ingin keluar dari aplikasi?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600"
            >
              Ya, Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
};

export default AppSidebar;
