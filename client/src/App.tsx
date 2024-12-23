import { Switch, Route } from "wouter";
import { Loader2 } from "lucide-react";
import { useUser } from "./hooks/use-user";
import { Layout } from "./components/layout/Layout";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import BusinessDashboard from "./pages/BusinessDashboard";
import StorefrontPage from "./pages/StorefrontPage";

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
      <Route path="/auth">
        {user ? (
          user.role === "business" && user.business ? (
            // If business user is logged in, redirect to their dashboard
            window.location.replace(`/dashboard/${user.business.id}`)
          ) : (
            // If non-business user is logged in, redirect to home
            window.location.replace("/")
          )
        ) : (
          <AuthPage />
        )}
      </Route>
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={LandingPage} />
            <Route path="/dashboard/:businessId">
              {(params) => {
                if (!user || user.role !== "business") {
                  return <AuthPage />;
                }
                return <BusinessDashboard businessId={parseInt(params.businessId)} />;
              }}
            </Route>
            <Route path="/business/:businessId" component={StorefrontPage} />
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