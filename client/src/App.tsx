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

function App() {
  const { user, isLoading } = useUser();
  const [location, setLocation] = useLocation();

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
        <Route path="/business/:businessId" component={StorefrontPage} />

        {/* Protected routes - require authentication */}
        <Route path="/dashboard/:businessId">
          {(params) => {
            if (!user) {
              setLocation("/auth");
              return null;
            }

            // Only allow if user is a business owner and owns this business
            if (
              user.role !== "business" || 
              !user.business || 
              user.business.id !== parseInt(params.businessId)
            ) {
              setLocation("/");
              return null;
            }

            return <BusinessDashboard businessId={parseInt(params.businessId)} />;
          }}
        </Route>

        <Route path="/my-dashboard">
          {() => {
            if (!user) {
              setLocation("/auth");
              return null;
            }
            return <ConsumerDashboard />;
          }}
        </Route>

        <Route path="/my-bookings">
          {() => {
            if (!user) {
              setLocation("/auth");
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
  );
}

export default App;