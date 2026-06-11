import { useEffect, useState, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { getAssignedTechnicianTickets, updateTicketStatusByTechnician } from '../services/ticketService';
import type { MaintenanceTicket } from '../types/ticket';
import CommentSection from '../components/CommentSection';
import AppLayout from '../components/AppLayout';
import ImagePreviewModal from '../components/ImagePreviewModal';
import PromptModal from '../components/PromptModal';
import './TechnicianTickets.css';
import './AdminDashboard.css';

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString();
};

const TechnicianTickets = () => {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const highlightedTicketRef = useRef<string | null>(null);
  
  // Prompt Modal State
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptConfig, setPromptConfig] = useState<{
    ticketId: string;
    status: string;
  } | null>(null);

  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const ticketCounts = useMemo(() => {
    return tickets.reduce((acc, ticket) => {
      const status = ticket.status || 'OPEN';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesStatus = statusFilter === 'ALL' || (ticket.status || 'OPEN') === statusFilter;
      const matchesPriority = priorityFilter === 'ALL' || (ticket.priority || 'LOW') === priorityFilter;
      
      const desc = ticket.description || '';
      const cat = ticket.category || '';
      const loc = ticket.resourceName || ticket.location || '';
      const searchStr = `${desc} ${cat} ${loc}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [tickets, statusFilter, priorityFilter, searchTerm]);

  const loadTickets = async () => {
    try {
      setIsLoading(true);
      const data = await getAssignedTechnicianTickets();
      setTickets(data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load assigned tickets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

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
          // Remove highlight after animation
          setTimeout(() => {
            element.classList.remove('highlight-pulse');
            highlightedTicketRef.current = null;
          }, 4000);
        }, 100);
      }
    }
  }, [searchParams, isLoading, tickets]);

  const handleUpdateStatus = async (ticketId: string, status: string, resolutionNotes: string = '') => {
    if (status === 'RESOLVED' && !resolutionNotes) {
      setPromptConfig({ ticketId, status });
      setShowPrompt(true);
      return;
    }

    try {
      setUpdatingTicketId(ticketId);
      const updatedTicket = await updateTicketStatusByTechnician(ticketId, {
        status,
        resolutionNotes,
      });
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updatedTicket : t)));
      toast.success(`Ticket status updated to ${status}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingTicketId(null);
    }
  };

  const handleTicketUpdate = (updatedTicket: MaintenanceTicket) => {
    setTickets((prev) => prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t)));
  };

  return (
    <AppLayout activeTab="none">
      <div className="admin-card">
        <div className="card-header">
          <h3>Technician Workspace</h3>
          <p>Manage your assigned maintenance tasks and communicate with users.</p>
        </div>

        <div className="ticket-filters-bar">
          <div className="status-filters">
            <button 
              className={`filter-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setStatusFilter('ALL')}
            >
              All Assignments
              <span className="filter-count">{tickets.length}</span>
            </button>
            {['IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(status => (
              <button 
                key={status}
                className={`filter-btn ${statusFilter === status ? 'active' : ''}`}
                onClick={() => setStatusFilter(status)}
              >
                {status.replace('_', ' ')}
                <span className="filter-count">{ticketCounts[status] || 0}</span>
              </button>
            ))}
          </div>

          <div className="search-and-priority">
            <div className="tech-search-box">
              <input 
                type="text" 
                placeholder="Search description or location..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="priority-select-filter"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="HIGH">High Priority</option>
              <option value="URGENT">Urgent Priority</option>
            </select>
          </div>
        </div>

        <div style={{ padding: '2rem' }}>
          {isLoading ? (
            <div className="loading-state">Accessing maintenance queue...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="empty-state">
              {searchTerm || statusFilter !== 'ALL' || priorityFilter !== 'ALL' 
                ? 'No tickets match your search filters.' 
                : 'No tickets assigned to you at the moment.'}
            </div>
          ) : (
            <div className="ticket-list">
              {filteredTickets.map((ticket) => (
                <article key={ticket.id} id={`ticket-${ticket.id}`} className="admin-ticket-card">
                  <div className="admin-ticket-card-head">
                    <div className="ticket-title-group">
                      <h3>{ticket.category} Issue</h3>
                      <div className="badge-row">
                        <span className={`status-pill status-${(ticket.status || 'OPEN').toLowerCase()}`}>{ticket.status || 'OPEN'}</span>
                        <span className={`priority-pill priority-${(ticket.priority || 'LOW').toLowerCase()}`}>{ticket.priority || 'LOW'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="admin-ticket-grid">
                    <div className="ticket-info-main">
                      <div className="info-row">
                        <div className="info-item">
                          <label>Assigned On</label>
                          <span>{formatDate(ticket.createdAt)}</span>
                        </div>
                        <div className="info-item">
                          <label>Location / Asset</label>
                          <span>{ticket.resourceName || ticket.location}</span>
                        </div>
                      </div>
                      <div className="info-item full">
                        <label>Reported Issue</label>
                        <p>{ticket.description}</p>
                      </div>
                      <div className="info-item full">
                        <label>Requester Context</label>
                        <span style={{ color: '#0f172a', fontWeight: 600 }}>
                          {ticket.preferredContactMethod || 'ANY'} - {ticket.preferredContactDetails}
                        </span>
                      </div>
                    </div>

                    <div className="ticket-attachments-side">
                      <label>Incident Evidence</label>
                      {ticket.attachments && ticket.attachments.length > 0 ? (
                        <div className="attachment-previews">
                          {ticket.attachments.map((img, i) => (
                            <div 
                              key={i} 
                              className="attachment-preview-wrapper"
                              onClick={() => setPreviewImage(img.dataUrl)}
                            >
                              <img src={img.dataUrl} alt="Evidence" />
                              <div className="preview-overlay">Preview</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="no-attachments">No images attached</div>
                      )}
                    </div>
                  </div>

                  <div className="technician-status-actions" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
                    {ticket.status === 'OPEN' && (
                      <button 
                        className="status-action-btn"
                        onClick={() => handleUpdateStatus(ticket.id, 'IN_PROGRESS')}
                        disabled={updatingTicketId === ticket.id}
                        style={{ background: '#3b82f6' }}
                      >
                        Start Working
                      </button>
                    )}
                    {ticket.status === 'IN_PROGRESS' && (
                      <button 
                        className="status-action-btn resolve-action"
                        onClick={() => handleUpdateStatus(ticket.id, 'RESOLVED')}
                        disabled={updatingTicketId === ticket.id}
                        style={{ background: '#10b981' }}
                      >
                        Complete & Resolve
                      </button>
                    )}
                    {(ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') && (
                      <button 
                        className="status-action-btn"
                        onClick={() => handleUpdateStatus(ticket.id, 'IN_PROGRESS')}
                        disabled={updatingTicketId === ticket.id}
                        style={{ background: '#64748b' }}
                      >
                        Re-open Assignment
                      </button>
                    )}
                  </div>

                  {ticket.resolutionNotes && (
                    <div className="resolution-notes-box">
                      <label>Your Resolution Summary</label>
                      <p>{ticket.resolutionNotes}</p>
                    </div>
                  )}

                  <CommentSection ticket={ticket} onUpdate={handleTicketUpdate} collapsible />
                </article>
              ))}
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
        title="Resolve Ticket"
        message="Please provide a summary of the work done to resolve this issue. This will be shared with the reporter."
        placeholder="e.g. Cleared the blockage in the 2nd floor pipe and verified flow."
        confirmLabel="Resolve Ticket"
        required
        onConfirm={(notes) => {
          if (promptConfig) {
            handleUpdateStatus(promptConfig.ticketId, promptConfig.status, notes);
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

export default TechnicianTickets;
