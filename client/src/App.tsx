import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Generate from "./pages/Generate";
import History from "./pages/History";
import DataSources from "./pages/DataSources";
import Pillars from "./pages/Pillars";
import Settings from "./pages/Settings";
import DataBinding from "./pages/DataBinding";
import ErrorLogs from "./pages/ErrorLogs";
import Autopilot from "./pages/Autopilot";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/generate" component={Generate} />
      <Route path="/history" component={History} />
      <Route path="/data-sources" component={DataSources} />
      <Route path="/pillars" component={Pillars} />
      <Route path="/data-binding" component={DataBinding} />
      <Route path="/error-logs" component={ErrorLogs} />
      <Route path="/autopilot" component={Autopilot} />
      <Route path="/settings" component={Settings} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
