import { BrowserRouter, Route, Routes as RouterRoutes } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import ScrollToTop from "./components/ScrollToTop";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/auth/AuthPage";
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

                    {/* Self Introduction Routes */}
                    <Route path="/new-introduction" element={<SelfIntroductionForm />} />
                    <Route path="/self-introduction-form" element={<SelfIntroductionForm />} />

                    {/* 404 Route */}
                    <Route path="*" element={<NotFound />} />
                </RouterRoutes>
            </ErrorBoundary>
        </BrowserRouter>
    );
};

export default Routes;
