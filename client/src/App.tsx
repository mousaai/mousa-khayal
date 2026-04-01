import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./i18n/LanguageContext";
import AuthGate from "./components/AuthGate";
import Home from "./pages/Home";
import MyFilms from "./pages/MyFilms";
import SharePage from "./pages/SharePage";
import AdminCosts from "./pages/AdminCosts";
import DeveloperPage from "./pages/DeveloperPage";
import DesignStudio from "./pages/DesignStudio";
import SharedDesign from "./pages/SharedDesign";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/my-films"} component={MyFilms} />
      <Route path={"/share/:shareId"} component={SharePage} />
      <Route path={"/admin/costs"} component={AdminCosts} />
      <Route path={"/developer"} component={DeveloperPage} />
      <Route path={"/design-studio"} component={DesignStudio} />
      <Route path={"/design/:shareToken"} component={SharedDesign} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <AuthGate>
              <Router />
            </AuthGate>
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
