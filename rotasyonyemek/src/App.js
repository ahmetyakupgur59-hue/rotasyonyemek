import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Contexts
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { CartProvider } from './contexts/CartContext';

// Layouts
import MainLayout from './layouts/MainLayout';
import AdminLayout from './layouts/AdminLayout';
import RestaurantLayout from './layouts/RestaurantLayout';

// Auth Pages
import Login from './pages/auth/Login';

// Customer Pages
import Home from './pages/customer/Home';
import RestaurantDetail from './pages/customer/RestoranDetay';
import Cart from './pages/customer/Sepet';
import Orders from './pages/customer/Siparislerim';
import Profile from './pages/customer/Profil';

// Admin Pages
import AdminDashboard from './pages/admin/Admin';

// Restaurant Pages
import RestaurantDashboard from './pages/restaurant-panel/MagazaPaneli';
import RestaurantPanel from './pages/restaurant-panel/RestoranPanel';

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <CartProvider>
          <Router>
            <Routes>
            {/* ==================== AUTH ROUTES ==================== */}
            <Route path="/login" element={<Login />} />

            {/* ==================== CUSTOMER ROUTES ==================== */}
            <Route path="/" element={
              <MainLayout>
                <Home />
              </MainLayout>
            } />
            
            <Route path="/restoran/:id" element={
              <MainLayout>
                <RestaurantDetail />
              </MainLayout>
            } />
            
            <Route path="/sepet" element={
              <MainLayout>
                <Cart />
              </MainLayout>
            } />
            
            <Route path="/siparislerim" element={
              <MainLayout>
                <Orders />
              </MainLayout>
            } />
            
            <Route path="/profil" element={
              <MainLayout>
                <Profile />
              </MainLayout>
            } />

            {/* ==================== ADMIN ROUTES ==================== */}
            <Route path="/admin" element={
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            } />
            
            <Route path="/admin/restaurants" element={
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            } />
            
            <Route path="/admin/users" element={
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            } />
            
            <Route path="/admin/orders" element={
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            } />

            {/* ==================== RESTAURANT PANEL ROUTES ==================== */}
            <Route path="/restaurant" element={
              <RestaurantLayout>
                <RestaurantDashboard />
              </RestaurantLayout>
            } />
            
            <Route path="/restaurant/orders" element={
              <RestaurantLayout>
                <RestaurantDashboard />
              </RestaurantLayout>
            } />
            
            <Route path="/restaurant/menu" element={
              <RestaurantLayout>
                <RestaurantDashboard />
              </RestaurantLayout>
            } />
            
            <Route path="/magaza-paneli" element={
              <RestaurantLayout>
                <RestaurantDashboard />
              </RestaurantLayout>
            } />

            {/* ==================== LEGACY ROUTES (Eski URL'ler için) ==================== */}
            <Route path="/admin-panel" element={
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            } />

            </Routes>
          </Router>
        </CartProvider>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;