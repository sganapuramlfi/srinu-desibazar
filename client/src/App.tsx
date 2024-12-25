import { Switch, Route } from "wouter";
import { Loader2 } from "lucide-react";
import { useUser } from "./hooks/use-user";
import { Layout } from "./components/layout/Layout";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import BusinessDashboard from "./pages/BusinessDashboard";
import StorefrontPage from "./pages/StorefrontPage";
import BookingsPage from "./pages/BookingsPage";

function App() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not logged in, show auth page
  if (!user) {
    return <AuthPage />;
  }

  // If business user but no business associated, redirect to landing
  if (user.role === "business" && !user.business?.id) {
    window.location.replace("/");
    return null;
  }

  return (
    <Switch>
      {/* All routes inside Layout */}
      <Route>
        <Layout>
          <Switch>
            {/* Landing page */}
            <Route path="/" component={LandingPage} />

            {/* Business Dashboard - only for business users */}
            <Route path="/dashboard/:businessId">
              {(params) => {
                // Check for business role and ownership
                if (user.role !== "business" || !user.business) {
                  window.location.replace("/");
                  return null;
                }

                const businessId = parseInt(params.businessId);
                if (user.business.id !== businessId) {
                  window.location.replace("/");
                  return null;
                }

                return <BusinessDashboard businessId={businessId} />;
              }}
            </Route>

            {/* Public business storefront */}
            <Route path="/business/:businessId" component={StorefrontPage} />

            {/* Customer bookings - requires authentication */}
            <Route path="/my-bookings">
              {() => {
                if (!user) {
                  window.location.replace("/auth");
                  return null;
                }
                return <BookingsPage />;
              }}
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
      </Route>
    </Switch>
  );
}

export default App;