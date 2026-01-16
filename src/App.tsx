
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import { AuthLoadingWrapper } from "@/components/auth-loading-wrapper";
import { UserSync } from "@/components/user-sync";

// Pages
import HomePage from "@/pages/Home";
import DashboardPage from "@/pages/Dashboard";
import SignInPage from "@/pages/auth/SignIn";
import SignUpPage from "@/pages/auth/SignUp";
import InvitePage from "@/pages/auth/Invite";
import AcceptInvitationPage from "@/pages/auth/AcceptInvitation";
import MembersPage from "@/pages/members/Members";
import EventsPage from "@/pages/events/Events";
import FinancialPage from "@/pages/financial/Financial";
import AdminDashboardPage from "@/pages/admin/AdminDashboard";
import UserManagementPage from "@/pages/admin/UserManagement";
import LabelManagementPage from "@/pages/admin/LabelManagement";
import MinistryDashboardPage from "@/pages/ministries/MinistryDashboard";
import RegionDashboardPage from "@/pages/regions/RegionDashboard";
import SubUnitsPage from "@/pages/subunits/SubUnits";
import OrganizationPage from "@/pages/organization/Organization";
import SettingsPage from "@/pages/settings/Settings";
import ProfilePage from "@/pages/profile/Profile";
import AttendancePage from "@/pages/attendance/Attendance";
import ReportsPage from "@/pages/reports/Reports";
import MapPage from "@/pages/map/Map";

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
            {children}
        </>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />

                {/* Auth Routes */}
                <Route path="/sign-in/*" element={<SignInPage />} />
                <Route path="/sign-up/*" element={<SignUpPage />} />
                <Route path="/invite/:token" element={<InvitePage />} />
                <Route path="/accept-invitation" element={<AcceptInvitationPage />} />

                {/* Protected Routes */}
                <Route
                    path="/dashboard"
                    element={
                        <Protected>
                            <DashboardPage />
                        </Protected>
                    }
                />
                <Route
                    path="/members"
                    element={
                        <Protected>
                            <MembersPage />
                        </Protected>
                    }
                />
                <Route
                    path="/events"
                    element={
                        <Protected>
                            <EventsPage />
                        </Protected>
                    }
                />
                <Route
                    path="/financial"
                    element={
                        <Protected>
                            <FinancialPage />
                        </Protected>
                    }
                />
                <Route
                    path="/admin"
                    element={
                        <Protected>
                            <AdminDashboardPage />
                        </Protected>
                    }
                />
                <Route
                    path="/user-management"
                    element={
                        <Protected>
                            <UserManagementPage />
                        </Protected>
                    }
                />
                <Route
                    path="/labels"
                    element={
                        <Protected>
                            <LabelManagementPage />
                        </Protected>
                    }
                />
                <Route
                    path="/ministry-dashboard"
                    element={
                        <Protected>
                            <MinistryDashboardPage />
                        </Protected>
                    }
                />
                <Route
                    path="/region-dashboard"
                    element={
                        <Protected>
                            <RegionDashboardPage />
                        </Protected>
                    }
                />
                <Route
                    path="/sub-units"
                    element={
                        <Protected>
                            <SubUnitsPage />
                        </Protected>
                    }
                />
                <Route
                    path="/organization"
                    element={
                        <Protected>
                            <OrganizationPage />
                        </Protected>
                    }
                />
                <Route
                    path="/settings"
                    element={
                        <Protected>
                            <SettingsPage />
                        </Protected>
                    }
                />
                <Route
                    path="/profile"
                    element={
                        <Protected>
                            <ProfilePage />
                        </Protected>
                    }
                />
                <Route
                    path="/attendance"
                    element={
                        <Protected>
                            <AttendancePage />
                        </Protected>
                    }
                />
                <Route
                    path="/reports"
                    element={
                        <Protected>
                            <ReportsPage />
                        </Protected>
                    }
                />
                <Route
                    path="/map"
                    element={
                        <Protected>
                            <MapPage />
                        </Protected>
                    }
                />

                {/* Catch-all redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
