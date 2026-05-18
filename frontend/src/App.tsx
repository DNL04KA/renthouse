import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Button, Result } from 'antd';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Home } from './pages/Home';
import { Catalog } from './pages/Catalog';
import { PublicPropertyDetails } from './pages/PublicPropertyDetails';
import { Dashboard } from './pages/Dashboard';
import { Properties } from './pages/Properties';
import { Tenants } from './pages/Tenants';
import { Contracts } from './pages/Contracts';
import { Payments } from './pages/Payments';
import { Reports } from './pages/Reports';
import { Messages } from './pages/Messages';
import { Admin } from './pages/Admin';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

// Global error boundary — catches any unhandled render errors instead of showing white page
class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error: Error | null }
> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                    <Result
                        status="error"
                        title="Что-то пошло не так"
                        subTitle={this.state.error?.message || 'Произошла неожиданная ошибка'}
                        extra={
                            <Button type="primary" onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}>
                                На главную
                            </Button>
                        }
                    />
                </div>
            );
        }
        return this.props.children;
    }
}

function ProtectedApp() {
    return !!localStorage.getItem('token') ? <DashboardLayout /> : <Navigate to="/login" replace />;
}

export function App() {
    return (
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/catalog" element={<Catalog />} />
                        <Route path="/properties/:id" element={<PublicPropertyDetails />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/app" element={<ProtectedApp />}>
                            <Route index element={<Navigate to="dashboard" replace />} />
                            <Route path="dashboard" element={<Dashboard />} />
                            <Route path="properties" element={<Properties />} />
                            <Route path="tenants" element={<Tenants />} />
                            <Route path="contracts" element={<Contracts />} />
                            <Route path="payments" element={<Payments />} />
                            <Route path="reports" element={<Reports />} />
                            <Route path="messages" element={<Messages />} />
                            <Route path="admin" element={<Admin />} />
                            <Route path="profile" element={<Profile />} />
                            <Route path="settings" element={<Settings />} />
                        </Route>
                        <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
                    </Routes>
                </BrowserRouter>
            </QueryClientProvider>
        </ErrorBoundary>
    );
}
