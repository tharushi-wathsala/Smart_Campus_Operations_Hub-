import { useEffect, useMemo, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { FormEvent } from 'react';
import { toast } from 'react-hot-toast';
import apiClient from '../api/apiClient';
import type { MaintenanceTicket } from '../types/ticket';
import CommentSection from '../components/CommentSection';
import AppLayout from '../components/AppLayout';
import ImagePreviewModal from '../components/ImagePreviewModal';
import { CheckCircle } from 'lucide-react';
import PromptModal from '../components/PromptModal';
import './AdminTickets.css';
import './AdminDashboard.css';

interface UserData {
  uid: string;
  email: string;
  displayName: string | null;
  role: string;
  disabled: boolean;
}

const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
type TicketStatusOption = typeof STATUS_OPTIONS[number];
type TicketDisplayStatus = TicketStatusOption | 'REJECTED';

const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
type TicketPriority = typeof PRIORITY_OPTIONS[number];

const STATUS_SORT_ORDER: Record<TicketDisplayStatus, number> = {
  OPEN: 0,
  IN_PROGRESS: 1,
  RESOLVED: 2,
  CLOSED: 3,
  REJECTED: 4,
};

const getErrorMessage = (error: unknown) => {
  if (typeof error === 'object' && error !== null) {
    const maybeError = error as { response?: { data?: { message?: string } }; message?: string };
    return maybeError.response?.data?.message || maybeError.message || 'Request failed';
  }
  return 'Request failed';
};

const normalizeStatus = (status?: string): TicketDisplayStatus => {
  const normalized = (status || 'OPEN').toUpperCase();
  if (normalized === 'REJECTED') return 'REJECTED';
  if (STATUS_OPTIONS.includes(normalized as TicketStatusOption)) return normalized as TicketStatusOption;
  return 'OPEN';
};

const normalizePriority = (priority?: string): TicketPriority => {
  const normalized = (priority || 'MEDIUM').toUpperCase();
  if (PRIORITY_OPTIONS.includes(normalized as TicketPriority)) return normalized as TicketPriority;
  return 'MEDIUM';
};

const AdminTickets = () => {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [technicians, setTechnicians] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionTicketId, setActionTicketId] = useState<string | null>(null);
  const [selectedTechByTicket, setSelectedTechByTicket] = useState<Record<string, string>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<TicketDisplayStatus | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Prompt Modal State
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptConfig, setPromptConfig] = useState<{
    ticketId: string;
    currentStatus: TicketDisplayStatus;
  } | null>(null);

  const ticketCountByStatus = useMemo(() => {
    return tickets.reduce<Record<string, number>>((acc, ticket) => {
      const key = normalizeStatus(ticket.status);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const filtered = tickets.filter((t) => {
      const matchesStatus = statusFilter === 'ALL' || normalizeStatus(t.status) === statusFilter;
      const matchesPriority = priorityFilter === 'ALL' || normalizePriority(t.priority) === priorityFilter;
      
      const searchStr = `${t.description} ${t.category} ${t.location} ${t.resourceName || ''} ${t.userId}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
      
      return matchesStatus && matchesPriority && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      const statusDiff = STATUS_SORT_ORDER[normalizeStatus(a.status)] - STATUS_SORT_ORDER[normalizeStatus(b.status)];
      if (statusDiff !== 0) return statusDiff;

      const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
      const safeATime = Number.isNaN(aTime) ? 0 : aTime;
      const safeBTime = Number.isNaN(bTime) ? 0 : bTime;
      return safeBTime - safeATime;
    });
  }, [tickets, statusFilter, priorityFilter, searchTerm]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [ticketRes, usersRes] = await Promise.all([
        apiClient.get<MaintenanceTicket[]>('/tickets/admin/all'),
        apiClient.get<UserData[]>('/users'),
      ]);
      setTickets(ticketRes.data);
      setUsers(usersRes.data);
      setTechnicians(usersRes.data.filter((user) => user.role === 'TECHNICIAN' && !user.disabled));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const [searchParams] = useSearchParams();
  const highlightedTicketRef = useRef<string | null>(null);

  // Deep-linking logic
  useEffect(() => {
    const targetId = searchParams.get('id');
    if (targetId && !isLoading && tickets.length > 0) {
      const element = document.getElementById(`ticket-${targetId}`);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          highlightedTicketRef.current = targetId;
          element.classList.add('highlight-pulse');
          setTimeout(() => {
            element.classList.remove('highlight-pulse');
            highlightedTicketRef.current = null;
          }, 4000);
        }, 100);
      }
    }
  }, [searchParams, isLoading, tickets]);

  const getUserLabel = (user?: UserData) => {
    const displayName = user?.displayName?.trim();
    if (displayName) return displayName;
    const email = user?.email?.trim();
    return email || 'Unknown User';
  };

  const getRequesterLabel = (ticket: MaintenanceTicket) => {
    const requestedUser = users.find((item) => item.uid === ticket.userId);
    if (requestedUser) {
      return getUserLabel(requestedUser);
    }

    const fallbackName = ticket.userDisplayName?.trim();
    if (fallbackName) return fallbackName;

    const fallbackEmail = ticket.userEmail?.trim();
    if (fallbackEmail) return fallbackEmail;

    return ticket.userId;
  };

  const getAssignedStaffLabel = (ticket: MaintenanceTicket) => {
    const assignedById = ticket.assignedTechnicianId
      ? users.find((item) => item.uid === ticket.assignedTechnicianId)
      : undefined;

    if (assignedById) {
      return getUserLabel(assignedById);
    }

    const assignedByEmail = ticket.assignedTechnicianEmail
      ? users.find((item) => item.email === ticket.assignedTechnicianEmail)
      : undefined;

    if (assignedByEmail) {
      return getUserLabel(assignedByEmail);
    }

    const fallbackName = ticket.assignedTechnicianName?.trim();
    if (fallbackName) return fallbackName;

    const fallbackEmail = ticket.assignedTechnicianEmail?.trim();
    if (fallbackEmail) return fallbackEmail;

    return 'Awaiting Assignment';
  };

  const handleAssignTechnician = async (ticket: MaintenanceTicket, event: FormEvent) => {
    event.preventDefault();
    const ticketId = ticket.id;
    if (!ticketId) return;

    const technicianId = selectedTechByTicket[ticketId];
    if (!technicianId) {
      toast.error('Please select a technician');
      return;
    }

    const selectedTechnician = technicians.find((user) => user.uid === technicianId);
    if (!selectedTechnician) {
      toast.error('Selected technician is not available');
      return;
    }

    try {
      setActionTicketId(ticketId);
      const response = await apiClient.patch<MaintenanceTicket>(`/tickets/${ticketId}/assign`, {
        technicianId: selectedTechnician.uid,
        technicianEmail: selectedTechnician.email,
      });
      setTickets((prev) => prev.map((item) => (item.id === ticketId ? response.data : item)));
      toast.success('Technician assigned successfully');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setActionTicketId(null);
    }
  };

  const handleStatusChange = async (ticketId: string, status: TicketStatusOption) => {
    try {
      setActionTicketId(ticketId);
      const response = await apiClient.patch<MaintenanceTicket>(`/tickets/${ticketId}/status`, { status });
      setTickets((prev) => prev.map((item) => (item.id === ticketId ? response.data : item)));
      toast.success(`Status updated to ${status}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setActionTicketId(null);
    }
  };

  const handleTicketUpdate = (updatedTicket: MaintenanceTicket) => {
    setTickets((prev) => prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t)));
  };

  const handleRejectTicket = async (ticketId: string, currentStatus: TicketDisplayStatus, reason: string = '') => {
    if (currentStatus !== 'OPEN') {
      toast.error('Only OPEN tickets can be rejected.');
      return;
    }

    if (!reason) {
      setPromptConfig({ ticketId, currentStatus });
      setShowPrompt(true);
      return;
    }

    try {
      setActionTicketId(ticketId);
      const response = await apiClient.patch<MaintenanceTicket>(`/tickets/${ticketId}/status`, {
        status: 'REJECTED',
        reason: reason.trim(),
      });
      setTickets((prev) => prev.map((item) => (item.id === ticketId ? response.data : item)));
      toast.success('Ticket rejected');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setActionTicketId(null);
    }
  };

  return (
    <AppLayout activeTab="none">
      <div className="admin-card">
        <div className="card-header">
          <h3>Maintenance Ticket Management</h3>
          <p>Oversee campus-wide incidents, assign personnel, and monitor resolutions.</p>
        </div>


        <div className="ticket-filters-bar">
          <div className="status-filters">
            <button 
              className={`filter-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setStatusFilter('ALL')}
            >
              All Tickets
              <span className="filter-count">{tickets.length}</span>
            </button>
            {(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'] as const).map(status => (
              <button 
                key={status}
                className={`filter-btn ${statusFilter === status ? 'active' : ''}`}
                onClick={() => setStatusFilter(status)}
              >
                {status.replace('_', ' ')}
                <span className="filter-count">{ticketCountByStatus[status] || 0}</span>
              </button>
            ))}
          </div>

          <div className="search-and-priority">
            <div className="priority-filter-box">
              <select
                className="priority-filter-select"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | 'ALL')}
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
            <div className="tech-search-box">
              <input 
                type="text" 
                placeholder="Search description, location or requester..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div style={{ padding: '2rem' }}>
          {isLoading ? (
            <div className="loading-state">Accessing secure ticket database...</div>
          ) : tickets.length === 0 ? (
            <div className="empty-state">No tickets registered in the system.</div>
          ) : (
            <div className="admin-ticket-list">
              {filteredTickets.map((ticket) => {
                const ticketId = ticket.id!;
                const status = normalizeStatus(ticket.status);
                const priority = normalizePriority(ticket.priority);
                const isRejected = status === 'REJECTED';
                const isOpen = status === 'OPEN';

                return (
                  <article className="admin-ticket-card" key={ticketId} id={`ticket-${ticketId}`}>
                    <div className="admin-ticket-card-head">
                      <div className="ticket-title-group">
                        <h3>{ticket.category} Issue</h3>
                        <div className="badge-row">
                          <span className={`status-pill status-${status.toLowerCase()}`}>{status}</span>
                          <span className={`priority-pill priority-${priority.toLowerCase()}`}>{priority}</span>
                        </div>
                      </div>
                      
                      {!isRejected && (
                        <div className="status-control">
                          <label>Update Status</label>
                          <select
                            className={`ticket-status-select`}
                            value={status}
                            onChange={(e) => handleStatusChange(ticketId, e.target.value as TicketStatusOption)}
                            disabled={actionTicketId === ticketId || status === 'CLOSED'}
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="admin-ticket-grid">
                      <div className="ticket-info-main">
                        <div className="info-row">
                          <div className="info-item">
                            <label>Requester</label>
                            <span>{getRequesterLabel(ticket)}</span>
                          </div>
                          <div className="info-item">
                            <label>Location</label>
                            <span>{ticket.resourceName || ticket.location}</span>
                          </div>
                        </div>
                        <div className="info-item full">
                          <label>Description</label>
                          <p>{ticket.description}</p>
                        </div>
                        <div className="info-item full">
                          <label>Assigned Staff</label>
                          <span style={{ color: ticket.assignedTechnicianEmail ? '#0f172a' : '#94a3b8', fontWeight: 600 }}>
                            {getAssignedStaffLabel(ticket)}
                          </span>
                        </div>
                      </div>

                      <div className="ticket-attachments-side">
                        <label>Attachments</label>
                        {ticket.attachments && ticket.attachments.length > 0 ? (
                          <div className="attachment-previews">
                            {ticket.attachments.map((img, i) => (
                              <div 
                                key={i} 
                                className="attachment-preview-wrapper"
                                onClick={() => setPreviewImage(img.dataUrl)}
                              >
                                <img src={img.dataUrl} alt="Incident" />
                                <div className="preview-overlay">Preview</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="no-attachments">No visual evidence provided</div>
                        )}
                      </div>
                    </div>

                    {ticket.resolutionNotes && (
                      <div className="resolution-notes-box">
                        <label><CheckCircle size={14} /> Resolution Notes</label>
                        <p>{ticket.resolutionNotes}</p>
                      </div>
                    )}

                    <CommentSection ticket={ticket} onUpdate={handleTicketUpdate} collapsible />

                    {isOpen && (
                      <div className="admin-ticket-actions">
                        <form className="assign-form" onSubmit={(e) => handleAssignTechnician(ticket, e)}>
                          <select
                            value={selectedTechByTicket[ticketId] || ''}
                            onChange={(e) => setSelectedTechByTicket(prev => ({ ...prev, [ticketId]: e.target.value }))}
                          >
                            <option value="">Select Technician</option>
                            {technicians.map(t => <option key={t.uid} value={t.uid}>{getUserLabel(t)}</option>)}
                          </select>
                          <button type="submit" disabled={!selectedTechByTicket[ticketId] || actionTicketId === ticketId}>
                            Assign Staff
                          </button>
                        </form>
                        <button className="reject-btn" onClick={() => handleRejectTicket(ticketId, status)}>
                          Reject Request
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {previewImage && (
        <ImagePreviewModal
          src={previewImage}
          onClose={() => setPreviewImage(null)}
          showDownload={true}
        />
      )}

      <PromptModal
        isOpen={showPrompt}
        title="Reject Ticket"
        message="Please provide a clear reason for rejecting this maintenance request. This will be visible to the reporter."
        placeholder="e.g. Duplicate request, or insufficient information provided."
        confirmLabel="Reject Request"
        required
        onConfirm={(reason) => {
          if (promptConfig) {
            handleRejectTicket(promptConfig.ticketId, promptConfig.currentStatus, reason);
          }
          setShowPrompt(false);
          setPromptConfig(null);
        }}
        onCancel={() => {
          setShowPrompt(false);
          setPromptConfig(null);
        }}
      />
    </AppLayout>
  );
};

export default AdminTickets;
