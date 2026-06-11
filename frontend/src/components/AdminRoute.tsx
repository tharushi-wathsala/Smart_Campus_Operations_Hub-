/**
 * Contribution of Member 4: Admin-Specific Security Gating.
 * Usage: This component implements specialized RBAC for administrative views. 
 * It verifies that the 'userRole' claim is 'ADMIN' before allowing entry to 
 * system management and health dashboards.
 */
import { useAuth } from '../context/AuthContext';
import { Outlet, Navigate } from 'react-router-dom';

const AdminRoute = () => {
    const { currentUser, userRole, loading } = useAuth();

    if (loading) return <div>Loading...</div>;

    if (!currentUser || userRole !== 'ADMIN') {
        // Redirect unauthorized users back to the dashboard
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

export default AdminRoute;
