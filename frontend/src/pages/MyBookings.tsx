import { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardList, 
  Calendar, 
  Clock, 
  Activity, 
  FileText, 
  MessageCircle, 
  AlertCircle, 
  Users, 
  Hash, 
  User as UserIcon,
  X,
  Trash2,
  Edit3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/apiClient';
import AppLayout from '../components/AppLayout';
import { toast } from 'react-hot-toast';
import './AdminTickets.css'; // Reusing some shared dashboard styles

interface BookingRecord {
  id: string;
  userId: string;
  requesterUid: string;
  bookingResource: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  noOfAttendees: number;
  status: string;
  hiddenByUser: boolean;
  adminReason?: string;
}

const MyBookings = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [detailBooking, setDetailBooking] = useState<BookingRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchBookings = async () => {
    if (!currentUser?.email) return;
    try {
      setIsLoading(true);
      const response = await apiClient.get(`/booking/user/${currentUser.email}`);
      const data: BookingRecord[] = response.data || [];
      setBookings(data.filter((b) => !b.hiddenByUser));
    } catch (err) {
      console.error("Failed to fetch booking history", err);
      toast.error("Failed to synchronize booking records");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [currentUser]);

  const bookingCounts = useMemo(() => {
    return bookings.reduce((acc, b) => {
      const status = b.status?.toUpperCase() || 'PENDING';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const status = b.status?.toUpperCase() || 'PENDING';
      const matchesStatus = statusFilter === 'ALL' || status === statusFilter;
      
      const resName = b.bookingResource || '';
      const purpose = b.purpose || '';
      const searchStr = `${resName} ${purpose}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
      
      return matchesStatus && matchesSearch;
    });
  }, [bookings, statusFilter, searchTerm]);

  const handleDeleteBooking = async (id: string) => {
    if (!window.confirm("Are you sure you want to cancel this booking request?")) return;
    try {
      await apiClient.delete(`/booking/${id}`);
      setBookings(prev => prev.filter(b => b.id !== id));
      toast.success("Booking request cancelled");
    } catch (err) {
      toast.error("Failed to delete booking");
    }
  };

  const handleEditBooking = (booking: BookingRecord) => {
    const facilityTypes = ['Lecture Hall', 'Computer Lab', 'Science Lab', 'Meeting Room', 'Auditorium'];
    const isFacility = booking.noOfAttendees > 1 || facilityTypes.some(t => booking.bookingResource?.includes(t));
    
    navigate(isFacility ? '/book-facility' : '/book-asset', { 
      state: { editingBooking: booking } 
    });
  };

  const BookingDetailModal = ({ booking, onClose }: { booking: BookingRecord, onClose: () => void }) => {
    if (!booking) return null;

    const bookingType = (booking.noOfAttendees > 1) ? 'Facilities' : 'Assets';

    return (
      <div className="booking-modal-overlay" onClick={onClose} style={{ zIndex: 3000 }}>
        <div className="booking-modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-inner-header">
            <div className="modal-title-area">
              <div className="detail-label" style={{ marginBottom: '0.25rem' }}>
                {bookingType} Request
              </div>
              <h2>{booking.bookingResource}</h2>
            </div>
            <button className="modal-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className="modal-body">
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label"><Calendar size={14} /> Date</span>
                <span className="detail-value">{booking.date}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label"><Clock size={14} /> Time Window</span>
                <span className="detail-value">{booking.startTime} - {booking.endTime}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label"><Activity size={14} /> Status</span>
                <span className={`status-pill status-${booking.status?.toLowerCase()}`} style={{ alignSelf: 'flex-start' }}>
                  {booking.status}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label"><Users size={14} /> Capacity / Qty</span>
                <span className="detail-value">{booking.noOfAttendees} {bookingType === 'Facilities' ? 'Attendees' : 'Units'}</span>
              </div>
              <div className="detail-item full-width">
                <span className="detail-label"><FileText size={14} /> Purpose</span>
                <span className="detail-value">{booking.purpose}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label"><UserIcon size={14} /> Requester ID</span>
                <span className="detail-value" style={{ fontSize: '0.8rem' }}>{booking.userId}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label"><Hash size={14} /> System ID</span>
                <span className="detail-value" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{booking.id}</span>
              </div>
            </div>

            {(booking.adminReason || booking.status !== 'PENDING') && (
              <div className="modal-system-response">
                <div className="response-header">
                  <MessageCircle size={14} />
                  <span>Administrative Response</span>
                </div>
                <p className="response-text">
                  {booking.adminReason || (booking.status === 'APPROVED' ? 'Your request has been officially approved. Please carry a digital copy of this receipt.' : 'Request is currently undergoing departmental review.')}
                </p>
              </div>
            )}
            
            {booking.status === 'PENDING' && (
              <div className="modal-footer-info" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.8rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px' }}>
                <AlertCircle size={14} />
                <span>You can still modify or withdraw this request.</span>
              </div>
            )}
          </div>

          <div className="modal-footer-actions">
            <button className="modal-action-btn delete" onClick={() => { handleDeleteBooking(booking.id); onClose(); }}>
              <Trash2 size={16} /> Delete Record
            </button>
            {booking.status === 'PENDING' && (
              <button className="modal-action-btn edit" onClick={() => handleEditBooking(booking)}>
                <Edit3 size={16} /> Edit Request
              </button>
            )}
            <button className="admin-submit-btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppLayout activeTab="none">
      <div className="portal-container animate-fade-in">
        <div className="portal-header">
          <div className="header-text">
            <h1 className="gradient-text">Booking Registry</h1>
            <p>Your centralized historical log for all venue and asset allocations.</p>
          </div>
        </div>

        <div className="portal-content" style={{ marginTop: '2rem' }}>
          <div className="ticket-filters-bar">
            <div className="status-filters">
              <button 
                className={`filter-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setStatusFilter('ALL')}
              >
                All Records
                <span className="filter-count">{bookings.length}</span>
              </button>
              {['PENDING', 'APPROVED', 'REJECTED'].map(status => (
                <button 
                  key={status}
                  className={`filter-btn ${statusFilter === status ? 'active' : ''}`}
                  onClick={() => setStatusFilter(status)}
                >
                  {status}
                  <span className="filter-count">{bookingCounts[status] || 0}</span>
                </button>
              ))}
            </div>

            <div className="search-and-priority">
              <div className="tech-search-box">
                <input 
                  type="text" 
                  placeholder="Search resource or purpose..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="admin-card luxe-card" style={{ marginTop: '1.5rem', border: 'none' }}>
            {isLoading ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                Synchronizing records...
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="admin-empty-state" style={{ padding: '6rem 2rem' }}>
                <ClipboardList size={48} style={{ opacity: 0.1, marginBottom: '1.5rem' }} />
                <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>
                  {searchTerm || statusFilter !== 'ALL' ? 'No matching records found.' : 'No historical booking records found in your account.'}
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="users-table admin-style-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Allocated Resource</th>
                      <th>Interval</th>
                      <th>Status</th>
                      <th>Note</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...filteredBookings].reverse().map((b) => (
                      <tr 
                        key={b.id} 
                        className="clickable-row"
                        onClick={() => setDetailBooking(b)}
                      >
                        <td className="mono">{b.date}</td>
                        <td style={{ fontWeight: 700 }}>{b.bookingResource}</td>
                        <td className="mono" style={{ fontSize: '0.8rem' }}>{b.startTime} - {b.endTime}</td>
                        <td>
                          <span className={`status-pill status-${b.status?.toLowerCase()}`}>
                            {b.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {b.adminReason || (b.status === 'PENDING' ? 'Processing...' : '-')}
                        </td>
                        <td>
                          <div className="registry-actions">
                            {b.status === 'PENDING' && (
                              <button 
                                className="action-icon-btn" 
                                onClick={(e) => { e.stopPropagation(); handleEditBooking(b); }}
                                title="Edit"
                              >
                                <Edit3 size={16} />
                              </button>
                            )}
                            <button 
                              className="action-icon-btn delete" 
                              onClick={(e) => { e.stopPropagation(); handleDeleteBooking(b.id); }}
                              title="Delete"
                              style={{ color: '#ef4444' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {detailBooking && (
        <BookingDetailModal 
          booking={detailBooking} 
          onClose={() => setDetailBooking(null)} 
        />
      )}
    </AppLayout>
  );
};

export default MyBookings;
