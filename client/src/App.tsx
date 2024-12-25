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

  return (
    <Switch>
      {/* Auth route outside Layout */}
      <Route path="/auth">
        {() => {
          // If user is already logged in, redirect appropriately
          if (user) {
            if (user.role === "business") {
              // Check if user has an associated business
              if (user.business?.id) {
                window.location.replace(`/dashboard/${user.business.id}`);
              } else {
                window.location.replace("/");
              }
              return null;
            }
            window.location.replace("/");
            return null;
          }
          return <AuthPage />;
        }}
      </Route>

      {/* All other routes inside Layout */}
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={LandingPage} />

            {/* Business Dashboard Route */}
            <Route path="/dashboard/:businessId">
              {(params) => {
                // Check for authentication and business role
                if (!user) {
                  window.location.replace("/auth");
                  return null;
                }

                if (user.role !== "business") {
                  window.location.replace("/");
                  return null;
                }

                // Additional check to ensure the user owns this business
                const businessId = parseInt(params.businessId);
                if (user.business?.id !== businessId) {
                  window.location.replace("/");
                  return null;
                }

                return <BusinessDashboard businessId={businessId} />;
              }}
            </Route>

            <Route path="/business/:businessId" component={StorefrontPage} />

            <Route path="/my-bookings">
              {() => {
                if (!user) {
                  window.location.replace("/auth");
                  return null;
                }
                return <BookingsPage />;
              }}
            </Route>

            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

// Fallback 404 not found page
function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404 Not Found</h1>
        <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
      </div>
    </div>
  );
}

export default App;