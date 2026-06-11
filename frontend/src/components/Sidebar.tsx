import React, { useState, useEffect } from 'react';
import { 
    Database, 
    ShieldAlert, 
    ChevronLeft, 
    ChevronRight, 
    LogOut, 
    ClipboardList,
    Home,
    Package,
    Building
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProfileModal from './ProfileModal';

interface SidebarProps {
    activeTab?: 'overview' | 'audit' | 'broadcast' | 'bookings' | 'assets' | 'facilities' | 'none';
    setActiveTab?: (tab: 'overview' | 'audit' | 'broadcast' | 'bookings' | 'assets' | 'facilities') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
    const [isCollapsed, setIsCollapsed] = useState(() => {
        return localStorage.getItem('sidebar_collapsed') === 'true';
    });
    const { currentUser, userProfile, userRole, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [isProfileModalOpen, setProfileModalOpen] = useState(false);

    const isTicketsActive = location.pathname === '/admin/tickets' || location.pathname === '/tickets' || location.pathname === '/technician/tickets';
    const isDashboardActive = location.pathname === '/dashboard';

    useEffect(() => {
        localStorage.setItem('sidebar_collapsed', isCollapsed.toString());
    }, [isCollapsed]);

    const handleTabClick = (tab: 'overview' | 'audit' | 'broadcast' | 'bookings' | 'assets' | 'facilities') => {
        if (location.pathname !== '/admin') {
            navigate(`/admin?tab=${tab}`);
        } else {
            setActiveTab?.(tab);
        }
    };

    return (
        <div className={`admin-tabs smooth-transition ${isCollapsed ? 'collapsed' : ''}`} style={{ 
            background: 'white', 
            borderRight: '1px solid #f1f5f9',
            boxShadow: '4px 0 24px rgba(0, 0, 0, 0.02)'
        }}>
            <div style={{ display: 'flex', justifyContent: isCollapsed ? 'center' : 'flex-end', marginBottom: '1.5rem', padding: '0 0.5rem' }}>
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', transition: 'all 0.2s' }}
                    className="sidebar-toggle-btn smooth-transition"
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem', padding: '0 0.5rem' }}>
                <div style={{ position: 'relative' }}>
                    <img 
                        src={userProfile?.photoURL || currentUser?.photoURL || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} 
                        alt="Avatar" 
                        className="avatar smooth-transition" 
                        style={{
                            width: isCollapsed ? '40px' : '72px', 
                            height: isCollapsed ? '40px' : '72px', 
                            borderRadius: '50%',
                            border: '3px solid #f1f5f9',
                            boxShadow: 'var(--shadow-soft)',
                            marginBottom: '0.75rem'
                        }}
                    />
                </div>
                {!isCollapsed && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                        <span 
                            className="user-email smooth-transition" 
                            style={{ 
                                cursor: 'pointer', 
                                fontWeight: 700,
                                color: 'var(--text-main)',
                                marginBottom: '0.25rem', 
                                textAlign: 'center', 
                                wordBreak: 'break-all', 
                                fontSize: '1rem' 
                            }}
                            onClick={() => setProfileModalOpen(true)}
                            title="Click to view/edit profile"
                        >
                            {currentUser?.displayName || (currentUser?.email ? currentUser.email.split('@')[0] : 'User')}
                        </span>
                        <div className="role-badge" style={{ 
                            marginBottom: '1.25rem', 
                            fontSize: '0.7rem', 
                            padding: '0.2rem 0.6rem',
                            fontWeight: 600,
                            letterSpacing: '0.05em'
                        }}>{userRole}</div>
                        
                        <button 
                            onClick={logout} 
                            className="logout-btn smooth-transition" 
                            style={{ 
                                width: '100%', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                gap: '0.5rem', 
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-lg)',
                                background: '#fef2f2',
                                color: '#ef4444',
                                border: '1px solid #fee2e2',
                                fontWeight: 600
                            }}
                        >
                            <LogOut size={16} /> Logout
                        </button>
                    </div>
                )}
                
                {isCollapsed && (
                    <button 
                        onClick={logout} 
                        className="logout-btn icon-only smooth-transition" 
                        style={{ background: '#fef2f2', border: '1px solid #fee2e2', cursor: 'pointer', color: '#ef4444', height: '40px', width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                )}
            </div>

            <div className="nav-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {/* SHARED: Dashboard/Home */}
                <Link 
                    className={`tab-btn smooth-transition ${isDashboardActive || (userRole === 'ADMIN' && activeTab === 'overview' && !isTicketsActive) ? 'active' : ''}`} 
                    to={userRole === 'ADMIN' ? "/admin" : "/dashboard"} 
                    title="Dashboard"
                    onClick={() => userRole === 'ADMIN' && setActiveTab?.('overview')}
                >
                    <Home size={20} style={{ minWidth: '20px' }}/> {!isCollapsed && <span>{userRole === 'ADMIN' ? 'Admin Overview' : 'Home Portal'}</span>}
                </Link>

                {/* ADMIN SPECIFIC TABS */}
                {userRole === 'ADMIN' && (
                    <>
                        <button className={`tab-btn smooth-transition ${activeTab === 'bookings' && !isTicketsActive ? 'active' : ''}`} onClick={() => handleTabClick('bookings')} title="Approve/Reject Requests">
                            <ClipboardList size={20} style={{ minWidth: '20px' }}/> {!isCollapsed && <span>Booking Approvals</span>}
                        </button>
                        <button className={`tab-btn smooth-transition ${activeTab === 'facilities' && !isTicketsActive ? 'active' : ''}`} onClick={() => handleTabClick('facilities')} title="Facility Planning & Management">
                            <Building size={20} style={{ minWidth: '20px' }}/> {!isCollapsed && <span>Facility Management</span>}
                        </button>
                        <button className={`tab-btn smooth-transition ${activeTab === 'assets' && !isTicketsActive ? 'active' : ''}`} onClick={() => handleTabClick('assets')} title="Asset Management">
                            <Package size={20} style={{ minWidth: '20px' }}/> {!isCollapsed && <span>Asset Catalogue</span>}
                        </button>
                        <Link className={`tab-btn smooth-transition ${isTicketsActive ? 'active' : ''}`} to="/admin/tickets" title="Manage Tickets">
                            <ClipboardList size={20} style={{ minWidth: '20px' }}/> {!isCollapsed && <span>Support Tickets</span>}
                        </Link>
                        <button className={`tab-btn smooth-transition ${activeTab === 'audit' && !isTicketsActive ? 'active' : ''}`} onClick={() => handleTabClick('audit')} title="Audit Logs">
                            <Database size={20} style={{ minWidth: '20px' }}/> {!isCollapsed && <span>Audit Database</span>}
                        </button>
                        <button className={`tab-btn smooth-transition ${activeTab === 'broadcast' && !isTicketsActive ? 'active' : ''}`} onClick={() => handleTabClick('broadcast')} title="Global Broadcast">
                            <ShieldAlert size={20} style={{ minWidth: '20px' }}/> {!isCollapsed && <span>Announcements</span>}
                        </button>
                    </>
                )}

                {/* TECHNICIAN SPECIFIC TABS */}
                {userRole === 'TECHNICIAN' && (
                    <Link className={`tab-btn smooth-transition ${isTicketsActive ? 'active' : ''}`} to="/technician/tickets" title="Assigned Tickets">
                        <ClipboardList size={20} style={{ minWidth: '20px' }}/> {!isCollapsed && <span>Assignment Queue</span>}
                    </Link>
                )}

                {/* USER SPECIFIC TABS */}
                {userRole === 'USER' && (
                    <>
                        <Link className={`tab-btn smooth-transition ${isTicketsActive ? 'active' : ''}`} to="/tickets" title="My Tickets">
                            <ClipboardList size={20} style={{ minWidth: '20px' }}/> {!isCollapsed && <span>Incident Hub</span>}
                        </Link>
                        <Link className={`tab-btn smooth-transition ${location.pathname === '/book-facility' ? 'active' : ''}`} to="/book-facility" title="Book a Facility">
                            <Building size={20} style={{ minWidth: '20px' }}/> {!isCollapsed && <span>Book Facility</span>}
                        </Link>
                        <Link className={`tab-btn smooth-transition ${location.pathname === '/book-asset' ? 'active' : ''}`} to="/book-asset" title="Request an Asset">
                            <Package size={20} style={{ minWidth: '20px' }}/> {!isCollapsed && <span>Inquire Assets</span>}
                        </Link>
                        <Link className={`tab-btn smooth-transition ${location.pathname === '/my-bookings' ? 'active' : ''}`} to="/my-bookings" title="View historical records">
                            <ClipboardList size={20} style={{ minWidth: '20px' }}/> {!isCollapsed && <span>Booking Registry</span>}
                        </Link>
                    </>
                )}
            </div>

            {isProfileModalOpen && (
                <ProfileModal onClose={() => setProfileModalOpen(false)} />
            )}
        </div>
    );
};

export default Sidebar;
