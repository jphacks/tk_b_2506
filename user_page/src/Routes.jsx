import { BrowserRouter, Route, Routes as RouterRoutes } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import ScrollToTop from "./components/ScrollToTop";
import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/auth/AuthCallback";
import AuthPage from "./pages/auth/AuthPage";
import VerifyEmailNotice from "./pages/auth/VerifyEmailNotice";
import Dashboard from "./pages/dashboard/Dashboard";
import SelectConferencePage from "./pages/select-conference/SelectConference";
import SelfIntroductionForm from './pages/self-introduction-form/index';

const Routes = () => {
    return (
        <BrowserRouter>
            <ErrorBoundary>
                <ScrollToTop />
                <RouterRoutes>
                    {/* Authentication Routes */}
                    <Route path="/" element={<AuthPage />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/auth/verify-email" element={<VerifyEmailNotice />} />

                    {/* Conference Selection */}
                    <Route path="/select-conference" element={<SelectConferencePage />} />

                    {/* Self Introduction Routes */}
                    <Route path="/new-introduction" element={<SelfIntroductionForm />} />
                    <Route path="/self-introduction-form" element={<SelfIntroductionForm />} />

                    {/* Dashboard */}
                    <Route path="/dashboard/:conferenceId" element={<Dashboard />} />

                    {/* 404 Route */}
                    <Route path="*" element={<NotFound />} />
                </RouterRoutes>
            </ErrorBoundary>
        </BrowserRouter>
    );
};

export default Routes;
