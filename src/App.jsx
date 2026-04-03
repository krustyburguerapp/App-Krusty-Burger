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
const AdminLoyalty = lazy(() => import('./pages/Admin/AdminLoyalty'));
const AdminPrizeClaims = lazy(() => import('./pages/Admin/AdminPrizeClaims'));
const AdminDeliveryPricing = lazy(() => import('./pages/Admin/AdminDeliveryPricing'));
const AdminSettings = lazy(() => import('./pages/Admin/AdminSettings'));
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
            <FloatingCartBtn />
            <BottomNav />
            <InstallPrompt />
        </>
    );
}

// Componente que decide qué mostrar en la ruta "/" según el estado de auth
// Sin cambiar el árbol de Routes (evita desmontaje/remontaje)
function HomeRedirect() {
    const { user, loading } = useAuth();

    if (loading) return <LoadingScreen />;
    if (!user) return <Suspense fallback={<LoadingScreen />}><Welcome /></Suspense>;
    return <Navigate to="/menu" replace />;
}

function AppRoutes() {
    // UN SOLO árbol de <Routes> que SIEMPRE se renderiza con la misma estructura.
    // La lógica de autenticación se maneja DENTRO de cada componente wrapper
    // (HomeRedirect, ProtectedRoute, AdminRoute), no cambiando el árbol completo.
    return (
        <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/menu" element={<AppLayout><Menu /></AppLayout>} />
            <Route path="/checkout" element={<ProtectedRoute><AppLayout><Checkout /></AppLayout></ProtectedRoute>} />
            <Route path="/order-confirmation/:orderId" element={<ProtectedRoute><AppLayout><OrderConfirmation /></AppLayout></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute><AppLayout><OrderTracking /></AppLayout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><AppLayout><AdminDashboard /></AppLayout></AdminRoute>} />
            <Route path="/admin/orders" element={<AdminRoute><AppLayout><AdminOrders /></AppLayout></AdminRoute>} />
            <Route path="/admin/products" element={<AdminRoute><AppLayout><AdminProducts /></AppLayout></AdminRoute>} />
            <Route path="/admin/loyalty" element={<AdminRoute><AppLayout><AdminLoyalty /></AppLayout></AdminRoute>} />
            <Route path="/admin/prize-claims" element={<AdminRoute><AppLayout><AdminPrizeClaims /></AppLayout></AdminRoute>} />
            <Route path="/admin/delivery-pricing" element={<AdminRoute><AppLayout><AdminDeliveryPricing /></AppLayout></AdminRoute>} />
            <Route path="/admin/settings" element={<AdminRoute><AppLayout><AdminSettings /></AppLayout></AdminRoute>} />
            <Route path="*" element={<AppLayout><Suspense fallback={<LoadingScreen />}><NotFound /></Suspense></AppLayout>} />
        </Routes>
    );
}

export default function App() {
    return (
        <BrowserRouter
            future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true
            }}
        >
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
