import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import ProfileModal from '../components/ProfileModal';
import { Building, ClipboardList, Package } from 'lucide-react';
import './Dashboard.css';
import './AdminDashboard.css';

const Dashboard: React.FC = () => {
    const { currentUser, userRole } = useAuth();
    const navigate = useNavigate();
    const [isProfileModalOpen, setProfileModalOpen] = useState(false);

    const ticketActionPath = userRole === 'TECHNICIAN' ? '/technician/tickets' : '/tickets';

    // If user is Admin, go directly to the admin area instead of showing the user dashboard
    if (userRole === 'ADMIN') {
        return <Navigate to="/admin" replace />;
    }

    return (
        <AppLayout activeTab="none">
            <div className="portal-container animate-fade-in">
                <div className="portal-header" style={{ alignItems: 'center', marginBottom: '3rem' }}>
                    <div className="header-text">
                        <h1 className="gradient-text" style={{ fontSize: '2.75rem' }}>
                            Welcome back, {currentUser?.displayName || (currentUser?.email ? currentUser.email.split('@')[0] : 'User')}!
                        </h1>
                        <p style={{ fontSize: '1.2rem' }}>
                            Explore your personalized Smart Campus Workspace.
                        </p>
                    </div>
                </div>
                
                <div className="portal-content">
                    <div className="welcome-card" style={{ 
                        background: 'white', 
                        border: '1px solid #f1f5f9', 
                        borderRadius: 'var(--radius-xl)',
                        boxShadow: 'var(--shadow-soft)',
                        padding: '2.5rem',
                        marginBottom: '3rem'
                    }}>
                        <div style={{ display: 'flex', gap: '3rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '300px' }}>
                                <h2 style={{ color: 'var(--text-main)', fontSize: '1.75rem', marginBottom: '1rem', fontWeight: 800 }}>Digital Campus Access</h2>
                                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.8', fontSize: '1.05rem' }}>
                                    Your gateway to campus services. Manage your maintenance reports, reserve academic facilities, and request portable assets all from one unified dashboard. Real-time updates keep you synchronized with campus operations.
                                </p>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div style={{ padding: '0.75rem 1.25rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                        <span style={{ fontWeight: 700, color: 'var(--campus-primary)' }}>Role:</span> {userRole}
                                    </div>
                                    <div style={{ padding: '0.75rem 1.25rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                        <span style={{ fontWeight: 700, color: 'var(--campus-primary)' }}>Status:</span> Active
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="modules-grid">
                        <div className="module-card smooth-transition" onClick={() => navigate(ticketActionPath)}>
                            <div className="module-icon" style={{ background: 'linear-gradient(135deg, var(--campus-primary) 0%, var(--campus-primary-dark) 100%)' }}>
                                <ClipboardList size={32} />
                            </div>
                            <h3>Maintenance Hub</h3>
                            <p>Report issues or track the status of existing technical requests across the campus infrastructure.</p>
                            <button className="module-btn" style={{ background: 'var(--campus-primary)' }}>Open Issues →</button>
                        </div>

                        {userRole === 'USER' && (
                            <>
                                <div className="module-card smooth-transition" onClick={() => navigate('/book-facility')}>
                                    <div className="module-icon" style={{ background: 'linear-gradient(135deg, var(--facility-blue) 0%, #1d4ed8 100%)' }}>
                                        <Building size={32} />
                                    </div>
                                    <h3>Campus Facilities</h3>
                                    <p>Reserve classrooms, specialized labs, or conference rooms for academic and group activities.</p>
                                    <button className="module-btn" style={{ background: 'var(--facility-blue)' }}>Book Space →</button>
                                </div>

                                <div className="module-card smooth-transition" onClick={() => navigate('/book-asset')}>
                                    <div className="module-icon" style={{ background: 'linear-gradient(135deg, var(--asset-purple) 0%, #7c3aed 100%)' }}>
                                        <Package size={32} />
                                    </div>
                                    <h3>Portable Assets</h3>
                                    <p>Browse and request projectors, cameras, laptops, and other equipment for temporary checkout.</p>
                                    <button className="module-btn" style={{ background: 'var(--asset-purple)' }}>Inquire Inventory →</button>
                                </div>
                            </>
                        )}

                        {userRole === 'ADMIN' && (
                            <div className="module-card smooth-transition" onClick={() => navigate('/facilities')}>
                                <div className="module-icon facilities-icon">
                                    <Building size={32} />
                                </div>
                                <h3>Unified Catalogue</h3>
                                <p>Execute full administrative control over all campus facilities and asset inventories.</p>
                                <button className="module-btn" style={{ background: 'var(--campus-primary)' }}>Manage Resources →</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {isProfileModalOpen && (
                <ProfileModal onClose={() => setProfileModalOpen(false)} />
            )}
        </AppLayout>
    );
};

export default Dashboard;
