import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DashboardKasir from "./pages/cassier/Dashboard";
import POS from "./pages/cassier/POS";
import Transactions from "./pages/cassier/Transactions";
import CashierShiftPage from "./pages/cassier/Shift";
import CashierStock from "./pages/cassier/Stock";
import CashierProfile from "./pages/cassier/Profile";
import Inventory from "./pages/Inventory";
import IncomingItems from "./pages/IncomingItems";
import AnomalyDetection from "./pages/AnomalyDetection";
import StockPrediction from "./pages/StockPrediction";
import NotFound from "./pages/NotFound";
import Register from "./pages/Register";
import AdminRegister from "./pages/AdminRegister";
import StockMovement from "./pages/StockMovement";
import Category from "./pages/Category";
import PurchaseOrder from "./pages/PurchaseOrder";
import Supplier from "./pages/Supplier";
import Report from "./pages/Report";
import Forecasting from "./pages/Forecasting";
import CashierAccounts from "./pages/CashierAccounts";
import CashierShiftAudit from "./pages/CashierShiftAudit";
import RequireRole from "./components/RequireRole";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin/register" element={<AdminRegister />} />
          <Route
            path="/dashboard"
            element={
              <RequireRole allowedRoles={["admin"]}>
                <Dashboard />
              </RequireRole>
            }
          />
          <Route
            path="/dashboard/kasir"
            element={
              <RequireRole allowedRoles={["admin"]}>
                <DashboardKasir />
              </RequireRole>
            }
          />
          <Route
            path="/dashboard/inventory"
            element={
              <RequireRole allowedRoles={["admin"]}>
                <Inventory />
              </RequireRole>
            }
          />
          <Route
            path="/dashboard/incoming"
            element={
              <RequireRole allowedRoles={["admin"]}>
                <IncomingItems />
              </RequireRole>
            }
          />
          <Route
            path="/dashboard/anomaly"
            element={
              <RequireRole allowedRoles={["admin"]}>
                <AnomalyDetection />
              </RequireRole>
            }
          />
          <Route
            path="/dashboard/prediction"
            element={
              <RequireRole allowedRoles={["admin"]}>
                <StockPrediction />
              </RequireRole>
            }
          />
          <Route
            path="/dashboard/stockmovement"
            element={
              <RequireRole allowedRoles={["admin"]}>
                <StockMovement />
              </RequireRole>
            }
          />
          <Route
            path="/dashboard/category"
            element={
              <RequireRole allowedRoles={["admin"]}>
                <Category />
              </RequireRole>
            }
          />
          <Route
            path="/dashboard/purchaseorder"
            element={
              <RequireRole allowedRoles={["admin"]}>
                <PurchaseOrder />
              </RequireRole>
            }
          />
          <Route
            path="/dashboard/supplier"
            element={
              <RequireRole allowedRoles={["admin"]}>
                <Supplier />
              </RequireRole>
            }
          />
          <Route
            path="/dashboard/report"
            element={
              <RequireRole allowedRoles={["admin"]}>
                <Report />
              </RequireRole>
            }
          />
          <Route
            path="/dashboard/cashiers"
            element={
              <RequireRole allowedRoles={["admin"]}>
                <CashierAccounts />
              </RequireRole>
            }
          />
          <Route
            path="/dashboard/shift-audit"
            element={
              <RequireRole allowedRoles={["admin"]}>
                <CashierShiftAudit />
              </RequireRole>
            }
          />
          <Route
            path="/dashboard/forecast"
            element={
              <RequireRole allowedRoles={["admin"]}>
                <Forecasting />
              </RequireRole>
            }
          />
          <Route
            path="/kasir"
            element={
              <RequireRole allowedRoles={["kasir"]}>
                <DashboardKasir />
              </RequireRole>
            }
          />
          <Route
            path="/kasir/pos"
            element={
              <RequireRole allowedRoles={["kasir"]}>
                <POS />
              </RequireRole>
            }
          />
          <Route
            path="/kasir/transactions"
            element={
              <RequireRole allowedRoles={["kasir"]}>
                <Transactions />
              </RequireRole>
            }
          />
          <Route
            path="/kasir/shift"
            element={
              <RequireRole allowedRoles={["kasir"]}>
                <CashierShiftPage />
              </RequireRole>
            }
          />
          <Route
            path="/kasir/stock"
            element={
              <RequireRole allowedRoles={["kasir"]}>
                <CashierStock />
              </RequireRole>
            }
          />
          <Route
            path="/kasir/profile"
            element={
              <RequireRole allowedRoles={["kasir"]}>
                <CashierProfile />
              </RequireRole>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
