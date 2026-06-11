/**
 * Contribution of Member 4: Technician-Specific Security Gating.
 * Usage: This component implements specialized RBAC for technician workflows. 
 * It ensures that only users with 'TECHNICIAN' or 'ADMIN' roles can enter 
 * the maintenance and fault resolution workspace.
 */
import { useAuth } from '../context/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

const TechnicianRoute = () => {
    const { currentUser, userRole, loading } = useAuth();
    
    if (loading) return <div>Loading...</div>;
    
    // Allow TECHNICIAN or ADMIN users to access tech workspace
    if (!currentUser || (userRole !== 'TECHNICIAN' && userRole !== 'ADMIN')) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

export default TechnicianRoute;
