import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProductsProvider } from './contexts/ProductsContext';
import { OrdersProvider } from './contexts/OrdersContext';
import { CartProvider } from './contexts/CartContext';
import Navbar from './components/Layout/Navbar';
import BottomNav from './components/Layout/BottomNav';
import CartDrawer from './components/Cart/CartDrawer';
import FloatingCartBtn from './components/Cart/FloatingCartBtn';
import CrossSellingModal from './components/Cart/CrossSellingModal';
import Spinner from './components/UI/Spinner';

import Welcome from './pages/Welcome/Welcome';
import Menu from './pages/Menu/Menu';
import InstallPrompt from './components/UI/InstallPrompt';
const Checkout = lazy(() => import('./pages/Checkout/Checkout'));
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation/OrderConfirmation'));
const OrderTracking = lazy(() => import('./pages/OrderTracking/OrderTracking'));
const Profile = lazy(() => import('./pages/Profile/Profile'));
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'));
const AdminOrders = lazy(() => import('./pages/Admin/AdminOrders'));
const AdminProducts = lazy(() => import('./pages/Admin/AdminProducts'));
const NotFound = lazy(() => import('./pages/NotFound/NotFound'));

function LoadingScreen() {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spinner size="lg" />
        </div>
    );
}

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) return <LoadingScreen />;
    if (!user) return <Navigate to="/" replace />;
    return children;
}

function AdminRoute({ children }) {
    const { user, isAdmin, loading } = useAuth();
    if (loading) return <LoadingScreen />;
    if (!user || !isAdmin) return <Navigate to="/menu" replace />;
    return children;
}
function AppLayout({ children }) {
    return (
        <>
            <Navbar />
            <Suspense fallback={<LoadingScreen />}>{children}</Suspense>
            <CartDrawer />
            <CrossSellingModal />
            <FloatingCartBtn />
            <BottomNav />
            <InstallPrompt />
        </>
    );
}

function AppRoutes() {
    const { user, loading } = useAuth();

    // Show welcome page ONLY if we KNOW user is not authenticated (loading finished)
    // Show the routes while still loading - the menu can load without auth
    if (!loading && !user) {
        return (
            <Routes>
                <Route path="/" element={<Suspense fallback={<LoadingScreen />}><Welcome /></Suspense>} />
                <Route path="/menu" element={<AppLayout><Menu /></AppLayout>} />
                <Route path="*" element={<AppLayout><NotFound /></AppLayout>} />
            </Routes>
        );
    }

    // While loading, allow menu route to work (it doesn't require auth data)
    // This prevents the infinite spinner on initial load
    if (loading) {
        return (
            <Routes>
                <Route path="/" element={<LoadingScreen />} />
                <Route path="/menu" element={<AppLayout><Menu /></AppLayout>} />
                <Route path="*" element={<AppLayout><NotFound /></AppLayout>} />
            </Routes>
        );
    }

    return (
        <Routes>
            <Route path="/" element={<Navigate to="/menu" replace />} />
            <Route path="/menu" element={<AppLayout><Menu /></AppLayout>} />
            <Route path="/checkout" element={<ProtectedRoute><AppLayout><Checkout /></AppLayout></ProtectedRoute>} />
            <Route path="/order-confirmation/:orderId" element={<ProtectedRoute><AppLayout><OrderConfirmation /></AppLayout></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute><AppLayout><OrderTracking /></AppLayout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><AppLayout><AdminDashboard /></AppLayout></AdminRoute>} />
            <Route path="/admin/orders" element={<AdminRoute><AppLayout><AdminOrders /></AppLayout></AdminRoute>} />
            <Route path="/admin/products" element={<AdminRoute><AppLayout><AdminProducts /></AppLayout></AdminRoute>} />
            <Route path="*" element={<AppLayout><NotFound /></AppLayout>} />
        </Routes>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <ProductsProvider>
                    <OrdersProvider>
                        <CartProvider>
                            <AppRoutes />
                        </CartProvider>
                    </OrdersProvider>
                </ProductsProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}
