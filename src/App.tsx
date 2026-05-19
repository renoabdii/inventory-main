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
import CashierStock from "./pages/cassier/Stock";
import CashierProfile from "./pages/cassier/Profile";
import Inventory from "./pages/Inventory";
import IncomingItems from "./pages/IncomingItems";
import AnomalyDetection from "./pages/AnomalyDetection";
import StockPrediction from "./pages/StockPrediction";
import NotFound from "./pages/NotFound";
import Register from "./pages/Register";
import StockMovement from "./pages/StockMovement";
import Category from "./pages/Category";
import PurchaseOrder from "./pages/PurchaseOrder";
import Supplier from "./pages/Supplier";
import Report from "./pages/Report";
import Forecasting from "./pages/Forecasting";

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
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/kasir" element={<DashboardKasir />} />
          <Route path="/kasir/pos" element={<POS />} />
          <Route path="/kasir/transactions" element={<Transactions />} />
          <Route path="/kasir/stock" element={<CashierStock />} />
          <Route path="/kasir/profile" element={<CashierProfile />} />
          <Route path="/dashboard/kasir" element={<DashboardKasir />} />
          <Route path="/dashboard/inventory" element={<Inventory />} />
          <Route path="/dashboard/incoming" element={<IncomingItems />} />
          <Route path="/dashboard/anomaly" element={<AnomalyDetection />} />
          <Route path="/dashboard/prediction" element={<StockPrediction />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard/stockmovement" element={<StockMovement />} />
          <Route path="/dashboard/category" element={<Category />} />
          <Route path="/dashboard/purchaseorder" element={<PurchaseOrder />} />
          <Route path="/dashboard/supplier" element={<Supplier />} />
          <Route path="/dashboard/report" element={<Report />} />
          <Route path="/dashboard/forecast" element={<Forecasting />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
