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
      <Route path="/auth" component={AuthPage} />
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={LandingPage} />
            <Route path="/dashboard/:businessId">
              {(params) =>
                user ? (
                  <BusinessDashboard businessId={parseInt(params.businessId)} />
                ) : (
                  <AuthPage />
                )
              }
            </Route>
            <Route path="/business/:businessId" component={StorefrontPage} />
            <Route>404 Not Found</Route>
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

export default App;