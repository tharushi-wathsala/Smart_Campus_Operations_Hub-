import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tickets from './pages/Tickets';
import TechnicianTickets from './pages/TechnicianTickets';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import TechnicianRoute from './components/TechnicianRoute';
import AdminDashboard from './pages/AdminDashboard';
import AdminTickets from './pages/AdminTickets';
import MyBookings from './pages/MyBookings';
import BookingForm from './components/Booking'
import FacilitiesCatalogue from './components/FacilitiesCatalogue';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tickets" element={<Tickets />} />
              <Route path="/book-facility" element={<BookingForm mode="facilities" />} />
              <Route path="/book-asset" element={<BookingForm mode="assets" />} />
              <Route path="/my-bookings" element={<MyBookings />} />
              <Route path="/facilities" element={<FacilitiesCatalogue />} />
            </Route>

            {/* Secure Technician Area */}
            <Route element={<TechnicianRoute />}>
              <Route path="/technician/tickets" element={<TechnicianTickets />} />
            </Route>

            {/* Secure Admin Area */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/tickets" element={<AdminTickets />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
