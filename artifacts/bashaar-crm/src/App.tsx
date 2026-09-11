import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { AppShell } from '@/components/crm-shell';
import { DashboardPage } from '@/pages/dashboard';
import { LeadsPage } from '@/pages/leads';
import { LoginPage } from '@/pages/login';
import { ProfilePage } from '@/pages/profile';
import { ActivitiesPage, CompaniesPage, DealsPage, PipelinePage, ReportsPage, SettingsPage, TasksPage, TeamPage } from '@/pages/operations';
import { AuthProvider, ProtectedRoute } from '@/lib/auth-context';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/"><ProtectedRoute><AppShell><DashboardPage /></AppShell></ProtectedRoute></Route>
        <Route path="/leads"><ProtectedRoute><AppShell><LeadsPage /></AppShell></ProtectedRoute></Route>
        <Route path="/pipeline"><ProtectedRoute><AppShell><PipelinePage /></AppShell></ProtectedRoute></Route>
        <Route path="/tasks"><ProtectedRoute><AppShell><TasksPage /></AppShell></ProtectedRoute></Route>
        <Route path="/activities"><ProtectedRoute><AppShell><ActivitiesPage /></AppShell></ProtectedRoute></Route>
        <Route path="/companies"><ProtectedRoute><AppShell><CompaniesPage /></AppShell></ProtectedRoute></Route>
        <Route path="/deals"><ProtectedRoute><AppShell><DealsPage /></AppShell></ProtectedRoute></Route>
        <Route path="/reports"><ProtectedRoute><AppShell><ReportsPage /></AppShell></ProtectedRoute></Route>
        <Route path="/team"><ProtectedRoute><AppShell><TeamPage /></AppShell></ProtectedRoute></Route>
        <Route path="/settings"><ProtectedRoute><AppShell><SettingsPage /></AppShell></ProtectedRoute></Route>
        <Route path="/profile"><ProtectedRoute><AppShell><ProfilePage /></AppShell></ProtectedRoute></Route>
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
