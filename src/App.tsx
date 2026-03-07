import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { TourProvider, TourOverlay } from "@/components/tour";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Documents from "./pages/Documents";
import Payments from "./pages/Payments";
import Analytics from "./pages/Analytics";
import Admins from "./pages/Admins";
import AuditLogs from "./pages/AuditLogs";
import Communication from "./pages/Communication";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TourProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <TourOverlay />
              <BrowserRouter>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/login" element={<Login />} />
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/clients" 
                  element={
                    <ProtectedRoute>
                      <Clients />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/clients/:id" 
                  element={
                    <ProtectedRoute>
                      <ClientDetail />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/documents" 
                  element={
                    <ProtectedRoute>
                      <Documents />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/payments" 
                  element={
                    <ProtectedRoute>
                      <Payments />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/analytics" 
                  element={
                    <ProtectedRoute>
                      <Analytics />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admins" 
                  element={
                    <ProtectedRoute>
                      <Admins />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/audit-logs" 
                  element={
                    <ProtectedRoute>
                      <AuditLogs />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/communication" 
                  element={
                    <ProtectedRoute>
                      <Communication />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/settings" 
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  } 
                />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </TourProvider>
    </AuthProvider>
  </ThemeProvider>
</QueryClientProvider>
  </ErrorBoundary>
);

export default App;
