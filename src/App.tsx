import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import React, { Suspense } from 'react';
import { Toaster } from "sonner";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SiteMap } from "@/components/SiteMap";
import Home from "@/pages/Home";
import { Login } from "@/pages/auth/Login";
import { Register } from "@/pages/auth/Register";
const SearchResultsLazy = React.lazy(() => import('@/pages/SearchResults').then(m => ({ default: m.SearchResults })));
const BookingPageLazy = React.lazy(() => import('@/pages/BookingPage').then(m => ({ default: m.BookingPage })));
const TrackingPageLazy = React.lazy(() => import('@/pages/TrackingPage').then(m => ({ default: m.TrackingPage })));
const DriverSelectionLazy = React.lazy(() => import('@/pages/DriverSelection').then(m => ({ default: m.DriverSelection })));
const CustomerDashboardLazy = React.lazy(() => import('@/pages/customer/Dashboard').then(m => ({ default: m.CustomerDashboard })));
const DriverDashboardLazy = React.lazy(() => import('@/pages/driver/Dashboard').then(m => ({ default: m.DriverDashboard })));
const DriverDocumentsLazy = React.lazy(() => import('@/pages/driver/Documents').then(m => ({ default: m.DriverDocuments })));
const DriverLoginLazy = React.lazy(() => import('@/pages/driver/Login').then(m => ({ default: m.DriverLogin })));
const DriverApplyLazy = React.lazy(() => import('@/pages/driver/Apply').then(m => ({ default: m.DriverApply })));
const AdminDriversLazy = React.lazy(() => import('@/pages/admin/Drivers').then(m => ({ default: m.AdminDrivers })));
const AdminPricingLazy = React.lazy(() => import('@/pages/admin/Pricing').then(m => ({ default: m.AdminPricing })));
const AdminDashboardLazy = React.lazy(() => import('@/pages/admin/Dashboard').then(m => ({ default: m.AdminDashboard })));
const AdminBookingsLazy = React.lazy(() => import('@/pages/admin/Bookings').then(m => ({ default: m.AdminBookings })));
const AdminCustomersLazy = React.lazy(() => import('@/pages/admin/Customers').then(m => ({ default: m.AdminCustomers })));
const AdminFeedbackLazy = React.lazy(() => import('@/pages/admin/Feedback').then(m => ({ default: m.AdminFeedback })));
const AdminSettingsLazy = React.lazy(() => import('@/pages/admin/Settings').then(m => ({ default: m.AdminSettings })));
const AdminDebugLazy = React.lazy(() => import('@/pages/admin/Debug').then(m => ({ default: m.AdminDebug })));
const ProfileLazy = React.lazy(() => import('@/pages/Profile').then(m => ({ default: m.Profile })));
const ReservationNewLazy = React.lazy(() => import('@/pages/ReservationNew').then(m => ({ default: m.ReservationNew })));
const ReservationsLazy = React.lazy(() => import('@/pages/Reservations').then(m => ({ default: m.Reservations })));
const CheckoutLazy = React.lazy(() => import('@/pages/Checkout').then(m => ({ default: m.Checkout })));
import { I18nProvider } from '@/i18n'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Loading fallback
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-900">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
      <p className="mt-4 text-gray-400">Yükleniyor...</p>
    </div>
  </div>
)

export default function App() {
  return (
    <Router>
      <I18nProvider>
        <ErrorBoundary>
          <Routes>
            {/* Home - Without Layout */}
            <Route path="/" element={<Home />} />

            {/* Auth Routes - Without main Layout */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register/driver" element={<Register isDriver={true} />} />

            {/* Driver Routes - Without main Layout */}
            <Route path="/driver/login" element={
              <Suspense fallback={<LoadingFallback />}>
                <DriverLoginLazy />
              </Suspense>
            } />
            <Route path="/driver/apply" element={
              <Suspense fallback={<LoadingFallback />}>
                <DriverApplyLazy />
              </Suspense>
            } />
            <Route path="/driver/dashboard" element={
              <ProtectedRoute allowedRoles={['driver']}>
                <Suspense fallback={<LoadingFallback />}>
                  <DriverDashboardLazy />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/driver/documents" element={
              <ProtectedRoute allowedRoles={['driver']}>
                <Suspense fallback={<LoadingFallback />}>
                  <DriverDocumentsLazy />
                </Suspense>
              </ProtectedRoute>
            } />

            {/* Customer Routes - Without main Layout */}
            <Route path="/customer/dashboard" element={
              <ProtectedRoute allowedRoles={['customer']}>
                <Suspense fallback={<LoadingFallback />}>
                  <CustomerDashboardLazy />
                </Suspense>
              </ProtectedRoute>
            } />

            {/* Admin Routes - Without main Layout */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Suspense fallback={<LoadingFallback />}>
                  <AdminDashboardLazy />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/admin/drivers" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Suspense fallback={<LoadingFallback />}>
                  <AdminDriversLazy />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/admin/bookings" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Suspense fallback={<LoadingFallback />}>
                  <AdminBookingsLazy />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/admin/customers" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Suspense fallback={<LoadingFallback />}>
                  <AdminCustomersLazy />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/admin/feedback" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Suspense fallback={<LoadingFallback />}>
                  <AdminFeedbackLazy />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/admin/pricing" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Suspense fallback={<LoadingFallback />}>
                  <AdminPricingLazy />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/admin/settings" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Suspense fallback={<LoadingFallback />}>
                  <AdminSettingsLazy />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/admin/debug" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Suspense fallback={<LoadingFallback />}>
                  <AdminDebugLazy />
                </Suspense>
              </ProtectedRoute>
            } />

            {/* Main Layout Routes - Public pages */}
            <Route path="*" element={
              <Layout>
                <Routes>
                  <Route path="/sitemap" element={<SiteMap />} />
                  <Route path="/search" element={
                    <Suspense fallback={<div style={{padding:16}}>Yükleniyor...</div>}>
                      <SearchResultsLazy />
                    </Suspense>
                  } />
                  <Route path="/select-driver" element={
                    <ProtectedRoute allowedRoles={['customer']}>
                      <Suspense fallback={<div style={{padding:16}}>Yükleniyor...</div>}>
                        <DriverSelectionLazy />
                      </Suspense>
                    </ProtectedRoute>
                  } />

                  {/* Protected Routes */}
                  <Route path="/booking/:id" element={
                    <ProtectedRoute>
                      <Suspense fallback={<div style={{padding:16}}>Yükleniyor...</div>}>
                        <BookingPageLazy />
                      </Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/tracking/:bookingId" element={
                    <ProtectedRoute>
                      <Suspense fallback={<div style={{padding:16}}>Yükleniyor...</div>}>
                        <TrackingPageLazy />
                      </Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <Suspense fallback={<div style={{padding:16}}>Yükleniyor...</div>}>
                        <ProfileLazy />
                      </Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/reserve" element={
                    <Suspense fallback={<div style={{padding:16}}>Yükleniyor...</div>}>
                      <ReservationNewLazy />
                    </Suspense>
                  } />
                  <Route path="/reservations" element={
                    <Suspense fallback={<div style={{padding:16}}>Yükleniyor...</div>}>
                      <ReservationsLazy />
                    </Suspense>
                  } />
                  <Route path="/checkout" element={
                    <Suspense fallback={<div style={{padding:16}}>Yükleniyor...</div>}>
                      <CheckoutLazy />
                    </Suspense>
                  } />
                </Routes>
              </Layout>
            } />
          </Routes>
        </ErrorBoundary>
        <Toaster 
          position="top-center"
          theme="dark"
          duration={2000}
          toastOptions={{
            style: {
              background: '#1f2937',
              color: '#f3f4f6',
              border: '1px solid #374151',
              borderRadius: '8px',
              fontSize: '13px',
              padding: '10px 14px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              minWidth: '200px',
              maxWidth: '350px',
            },
            className: 'toast-dark',
            unstyled: false,
          }}
          richColors
          closeButton={false}
          expand={false}
          visibleToasts={2}
          gap={8}
        />
        <style>{`
          /* Sonner Toast - Dark Theme Override */
          [data-sonner-toaster] {
            z-index: 9999 !important;
            bottom: auto !important;
            top: 80px !important;
          }
          [data-sonner-toast] {
            background: #1f2937 !important;
            color: #f3f4f6 !important;
            border: 1px solid #374151 !important;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important;
          }
          [data-sonner-toast][data-type="success"] {
            border-left: 3px solid #22c55e !important;
            background: linear-gradient(90deg, rgba(34,197,94,0.15) 0%, #1f2937 30%) !important;
          }
          [data-sonner-toast][data-type="error"] {
            border-left: 3px solid #ef4444 !important;
            background: linear-gradient(90deg, rgba(239,68,68,0.15) 0%, #1f2937 30%) !important;
          }
          [data-sonner-toast][data-type="info"] {
            border-left: 3px solid #3b82f6 !important;
            background: linear-gradient(90deg, rgba(59,130,246,0.15) 0%, #1f2937 30%) !important;
          }
          [data-sonner-toast][data-type="warning"] {
            border-left: 3px solid #f59e0b !important;
            background: linear-gradient(90deg, rgba(245,158,11,0.15) 0%, #1f2937 30%) !important;
          }
          [data-sonner-toast] [data-title] {
            color: #f3f4f6 !important;
            font-weight: 500 !important;
          }
          [data-sonner-toast] [data-description] {
            color: #9ca3af !important;
          }
          [data-sonner-toast] [data-icon] {
            color: inherit !important;
          }
          /* Animasyon */
          [data-sonner-toast] {
            animation: slideIn 0.2s ease-out !important;
          }
          @keyframes slideIn {
            from {
              transform: translateY(-20px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}</style>
      </I18nProvider>
    </Router>
  );
}
