import { Switch, Route, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useUser } from "./hooks/use-user";
import { Layout } from "./components/layout/Layout";
import LandingPage from "./pages/LandingPage";
import TestPage from "./pages/TestPage";
import SimpleLanding from "./pages/SimpleLanding";
import MinimalTest from "./pages/MinimalTest";
import AuthPage from "./pages/AuthPage";
import BusinessDashboard from "./pages/BusinessDashboard";
import StorefrontPage from "./pages/StorefrontPage";
import BookingsPage from "./pages/BookingsPage";
import ConsumerDashboard from "./pages/ConsumerDashboard";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAdvertisingDashboard from "./pages/AdminAdvertisingDashboard";
import BusinessAdvertisingPortal from "./pages/BusinessAdvertisingPortal";
import BusinessRegistration from "./pages/BusinessRegistration";
import { AIGenieIntroPopup } from "./components/AIGenieIntroPopup";
import { useAIGenieIntro } from "./hooks/useAIGenieIntro";
import { AIGenieTestButton } from "./components/AIGenieTestButton";
import { ModularAuthProvider } from "./components/ModularAuthProvider";
import { ModuleProvider } from "./modules/ModuleProvider";
import { ModuleStatusNotifications } from "./components/ModuleStatusNotifications";
import { AdminRouteGuard } from "./components/AdminRouteGuard";
import { AdTargetingProvider } from "./contexts/AdTargetingContext";
import { LocationProvider } from "./hooks/use-location";

function App() {
  const { user, isLoading } = useUser();
  const [location, setLocation] = useLocation();
  const { showPopup, handleClosePopup, handleSubscribe } = useAIGenieIntro();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <LocationProvider>
      <ModularAuthProvider>
        <AdTargetingProvider>
          <Layout>
        <Switch>
            {/* Public routes */}
            <Route path="/" component={LandingPage} />
            <Route path="/simple" component={SimpleLanding} />
            <Route path="/test" component={TestPage} />
            <Route path="/landing" component={LandingPage} />
            <Route path="/auth" component={AuthPage} />
            <Route path="/business/:businessId" component={StorefrontPage} />

            {/* Protected routes - require authentication and module system */}
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

                return (
                  <ModuleProvider>
                    <div className="fixed top-4 right-4 z-50 max-w-md">
                      <ModuleStatusNotifications />
                    </div>
                    <BusinessDashboard businessId={parseInt(params.businessId)} />
                  </ModuleProvider>
                );
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

            <Route path="/advertising/portal">
              {() => {
                if (!user) {
                  setLocation("/auth");
                  return null;
                }
                if (user.role !== "business") {
                  setLocation("/");
                  return null;
                }
                return <BusinessAdvertisingPortal />;
              }}
            </Route>

            {/* Admin Routes - Protected */}
            <Route path="/admin/login" component={AdminLoginPage} />
            <Route path="/admin/modules">
              <AdminRouteGuard>
                <ModuleProvider>
                  <AdminDashboard />
                </ModuleProvider>
              </AdminRouteGuard>
            </Route>
            <Route path="/admin/advertising">
              <AdminRouteGuard>
                <AdminAdvertisingDashboard />
              </AdminRouteGuard>
            </Route>
            <Route path="/admin/dashboard">
              <AdminRouteGuard>
                <ModuleProvider>
                  <AdminDashboard />
                </ModuleProvider>
              </AdminRouteGuard>
            </Route>
            <Route path="/admin">
              <AdminRouteGuard>
                <ModuleProvider>
                  <AdminDashboard />
                </ModuleProvider>
              </AdminRouteGuard>
            </Route>

            {/* Modular Routes - Add new routes for module-specific functionality */}
            <Route path="/register" component={BusinessRegistration} />
            <Route path="/modules/:moduleId/*" component={() => <div>Module-specific pages</div>} />

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

          {/* AI Genie Introduction Popup */}
          <AIGenieIntroPopup
            isOpen={showPopup}
            onClose={handleClosePopup}
            onSubscribe={handleSubscribe}
          />
          
          {/* Development test button */}
          <AIGenieTestButton />
        </Layout>
      </AdTargetingProvider>
    </ModularAuthProvider>
  </LocationProvider>
  );
}

export default App;