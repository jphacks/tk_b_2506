import { BrowserRouter, Route, Routes as RouterRoutes } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import ScrollToTop from "./components/ScrollToTop";
import NotFound from "./pages/NotFound";
import SelfIntroductionForm from './pages/self-introduction-form/index';

const Routes = () => {
    return (
        <BrowserRouter>
            <ErrorBoundary>
                <ScrollToTop />
                <RouterRoutes>
                    {/* Define your route here */}
                    <Route path="/" element={<SelfIntroductionForm />} />
                    <Route path="/self-introduction-form" element={<SelfIntroductionForm />} />
                    <Route path="*" element={<NotFound />} />
                </RouterRoutes>
            </ErrorBoundary>
        </BrowserRouter>
    );
};

export default Routes;
