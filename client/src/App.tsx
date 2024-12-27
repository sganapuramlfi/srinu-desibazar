import { Switch, Route, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useUser } from "./hooks/use-user";
import { Layout } from "./components/layout/Layout";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import BusinessDashboard from "./pages/BusinessDashboard";
import StorefrontPage from "./pages/StorefrontPage";
import BookingsPage from "./pages/BookingsPage";
import ConsumerDashboard from "./pages/ConsumerDashboard";
import React from "react";

// Protected route wrapper component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useUser();
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  return <>{children}</>;
}

function App() {
  const { user, isLoading } = useUser();
  const [, navigate] = useLocation();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Layout>
      <Switch>
        {/* Public routes */}
        <Route path="/" component={LandingPage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/business/:businessId">
          {(params) => <StorefrontPage params={params} />}
        </Route>

        {/* Protected routes */}
        <Route path="/dashboard/:businessId">
          {(params) => (
            <ProtectedRoute>
              <BusinessDashboard businessId={parseInt(params.businessId)} />
            </ProtectedRoute>
          )}
        </Route>

        <Route path="/my-dashboard">
          <ProtectedRoute>
            <ConsumerDashboard />
          </ProtectedRoute>
        </Route>

        <Route path="/my-bookings">
          <ProtectedRoute>
            <BookingsPage />
          </ProtectedRoute>
        </Route>

        {/* 404 Not Found */}
        <Route>
          {() => (
            <div className="min-h-screen w-full flex items-center justify-center bg-background">
              <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">404 Not Found</h1>
                <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
              </div>
            </div>
          )}
        </Route>
      </Switch>
    </Layout>
  );
}

export default App;