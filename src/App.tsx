import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "./components/AppLayout";
import Overview from "./pages/Overview";
import FacilitySearch from "./pages/FacilitySearch";
import TrustScorer from "./pages/TrustScorer";
import DesertMap from "./pages/DesertMap";
import AgentTrace from "./pages/AgentTrace";
import Databricks from "./pages/Databricks";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Overview />} />
            <Route path="/search" element={<FacilitySearch />} />
            <Route path="/trust" element={<TrustScorer />} />
            <Route path="/map" element={<DesertMap />} />
            <Route path="/trace" element={<AgentTrace />} />
            <Route path="/databricks" element={<Databricks />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
