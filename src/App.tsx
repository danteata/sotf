
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { useConvexAuth } from "convex/react";
import { AuthLoadingWrapper } from "@/components/auth-loading-wrapper";
import { UserSync } from "@/components/user-sync";
import { PageViewTracker } from "@/providers/PageViewTracker";
import { AuthAnalyticsBridge } from "@/providers/AuthAnalyticsBridge";

import HomePage from "@/pages/Home";
import SignInPage from "@/pages/auth/SignIn";
import SignUpPage from "@/pages/auth/SignUp";
import InvitePage from "@/pages/auth/Invite";
import AcceptInvitationPage from "@/pages/auth/AcceptInvitation";

const DashboardPage = lazy(() => import("@/pages/Dashboard"));
const MembersPage = lazy(() => import("@/pages/members/Members"));
const EventsPage = lazy(() => import("@/pages/events/Events"));
const FinancialPage = lazy(() => import("@/pages/financial/Financial"));
const AdminDashboardPage = lazy(() => import("@/pages/admin/AdminDashboard"));
const UserManagementPage = lazy(() => import("@/pages/admin/UserManagement"));
const LabelManagementPage = lazy(() => import("@/pages/admin/LabelManagement"));
const OrganizationPage = lazy(() => import("@/pages/organization/Organization"));
const SettingsPage = lazy(() => import("@/pages/settings/Settings"));
const BillingPage = lazy(() => import("@/pages/settings/Billing"));
const ProfilePage = lazy(() => import("@/pages/profile/Profile"));
const AttendancePage = lazy(() => import("@/pages/attendance/Attendance"));
const AbsentMembersSharePage = lazy(() => import("@/pages/share/AbsentMembersShare"));
const MapPage = lazy(() => import("@/pages/map/Map"));
const ReportsPage = lazy(() => import("@/pages/reports/Reports"));
const AuditTrailPage = lazy(() => import("@/pages/admin/AuditTrail"));
const AutomationsPage = lazy(() => import("@/pages/automations/Automations"));

// Member-facing check-in + portal
const CheckInPage = lazy(() => import("@/pages/check-in/CheckIn"));
const KioskPage = lazy(() => import("@/pages/check-in/Kiosk"));
const PortalLayout = lazy(() => import("@/pages/portal/PortalLayout"));
const PortalDashboard = lazy(() => import("@/pages/portal/Portal"));
const PortalAttendance = lazy(() => import("@/pages/portal/PortalAttendance"));
const PortalProfile = lazy(() => import("@/pages/portal/PortalProfile"));
const PortalLink = lazy(() => import("@/pages/portal/PortalLink"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return <AuthLoadingWrapper><></></AuthLoadingWrapper>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace />;
  }

  return (
    <>
      <UserSync />
      <AuthAnalyticsBridge />
      {children}
    </>
  );
}

// Member portal routes: must be signed in, but NOT restricted to admin roles.
// Plain members (and admins) can access the portal.
function MemberRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return <AuthLoadingWrapper><></></AuthLoadingWrapper>;
  }

  if (!isAuthenticated) {
    // Preserve the redirect target so members return after sign-in.
    const redirect = encodeURIComponent(window.location.pathname + window.location.search);
    return <Navigate to={`/sign-in?redirect_url=${redirect}`} replace />;
  }

  return (
    <>
      <UserSync />
      <AuthAnalyticsBridge />
      {children}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <PageViewTracker />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />

        {/* Auth Routes */}
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
        <Route
          path="/share/absent/:token"
          element={
            <Suspense fallback={<PageLoader />}>
              <AbsentMembersSharePage />
            </Suspense>
          }
        />

        {/* Public check-in scan route (auth handled inside the page) */}
        <Route
          path="/check-in/:token"
          element={
            <Suspense fallback={<PageLoader />}>
              <CheckInPage />
            </Suspense>
          }
        />

        {/* Steward/kiosk route (admin-authenticated device at the door) */}
        <Route
          path="/kiosk/:sessionId"
          element={
            <Protected>
              <Suspense fallback={<PageLoader />}>
                <KioskPage />
              </Suspense>
            </Protected>
          }
        />

        {/* Member self-service portal (any signed-in user; not admin-restricted) */}
        <Route
          path="/portal"
          element={
            <MemberRoute>
              <Suspense fallback={<PageLoader />}>
                <PortalLayout />
              </Suspense>
            </MemberRoute>
          }
        >
          <Route index element={<PortalDashboard />} />
          <Route path="attendance" element={<PortalAttendance />} />
          <Route path="profile" element={<PortalProfile />} />
          <Route path="link" element={<PortalLink />} />
        </Route>

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <Protected>
              <Suspense fallback={<PageLoader />}>
                <DashboardPage />
              </Suspense>
            </Protected>
          }
        />
        <Route
          path="/members"
          element={
            <Protected>
              <Suspense fallback={<PageLoader />}>
                <MembersPage />
              </Suspense>
            </Protected>
          }
        />
        <Route
          path="/events"
          element={
            <Protected>
              <Suspense fallback={<PageLoader />}>
                <EventsPage />
              </Suspense>
            </Protected>
          }
        />
        <Route
          path="/financial"
          element={
            <Protected>
              <Suspense fallback={<PageLoader />}>
                <FinancialPage />
              </Suspense>
            </Protected>
          }
        />
        <Route
          path="/admin"
          element={
            <Protected>
              <Suspense fallback={<PageLoader />}>
                <AdminDashboardPage />
              </Suspense>
            </Protected>
          }
        />
        <Route
          path="/user-management"
          element={
            <Protected>
              <Suspense fallback={<PageLoader />}>
                <UserManagementPage />
              </Suspense>
            </Protected>
          }
        />
        <Route
          path="/automations"
          element={
            <Protected>
              <Suspense fallback={<PageLoader />}>
                <AutomationsPage />
              </Suspense>
            </Protected>
          }
        />
        <Route
          path="/labels"
          element={
            <Protected>
              <Suspense fallback={<PageLoader />}>
                <LabelManagementPage />
              </Suspense>
            </Protected>
          }
        />

        <Route
          path="/organization"
          element={
            <Protected>
              <Suspense fallback={<PageLoader />}>
                <OrganizationPage />
              </Suspense>
            </Protected>
          }
        />
        <Route
          path="/settings"
          element={
            <Protected>
              <Suspense fallback={<PageLoader />}>
                <SettingsPage />
              </Suspense>
            </Protected>
          }
        />
        <Route
          path="/billing"
          element={
            <Protected>
              <Suspense fallback={<PageLoader />}>
                <BillingPage />
              </Suspense>
            </Protected>
          }
        />
        <Route
          path="/profile"
          element={
            <Protected>
              <Suspense fallback={<PageLoader />}>
                <ProfilePage />
              </Suspense>
            </Protected>
          }
        />
        <Route
          path="/attendance"
          element={
            <Protected>
              <Suspense fallback={<PageLoader />}>
                <AttendancePage />
              </Suspense>
            </Protected>
          }
        />
        <Route
          path="/map"
          element={
            <Protected>
              <Suspense fallback={<PageLoader />}>
                <MapPage />
              </Suspense>
            </Protected>
          }
        />
        <Route
          path="/reports"
          element={
            <Protected>
              <Suspense fallback={<PageLoader />}>
                <ReportsPage />
              </Suspense>
            </Protected>
          }
        />
        <Route
          path="/audit-trail"
          element={
            <Protected>
              <Suspense fallback={<PageLoader />}>
                <AuditTrailPage />
              </Suspense>
            </Protected>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
