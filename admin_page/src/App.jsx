import { useCallback, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import AdminDashboard from './components/AdminDashboard';

const AUTH_CONFIG = {
    email: 'admin@example.com',
    password: 'securepass123',
    organization: 'Sympo Admin'
};

const LoginRoute = ({ onAuthenticated }) => {
    const navigate = useNavigate();
    const handleLogin = useCallback(
        (email, password) => {
            if (email === AUTH_CONFIG.email && password === AUTH_CONFIG.password) {
                onAuthenticated();
                navigate('/dashboard', { replace: true });
                return true;
            }
            return false;
        },
        [onAuthenticated, navigate]
    );

    return (
        <LoginForm
            onSubmit={handleLogin}
            allowedEmail={AUTH_CONFIG.email}
            organization={AUTH_CONFIG.organization}
        />
    );
};

const DashboardRoute = ({ onLogout }) => {
    return <AdminDashboard onLogout={onLogout} adminEmail={AUTH_CONFIG.email} />;
};

const AppRoutes = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const handleAuthenticated = () => {
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        return true;
    };

    return (
        <Routes>
            <Route
                path="/login"
                element={<LoginRoute onAuthenticated={handleAuthenticated} />}
            />
            <Route
                path="/dashboard"
                element={
                    isAuthenticated
                        ? <DashboardRoute onLogout={handleLogout} />
                        : <Navigate to="/login" replace />
                }
            />
            <Route
                path="*"
                element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
            />
        </Routes>
    );
};

const App = () => {
    return (
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
    );
};

export default App;
