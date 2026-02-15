import { Switch, Route, useLocation, Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { useUser } from "./hooks/use-user";
import { Layout } from "./components/layout/Layout";
import LandingPage from "./pages/LandingPage";
import TestPage from "./pages/TestPage";
import SimpleLanding from "./pages/SimpleLanding";
import MinimalTest from "./pages/MinimalTest";
import TestBasic from "./pages/TestBasic";
import AuthPage from "./pages/AuthPage";
import BusinessDashboard from "./pages/BusinessDashboard";
// import StorefrontPage from "./pages/StorefrontPage"; // DEPRECATED - Using PublicBusinessPage instead
import PublicBusinessPage from "./pages/PublicBusinessPage";
import TestBusinessPage from "./pages/TestBusinessPage";
import BookingsPage from "./pages/BookingsPage";
import ConsumerDashboard from "./pages/ConsumerDashboard";
import BillingPortal from "./pages/BillingPortal";
import SearchResults from "./pages/SearchResults";
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
import { AdminRouteGuard } from "./components/AdminRouteGuard";
import { AdTargetingProvider } from "./contexts/AdTargetingContext";
import { LocationProvider } from "./hooks/use-location";
import { CartProvider } from "./contexts/CartContext";

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
          <CartProvider>
            <Layout>
        <Switch>
            {/* Public routes */}
            <Route path="/" component={LandingPage} />
            <Route path="/landing" component={LandingPage} />
            <Route path="/simple" component={SimpleLanding} />
            <Route path="/test" component={TestPage} />
            <Route path="/testbasic" component={TestBasic} />
            <Route path="/auth" component={AuthPage} />
            
            {/* Search Results Route */}
            <Route path="/search">
              {() => {
                const urlParams = new URLSearchParams(window.location.search);
                return (
                  <SearchResults 
                    searchQuery={urlParams.get("q") || undefined}
                    industry={urlParams.get("industry") || undefined}
                    location={urlParams.get("location") || undefined}
                  />
                );
              }}
            </Route>
            
            {/* Unified storefront route - using slug for SEO */}
            <Route path="/business/:businessId">
              {(params) => <PublicBusinessPage businessId={parseInt(params.businessId)} />}
            </Route>
            <Route path="/storefront/:slug">
              {(params) => <PublicBusinessPage slug={params.slug} />}
            </Route>

            {/* Protected routes - require authentication and module system */}
            <Route path="/dashboard/:businessSlug">
              {(params) => {
                if (!user) {
                  return <Redirect to="/auth" />;
                }

                // Find business by slug in user's business access
                const businessAccess = user.businessAccess?.find(access => 
                  access.businessSlug === params.businessSlug && access.isActive
                );
                
                if (!businessAccess) {
                  return <Redirect to="/" />;
                }

                return (
                  <ModuleProvider>
                    <BusinessDashboard businessSlug={params.businessSlug} businessId={businessAccess.businessId} />
                  </ModuleProvider>
                );
              }}
            </Route>

            <Route path="/my-dashboard">
              {() => {
                if (!user) {
                  return <Redirect to="/auth" />;
                }
                return <ConsumerDashboard />;
              }}
            </Route>

            <Route path="/my-bookings">
              {() => {
                if (!user) {
                  return <Redirect to="/auth" />;
                }
                return <BookingsPage />;
              }}
            </Route>

            <Route path="/billing">
              {() => {
                if (!user) {
                  return <Redirect to="/auth" />;
                }
                return <BillingPortal />;
              }}
            </Route>

            <Route path="/advertising/portal">
              {() => {
                if (!user) {
                  return <Redirect to="/auth" />;
                }
                // Only allow if user has business access (owner/manager role)
                const hasBusinessRole = user.businessAccess?.some(access => 
                  ["owner", "manager"].includes(access.role) && access.isActive
                );
                
                if (!hasBusinessRole) {
                  return <Redirect to="/" />;
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
          </CartProvider>
        </AdTargetingProvider>
      </ModularAuthProvider>
    </LocationProvider>
  );
}

export default App;