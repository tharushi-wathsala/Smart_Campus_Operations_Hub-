import React from 'react';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import { ShieldAlert, UserCheck, Briefcase } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../pages/AdminDashboard.css';

interface AppLayoutProps {
    children: React.ReactNode;
    activeTab?: 'overview' | 'audit' | 'broadcast' | 'bookings' | 'assets' | 'facilities' | 'none';
    setActiveTab?: (tab: 'overview' | 'audit' | 'broadcast' | 'bookings' | 'assets' | 'facilities') => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, activeTab, setActiveTab }) => {
    const { userRole } = useAuth();

    const getRoleBadge = () => {
        switch (userRole) {
            case 'ADMIN': return <div className="admin-badge"><ShieldAlert size={16} /> Secure Admin Area</div>;
            case 'TECHNICIAN': return <div className="admin-badge" style={{ background: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }}><Briefcase size={16} /> Technician Workspace</div>;
            default: return <div className="admin-badge" style={{ background: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0' }}><UserCheck size={16} /> Campus Portal</div>;
        }
    };

    return (
        <div className="admin-dashboard-layout" style={{ background: 'var(--bg-soft)' }}>
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            
            <div className="admin-main smooth-transition">
                <div style={{ padding: '1rem' }}>
                    <header className="dashboard-header" style={{ 
                        background: 'var(--glass-bg)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                        padding: '1rem 2rem',
                        margin: '0 0 2rem 0',
                        position: 'relative',
                        zIndex: 2000
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.025em' }}>
                                Campus Portal
                            </h2>
                        </div>
                        
                        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            {getRoleBadge()}
                            <div style={{ width: '1px', height: '24px', background: '#e2e8f0', margin: '0 0.5rem' }}></div>
                            <NotificationBell />
                        </div>
                    </header>
    
                    <div className="admin-content" style={{ maxWidth: '1400px', margin: '0 auto' }}>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppLayout;
