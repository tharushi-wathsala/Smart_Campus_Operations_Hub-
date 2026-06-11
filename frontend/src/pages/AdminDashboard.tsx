import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, UserCog, User, Users, Database, Cpu, MemoryStick, ChevronDown, ChevronUp, UserCheck, Send, Eye, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import AppLayout from '../components/AppLayout';
import FacilitiesCatalogue from '../components/FacilitiesCatalogue';
import './AdminDashboard.css';
import './Dashboard.css';

interface UserData {
  uid: string;
  email: string;
  displayName: string | null;
  role: string;
  disabled: boolean;
}

const AdminDashboard: React.FC = () => {
    const { currentUser, userRole } = useAuth();
    const [users, setUsers] = useState<UserData[]>([]);
    const [healthData, setHealthData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [healthLoading, setHealthLoading] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [isHealthExpanded, setIsHealthExpanded] = useState(true);
    const [isUsersExpanded, setIsUsersExpanded] = useState(true);
    const [bookings, setBookings] = useState<any[]>([]);
    const [loadingBookings, setLoadingBookings] = useState(false);
    
    // URL Persistence
    const [searchParams, setSearchParams] = useSearchParams();
    const initialTab = searchParams.get('tab') as 'overview' | 'audit' | 'broadcast' | 'bookings' | 'assets' | 'facilities' || 'overview';

    // New States
    const [activeTab, setActiveTabInternal] = useState<'overview'|'audit'|'broadcast'|'bookings'|'assets'|'facilities'>(initialTab);

    // Synchronize state with URL
    const setActiveTab = (tab: 'overview' | 'audit' | 'broadcast' | 'bookings' | 'assets' | 'facilities') => {
        setActiveTabInternal(tab);
        setSearchParams({ tab });
    };

    useEffect(() => {
        if (searchParams.get('tab') && searchParams.get('tab') !== activeTab) {
            setActiveTabInternal(searchParams.get('tab') as any);
        }
    }, [searchParams]);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [loadingAudit, setLoadingAudit] = useState(false);
    
    // Booking Filters
    const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('ALL');
    const [bookingDateFilter, setBookingDateFilter] = useState<string>('');

    const [broadcastMsg, setBroadcastMsg] = useState('');
    const [broadcastRole, setBroadcastRole] = useState('ALL');
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [selectedLog, setSelectedLog] = useState<any | null>(null);
    const [selectedStat, setSelectedStat] = useState<{title: string, value: any, desc: string, icon: any, color?: string} | null>(null);

    const filteredBookings = React.useMemo(() => {
        return bookings.filter(b => {
            const matchesStatus = bookingStatusFilter === 'ALL' || b.status === bookingStatusFilter;
            const matchesDate = !bookingDateFilter || b.date === bookingDateFilter;
            return matchesStatus && matchesDate;
        });
    }, [bookings, bookingStatusFilter, bookingDateFilter]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/users');
            setUsers(res.data);
        } catch(e) {
            console.error("Failed to fetch users", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchHealthData = async () => {
        try {
            setHealthLoading(true);
            const res = await apiClient.get('/admin/system-health');
            setHealthData(res.data);
        } catch(e) {
            console.error("Failed to fetch system health", e);
        } finally {
            setHealthLoading(false);
        }
    };

    useEffect(() => {
        if(userRole === 'ADMIN') {
            if (activeTab === 'overview') {
                fetchUsers();
                fetchHealthData();
            } else if (activeTab === 'audit') {
                fetchAuditLogs();
            } else if (activeTab === 'bookings') {
                fetchBookings();
            }
        }
    }, [userRole, activeTab]);

    // Live Data Synchronization
    useEffect(() => {
        let client: Client | null = null;
        if (userRole !== 'ADMIN') return;

        const setupSync = () => {
            const host = window.location.hostname;
            const wsUrl = host === 'localhost' ? 'http://localhost:8080/ws' : `http://${host}:8080/ws`;
            
            const stompClient = new Client({
                webSocketFactory: () => new SockJS(wsUrl),
                reconnectDelay: 5000,
            });

            stompClient.beforeConnect = async () => {
                try {
                    const token = await currentUser!.getIdToken(true);
                    stompClient.connectHeaders = {
                        'Authorization': `Bearer ${token}`
                    };
                } catch (err) {
                    console.error("Admin Sync Token Refresh Failed", err);
                }
            };

            stompClient.onConnect = () => {
                console.log("Admin Sync Connected");
                stompClient.subscribe('/topic/bookings/admin/updates', () => {
                    console.log("Live Update Triggered: Fetching Bookings...");
                    fetchBookings();
                });
            };

            client = stompClient;
            stompClient.activate();
        };

        setupSync();
        return () => {
            if (client) client.deactivate();
        };
    }, [userRole]);

    const fetchBookings = async () => {
        try {
            setLoadingBookings(true);
            const res = await apiClient.get('/booking/all');
            setBookings(res.data || []);
        } catch(e) {
            console.error("Failed to fetch bookings", e);
            toast.error("Failed to load facility bookings.");
        } finally {
            setLoadingBookings(false);
        }
    };

    // Deep-linking logic for bookings
    useEffect(() => {
        const targetId = searchParams.get('id');
        if (activeTab === 'bookings' && targetId && !loadingBookings && bookings.length > 0) {
            const element = document.getElementById(`booking-${targetId}`);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                    element.classList.add('highlight-pulse');
                    setTimeout(() => {
                        element.classList.remove('highlight-pulse');
                    }, 4000);
                }, 100);
            }
        }
    }, [activeTab, searchParams, loadingBookings, bookings]);


    const handleBookingStatusUpdate = async (id: string, status: string) => {
        try {
            await apiClient.patch(`/booking/${id}/status?status=${status}`);
            toast.success(`Booking ${status.toLowerCase()} successfully!`);
            fetchBookings();
        } catch(e) {
            console.error("Failed to update booking status", e);
            toast.error("Error updating booking status.");
        }
    };

    const fetchAuditLogs = async () => {
        try {
            setLoadingAudit(true);
            const res = await apiClient.get('/audit-logs');
            setAuditLogs(res.data);
        } catch(e) {
            console.error("Failed to fetch audit logs", e);
        } finally {
            setLoadingAudit(false);
        }
    };

    // Use a ref to prevent double-clicks regardless of React state update speed
    const isSubmittingBroadcast = React.useRef(false);

    const handleBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!broadcastMsg.trim() || isSubmittingBroadcast.current) return;
        
        isSubmittingBroadcast.current = true;
        setIsBroadcasting(true);
        try {
            await apiClient.post('/notifications/broadcast', { message: broadcastMsg, role: broadcastRole });
            toast.success("Broadcast sent successfully!", { position: 'top-right' });
            setBroadcastMsg('');
            setActiveTab('overview');
        } catch(e: any) {
            toast.error("Failed to send broadcast: " + (e.response?.data || e.message), { position: 'top-right' });
        } finally {
            setIsBroadcasting(false);
            isSubmittingBroadcast.current = false;
        }
    };

    const handleRoleUpdate = async (userId: string, newRole: string) => {
        try {
            setUpdatingId(userId);
            await apiClient.put(`/users/${userId}/role`, { role: newRole });
            setUsers(users.map(u => u.uid === userId ? { ...u, role: newRole.toUpperCase() } : u));
        } catch(e) {
            console.error("Failed to update user role", e);
            alert("Failed to update user role. Check console.");
        } finally {
            setUpdatingId(null);
        }
    };

    const handleStatusUpdate = async (userId: string, currentStatus: boolean | undefined) => {
        try {
            const isCurrentlyDisabled = currentStatus === true;
            setUpdatingId(userId);
            await apiClient.put(`/users/${userId}/status`, { disabled: !isCurrentlyDisabled });
            setUsers(users.map(u => u.uid === userId ? { ...u, disabled: !isCurrentlyDisabled } : u));
        } catch(e) {
            console.error("Failed to update user status", e);
            alert("Failed to toggle status.");
        } finally {
            setUpdatingId(null);
        }
    };

    const getRoleIcon = (role: string) => {
        switch(role) {
            case 'ADMIN': return <ShieldCheck size={18} className="role-icon admin-icon" />;
            case 'TECHNICIAN': return <UserCog size={18} className="role-icon tech-icon" />;
            default: return <User size={18} className="role-icon user-icon" />;
        }
    };

    const getActionBadgeClass = (action: string) => {
        const a = action.toLowerCase();
        if (a.includes('broadcast')) return 'broadcast';
        if (a.includes('role')) return 'role_update';
        if (a.includes('login')) return 'login';
        if (a.includes('status')) return 'status_update';
        return 'default';
    };

    return (
        <AppLayout activeTab={activeTab} setActiveTab={setActiveTab}>

            {activeTab === 'overview' && (
                <>
                    <div className="admin-card" style={{ marginTop: '2rem' }}>
                        <div 
                            className="card-header" 
                            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            onClick={() => setIsHealthExpanded(!isHealthExpanded)}
                        >
                            <div>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Secure System Health</h3>
                                <p style={{ margin: 0, marginTop: '4px' }}>Real-time telemetry and monitoring data. ADMIN ONLY.</p>
                            </div>
                            <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                {isHealthExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                        </div>
                        {isHealthExpanded && (
                            <>
                                {healthLoading ? (
                                     <div className="loading-state">Accessing secure health telemetry...</div>
                                ) : healthData ? (
                                    <div className="health-dashboard">
                                        <div 
                                            className="health-stat-card health-main-status"
                                            onClick={() => setSelectedStat({
                                                title: "System Status",
                                                value: healthData.status,
                                                desc: "The overall health of the Smart Campus platform. All API services, background workers, and critical processes are currently active and responding within normal parameters.",
                                                icon: <ShieldCheck size={48} />,
                                                color: healthData.status?.includes('Online') ? '#10b981' : '#f59e0b'
                                            })}
                                        >
                                            <span className="health-stat-title">System Status</span>
                                            <span className={`health-stat-value ${healthData.status?.includes('Online') ? 'ok' : 'warning'}`}>
                                                {healthData.status}
                                            </span>
                                        </div>
                                        <div 
                                            className="health-stat-card"
                                            onClick={() => setSelectedStat({
                                                title: "Database Integrity",
                                                value: healthData.databaseStatus,
                                                desc: "Direct connectivity to Cloud Firestore. Latency is within optimal range and data consistency is being maintained across all global nodes.",
                                                icon: <Database size={48} />,
                                                color: '#10b981'
                                            })}
                                        >
                                            <span className="health-stat-title"><Database size={16} style={{display:'inline', marginBottom:'-2px'}}/> Database Integrity</span>
                                            <span className="health-stat-value ok">{healthData.databaseStatus}</span>
                                        </div>
                                        <div 
                                            className="health-stat-card"
                                            onClick={() => setSelectedStat({
                                                title: "RAM Usage",
                                                value: healthData.memoryUsage,
                                                desc: "Total memory consumption of the Spring Boot application server. Maintaining usage below system-defined thresholds to ensure high availability.",
                                                icon: <MemoryStick size={48} />,
                                                color: '#3b82f6'
                                            })}
                                        >
                                            <span className="health-stat-title"><MemoryStick size={16} style={{display:'inline', marginBottom:'-2px'}}/> RAM Usage</span>
                                            <span className="health-stat-value">{healthData.memoryUsage}</span>
                                        </div>
                                        <div 
                                            className="health-stat-card"
                                            onClick={() => setSelectedStat({
                                                title: "CPU Usage",
                                                value: healthData.cpuUsage,
                                                desc: "The current processing load on the server. Low utilization indicates efficient resource management and high capacity for concurrent operations.",
                                                icon: <Cpu size={48} />,
                                                color: '#8b5cf6'
                                            })}
                                        >
                                            <span className="health-stat-title"><Cpu size={16} style={{display:'inline', marginBottom:'-2px'}}/> CPU Usage</span>
                                            <span className="health-stat-value">{healthData.cpuUsage}</span>
                                        </div>
                                        <div 
                                            className="health-stat-card"
                                            onClick={() => setSelectedStat({
                                                title: "Total Active Users",
                                                value: healthData.activeUsers || 0,
                                                desc: "Registered campus personnel tracked in Firebase Authentication. This includes all Administrators, Technicians, and Students.",
                                                icon: <Users size={48} />,
                                                color: '#3b82f6'
                                            })}
                                        >
                                            <span className="health-stat-title"><Users size={16} style={{display:'inline', marginBottom:'-2px'}}/> Total Active Users</span>
                                            <span className="health-stat-value">{healthData.activeUsers || 0}</span>
                                        </div>
                                        <div 
                                            className="health-stat-card"
                                            onClick={() => setSelectedStat({
                                                title: "Online Now",
                                                value: healthData.onlineUsers || 0,
                                                desc: "The number of users currently connected via real-time WebSocket channels. These users are currently active in the UI and receiving live updates.",
                                                icon: <UserCheck size={48} />,
                                                color: '#10b981'
                                            })}
                                        >
                                            <span className="health-stat-title"><UserCheck size={16} style={{display:'inline', marginBottom:'-2px', color:'#10b981'}}/> Online Now</span>
                                            <span className="health-stat-value ok">{healthData.onlineUsers || 0}</span>
                                        </div>
                                        <div 
                                            className="health-stat-card"
                                            onClick={() => setSelectedStat({
                                                title: "Total Resources",
                                                value: healthData.totalResources !== undefined ? healthData.totalResources : 'N/A',
                                                desc: "Total inventory of smart campus assets, including laboratories, equipment, and reservable facilities stored in the database.",
                                                icon: <Target size={48} />,
                                                color: '#64748b'
                                            })}
                                        >
                                            <span className="health-stat-title"><Database size={16} style={{display:'inline', marginBottom:'-2px'}}/> Total Resources</span>
                                            <span className="health-stat-value">{healthData.totalResources !== undefined ? healthData.totalResources : 'N/A'}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="empty-state">Failed to load secure health data. Check permissions.</div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="admin-card" style={{ marginTop: '2rem' }}>
                        <div 
                            className="card-header"
                            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            onClick={() => setIsUsersExpanded(!isUsersExpanded)}
                        >
                            <div>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Registered Users</h3>
                                <p style={{ margin: 0, marginTop: '4px' }}>Manage access levels and permissions for all campus personnel.</p>
                            </div>
                            <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                {isUsersExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                        </div>
                        
                        {isUsersExpanded && (
                            <>
                                {loading ? (
                                    <div className="loading-state">Loading users securely...</div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="users-table">
                                            <thead>
                                                <tr>
                                                    <th>User ID</th>
                                                    <th>Email</th>
                                                    <th>Current Role</th>
                                                    <th>Manage Access</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {users.map(user => (
                                                    <tr key={user.uid}>
                                                        <td className="mono">{user.uid.substring(0,8)}...</td>
                                                        <td>{user.email}</td>
                                                        <td>
                                                            <div className="role-badge">
                                                                {getRoleIcon(user.role)}
                                                                {user.role || 'USER'}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="role-selector">
                                                                <select 
                                                                    value={user.role || 'USER'} 
                                                                    onChange={(e) => handleRoleUpdate(user.uid, e.target.value)}
                                                                    disabled={updatingId === user.uid || user.disabled}
                                                                    className={updatingId === user.uid ? 'updating' : ''}
                                                                >
                                                                    <option value="USER">User (Standard)</option>
                                                                    <option value="TECHNICIAN">Technician</option>
                                                                    <option value="ADMIN">Administrator</option>
                                                                </select>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <button 
                                                                style={{ 
                                                                    padding: '0.4rem 0.8rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600,
                                                                    background: user.disabled ? '#10b981' : '#ef4444', color: 'white'
                                                                }}
                                                                onClick={() => handleStatusUpdate(user.uid, user.disabled)}
                                                                disabled={updatingId === user.uid}
                                                            >
                                                                {user.disabled ? 'Enable' : 'Suspend'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {users.length === 0 && (
                                                    <tr>
                                                        <td colSpan={4} className="empty-state">No users found.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </>
            )}

            {activeTab === 'audit' && (
                <div className="admin-card">
                    <div className="card-header">
                        <h3>System Audit Logs</h3>
                        <p>Immutable record of critical administrative actions.</p>
                    </div>
                    {loadingAudit ? (
                        <div className="loading-state">Fetching secure logs...</div>
                    ) : (
                        <div className="table-responsive">
                            <table className="users-table">
                                <thead>
                                    <tr>
                                        <th>Timestamp</th>
                                        <th>Action Performed</th>
                                        <th>Performed By</th>
                                        <th>Target Reference</th>
                                        <th>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditLogs.map((log) => (
                                        <tr key={log.id} className="audit-row" onClick={() => setSelectedLog(log)}>
                                            <td className="mono">{new Date(log.timestamp).toLocaleString()}</td>
                                            <td>
                                                <span className={`action-badge ${getActionBadgeClass(log.action)}`}>
                                                    {log.action.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td>{log.performedBy}</td>
                                            <td className="mono" style={{ fontSize: '0.8rem' }}>{log.targetUser}</td>
                                            <td style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {log.details || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    {auditLogs.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="empty-state">No audit logs recorded yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'broadcast' && (
                <div className="admin-card">
                    <div className="card-header" style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Send size={24} style={{ color: '#3b82f6' }} />
                            Global Broadcast Center
                        </h3>
                        <p>Distribute real-time intelligence and alerts to the campus network.</p>
                    </div>
                    
                    <div className="broadcast-grid">
                        <div className="broadcast-form-section">
                            <section>
                                <h4 className="preview-label" style={{ marginBottom: '1rem' }}>
                                    <Target size={16} /> Select Audience
                                </h4>
                                <div className="audience-selector">
                                    {[
                                        { id: 'ALL', label: 'All Users', icon: <Users size={20} /> },
                                        { id: 'ADMIN', label: 'Admins', icon: <ShieldCheck size={20} /> },
                                        { id: 'TECHNICIAN', label: 'Techs', icon: <UserCog size={20} /> },
                                        { id: 'USER', label: 'Students', icon: <User size={20} /> },
                                    ].map((role) => (
                                        <label key={role.id} className="role-option">
                                            <input 
                                                type="radio" 
                                                name="audience" 
                                                value={role.id} 
                                                checked={broadcastRole === role.id}
                                                onChange={(e) => setBroadcastRole(e.target.value)}
                                            />
                                            <div className="role-card">
                                                {role.icon}
                                                <span>{role.label}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <h4 className="preview-label" style={{ marginBottom: '1rem' }}>
                                    Broadcast Message
                                </h4>
                                <div className="broadcast-textarea-wrapper">
                                    <textarea 
                                        value={broadcastMsg}
                                        onChange={(e) => setBroadcastMsg(e.target.value.substring(0, 280))}
                                        placeholder="What's the announcement? (Max 280 chars)"
                                        required
                                    />
                                    <div className="char-counter">
                                        {broadcastMsg.length}/280
                                    </div>
                                </div>
                            </section>

                            <button 
                                className={`send-broadcast-btn ${broadcastMsg.trim() ? 'pulse-glowing' : ''}`}
                                onClick={handleBroadcast}
                                disabled={isBroadcasting || !broadcastMsg.trim()}
                            >
                                {isBroadcasting ? (
                                    <>Deploying Broadcast...</>
                                ) : (
                                    <>
                                        <Send size={18} /> SEND BROADCAST NOW
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="live-preview-section">
                            <h4 className="preview-label">
                                <Eye size={16} /> Live UI Preview
                            </h4>
                            
                            <div className="preview-card-skeleton">
                                <div className="preview-tag">
                                    BROADCAST: {broadcastRole}
                                </div>
                                <div className={`preview-content-placeholder ${!broadcastMsg ? 'empty' : ''}`}>
                                    {broadcastMsg || "Start typing to see how your message will appear to the campus..."}
                                </div>
                                <div className="preview-footer">
                                    <span className="preview-time">Just now</span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#f1f5f9' }} />
                                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#f1f5f9' }} />
                                    </div>
                                </div>
                            </div>

                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.4', padding: '0 0.5rem' }}>
                                <strong>Note:</strong> This message will be delivered instantly via WebSocket 
                                to all online personnel in the selected group.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'bookings' && (
                <div className="admin-card">
                    <div className="card-header">
                        <h3>Booking Request Review</h3>
                        <p>Approve or reject requests for campus infrastructure and asset resources.</p>
                    </div>
                    {loadingBookings ? (
                        <div className="loading-state">Syncing secure booking records...</div>
                    ) : (
                        <>
                            <div className="booking-filters">
                                <div className="booking-filter-group">
                                    <label>Filter by Date</label>
                                    <input 
                                        type="date" 
                                        value={bookingDateFilter} 
                                        onChange={(e) => setBookingDateFilter(e.target.value)}
                                        className="booking-filter-input"
                                    />
                                </div>
                                <div className="booking-filter-group">
                                    <label>Filter by Status</label>
                                    <select 
                                        value={bookingStatusFilter} 
                                        onChange={(e) => setBookingStatusFilter(e.target.value)}
                                        className="booking-filter-select"
                                    >
                                        <option value="ALL">All Statuses</option>
                                        <option value="PENDING">Pending</option>
                                        <option value="APPROVED">Approved</option>
                                        <option value="REJECT">Rejected</option>
                                    </select>
                                </div>
                                {(bookingDateFilter || bookingStatusFilter !== 'ALL') && (
                                    <button 
                                        className="clear-filter-btn"
                                        onClick={() => {
                                            setBookingDateFilter('');
                                            setBookingStatusFilter('ALL');
                                        }}
                                    >
                                        Clear Filters
                                    </button>
                                )}
                                <div className="filter-stats">
                                    Showing {filteredBookings.length} of {bookings.length} bookings
                                </div>
                            </div>
                            <div className="table-responsive">
                            <table className="users-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Resource</th>
                                        <th>User ID</th>
                                        <th>Time</th>
                                        <th>Purpose</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredBookings.map((booking) => (
                                        <tr key={booking.id} id={`booking-${booking.id}`}>
                                            <td className="mono" style={{ whiteSpace: 'nowrap' }}>{booking.date}</td>
                                            <td style={{ fontWeight: 600, color: '#0f172a' }}>{booking.bookingResource}</td>
                                            <td className="mono" style={{ fontSize: '0.8rem' }}>{booking.userId}</td>
                                            <td style={{ whiteSpace: 'nowrap' }}>{booking.startTime} - {booking.endTime}</td>
                                            <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={booking.purpose}>
                                                {booking.purpose}
                                            </td>
                                            <td>
                                                <span className={`status-pill status-${booking.status?.toLowerCase()}`}>
                                                    {booking.status}
                                                </span>
                                            </td>
                                            <td>
                                                {booking.status === 'PENDING' ? (
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button 
                                                            className="action-btn-small approve" 
                                                            onClick={() => handleBookingStatusUpdate(booking.id, 'APPROVED')}
                                                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                        >
                                                            Approve
                                                        </button>
                                                        <button 
                                                            className="action-btn-small reject" 
                                                            onClick={() => handleBookingStatusUpdate(booking.id, 'REJECT')}
                                                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Processed</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {bookings.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="empty-state">No facility bookings found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        </>
                    )}
                </div>
            )}

            {activeTab === 'assets' && (
                <FacilitiesCatalogue mode="assets" />
            )}

            {activeTab === 'facilities' && (
                <FacilitiesCatalogue mode="facilities" />
            )}
            {selectedLog && (
                <div className="audit-modal-overlay" onClick={() => setSelectedLog(null)}>
                    <div className="audit-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="audit-modal-header">
                            <div className="modal-header-content">
                                <span className={`action-badge ${getActionBadgeClass(selectedLog.action)}`}>
                                    {selectedLog.action.replace('_', ' ')}
                                </span>
                                <h2>Audit Log Details</h2>
                            </div>
                            <button className="audit-modal-close" onClick={() => setSelectedLog(null)}>
                                <ChevronDown size={24} />
                            </button>
                        </div>
                        
                        <div className="audit-modal-body">
                            <div className="modal-info-grid">
                                <div className="info-item">
                                    <label>Timestamp</label>
                                    <span>{new Date(selectedLog.timestamp).toLocaleString()}</span>
                                </div>
                                <div className="info-item">
                                    <label>Performed By</label>
                                    <span>{selectedLog.performedBy}</span>
                                </div>
                                <div className="info-item">
                                    <label>Target Reference</label>
                                    <span className="mono">{selectedLog.targetUser || 'N/A'}</span>
                                </div>
                                <div className="info-item">
                                    <label>Log ID</label>
                                    <span className="mono">{selectedLog.id?.substring(0, 12)}...</span>
                                </div>
                                <div className="info-item full-width">
                                    <label>Detailed Payload / Message</label>
                                    <div className="details-payload">
                                        {selectedLog.details || 'No additional details recorded.'}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="audit-modal-footer">
                            <button className="modal-action-btn" onClick={() => setSelectedLog(null)}>
                                Close Record
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {selectedStat && (
                <div className="audit-modal-overlay" onClick={() => setSelectedStat(null)}>
                    <div className="audit-modal stat-detail-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="stat-modal-glow" style={{ background: `radial-gradient(circle at center, ${selectedStat.color}15 0%, transparent 70%)` }} />
                        <div className="audit-modal-header" style={{ border: 'none', paddingBottom: '1rem' }}>
                            <div className="modal-header-content">
                                <span className="action-badge default">Telemetry Highlight</span>
                                <h2 style={{ marginTop: '0.5rem' }}>{selectedStat.title}</h2>
                            </div>
                            <button className="audit-modal-close" onClick={() => setSelectedStat(null)}>
                                <ChevronDown size={24} />
                            </button>
                        </div>
                        <div className="audit-modal-body" style={{ textAlign: 'center', paddingTop: 0 }}>
                            <div className="stat-highlight-icon" style={{ color: selectedStat.color }}>
                                {selectedStat.icon}
                            </div>
                            <div className="stat-highlight-value" style={{ color: selectedStat.color }}>
                                {selectedStat.value}
                            </div>
                            <p className="stat-highlight-desc">
                                {selectedStat.desc}
                            </p>
                        </div>
                        <div className="audit-modal-footer" style={{ justifyContent: 'center', background: 'transparent' }}>
                            <button className="modal-action-btn" onClick={() => setSelectedStat(null)} style={{ background: selectedStat.color }}>
                                Acknowledge Data
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
};

export default AdminDashboard;
