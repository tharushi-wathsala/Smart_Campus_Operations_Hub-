/**
 * Contribution of Member 4: Real-time UI Interaction.
 * Usage: This component provides the primary visual interface for notifications. 
 * It manages the unread count badge, real-time message previews, and provides 
 * navigation hooks to relevant resources via the NotificationContext.
 */
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Check, Trash2, MailOpen, Inbox, X, ExternalLink } from 'lucide-react';
import { useNotifications, type Notification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './NotificationBell.css';

/**
 * UI Component for the Global Notification Bell.
 * This component displays the unread notification count, provides a drop-down list of alerts,
 * and handles navigation to related resources (Tickets, Bookings, etc.) based on the notification type and user role.
 */
const NotificationBell: React.FC = () => {
    // Consume notification state and actions from NotificationContext
    const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
    const { userRole } = useAuth(); // Consume user role for intelligent navigation routing
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false); // Controls the visibility of the notification drop-down panel
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null); // State for the detail modal
    const panelRef = useRef<HTMLDivElement>(null); // Reference for detecting clicks outside the panel

    /**
     * Effect to close the notification panel when the user clicks anywhere else in the document.
     */
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    /**
     * Handlers for individual and bulk notification actions.
     */
    const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent the parent click handler from opening the modal
        await markAsRead(id);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent the parent click handler from opening the modal
        await deleteNotification(id);
    };

    const handleItemClick = (n: Notification) => {
        setSelectedNotification(n); // Open the detail modal
        if (!n.isRead) {
            markAsRead(n.id); // Automatically mark as read when viewed
        }
    };

    /**
     * Formats the ISO date string into a human-readable relative time (e.g., "5m ago").
     */
    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return date.toLocaleDateString();
    };

    /**
     * Determines the CSS class for the notification tag based on the alert category.
     */
    const getTagClass = (type: string) => {
        const t = type.toLowerCase();
        if (t === 'broadcast') return 'broadcast';
        if (t === 'role_update') return 'role_update';
        if (t.includes('ticket') || t.includes('task') || t.includes('comment')) return 'maintenance';
        if (t.includes('booking') || t === 'status_change') return 'booking';
        if (t.includes('asset')) return 'asset';
        return 'default';
    };

    /**
     * Intelligent Routing Logic: Determines exactly which page a user should be sent to
     * when they click "View Resource", based on the notification type and their specific role.
     */
    const getNotificationRoute = (n: Notification) => {
        const t = n.type?.toUpperCase() || '';
        const role = userRole?.toUpperCase();
        const rid = n.resourceId; // ID of the specific ticket/booking/asset
        
        let target = '/';

        // Role-based routing for Maintenance tasks
        if (t.includes('TICKET') || t.includes('TASK') || t.includes('COMMENT')) {
            if (role === 'ADMIN') target = '/admin/tickets';
            else if (role === 'TECHNICIAN') target = '/technician/tickets';
            else target = '/tickets';
        }
        // Routing for Booking requests and status changes
        else if (t.includes('BOOKING') || t === 'STATUS_CHANGE') {
            if (role === 'ADMIN') target = '/admin?tab=bookings';
            else {
                const msg = n.message.toLowerCase();
                if (msg.includes('asset') || msg.includes('equipment')) {
                    target = '/book-asset';
                } else {
                    target = '/book-facility';
                }
            }
        }
        // Routing for Asset Catalogue updates
        else if (t.includes('ASSET')) {
            if (role === 'ADMIN') target = '/admin?tab=assets';
            else target = '/facilities';
        } 
        // Security/Role update alerts
        else if (t === 'ROLE_UPDATE') {
            target = role === 'ADMIN' ? '/admin' : '/dashboard';
        }
        else {
            return null;
        }

        // Append the resource query parameter for deep-linking
        if (rid) {
            target += (target.includes('?') ? '&' : '?') + `id=${rid}`;
        }
        return target;
    };

    /**
     * Handles the "View Resource" action by navigating the user and closing the modal.
     */
    const handleActionClick = (n: Notification) => {
        const route = getNotificationRoute(n);
        if (route) {
            setSelectedNotification(null);
            setIsOpen(false);
            
            // Short delay to ensure state transitions complete before navigation
            setTimeout(() => {
                navigate(route);
            }, 10);
        }
    };

    return (
        <div className="notification-wrapper" ref={panelRef}>
            {/* The primary bell icon with unread badge */}
            <button className="icon-button" onClick={() => setIsOpen(!isOpen)} title="Notifications">
                <Bell size={22} strokeWidth={2} />
                {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
            </button>
            
            {/* The Drop-down Panel */}
            {isOpen && (
                <div className="notification-panel">
                    <div className="panel-header">
                        <div className="header-title-group">
                            <h4>Alerts</h4>
                            {unreadCount > 0 && <span className="unread-badge-pill">{unreadCount} new</span>}
                        </div>
                        <button 
                            className="mark-all-btn" 
                            onClick={markAllAsRead}
                            disabled={unreadCount === 0}
                        >
                            <MailOpen size={14} style={{ marginRight: '4px' }} />
                            Mark all as read
                        </button>
                    </div>
                    <div className="panel-body">
                        {notifications.length === 0 ? (
                            <div className="empty-state">
                                <Inbox size={48} className="empty-icon" />
                                <p>Your inbox is clear!</p>
                            </div>
                        ) : (
                            notifications.map((n: Notification) => (
                                <div 
                                    key={n.id} 
                                    className={`notification-item ${n.isRead ? 'read' : 'unread'}`}
                                    onClick={() => handleItemClick(n)}
                                >
                                    {!n.isRead && <div className="unread-indicator" />}
                                    <div className="notification-content">
                                        <div className="notification-meta">
                                            <span className={`type-tag ${getTagClass(n.type)}`}>
                                                {n.type.replace('_', ' ')}
                                            </span>
                                            <span className="time-stamp">{formatTime(n.createdAt)}</span>
                                        </div>
                                        <p>{n.message}</p>
                                    </div>
                                    <div className="notification-actions">
                                        {!n.isRead && (
                                            <button onClick={(e) => handleMarkAsRead(n.id, e)} title="Mark as Read" className="circle-btn check"><Check size={16}/></button>
                                        )}
                                        <button onClick={(e) => handleDelete(n.id, e)} title="Dismiss" className="circle-btn delete"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* The Detail Modal (rendered via Portal to escape stacking context) */}
            {selectedNotification && document.body && createPortal(
                <div className="modal-overlay" onClick={() => setSelectedNotification(null)}>
                    <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setSelectedNotification(null)}>
                            <X size={20} />
                        </button>
                        
                        <div className="modal-header">
                            <span className={`type-tag ${getTagClass(selectedNotification.type)}`}>
                                {selectedNotification.type.replace('_', ' ')}
                            </span>
                            <h2>Alert Details</h2>
                        </div>
                        
                        <div className="modal-body">
                            <p>{selectedNotification.message}</p>
                        </div>
                        
                        <div className="modal-footer">
                            <div className="modal-metadata">
                                <span className="modal-time">{new Date(selectedNotification.createdAt).toLocaleString()}</span>
                                <div className="modal-status">
                                    {selectedNotification.isRead ? 'Status: Read' : 'Status: New'}
                                </div>
                            </div>
                            
                            {/* Conditional "View Details" button based on whether a route exists for this notification */}
                            {getNotificationRoute(selectedNotification) && (
                                <button 
                                    className="action-link-btn"
                                    onClick={() => handleActionClick(selectedNotification)}
                                >
                                    <ExternalLink size={16} />
                                    View Resource Details
                                </button>
                            )}
                        </div>
                    </div>
                </div>, 
                document.body
            )}
        </div>
    );
};

export default NotificationBell;
