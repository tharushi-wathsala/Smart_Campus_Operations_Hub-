import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { addTicketComment, deleteTicketComment, updateTicketComment } from '../services/ticketService';
import type { MaintenanceTicket } from '../types/ticket';
import './CommentSection.css';

interface CommentSectionProps {
  ticket: MaintenanceTicket;
  onUpdate: (updatedTicket: MaintenanceTicket) => void;
  collapsible?: boolean;
}

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString();
};

const CommentSection = ({ ticket, onUpdate, collapsible = false }: CommentSectionProps) => {
  const { currentUser, userRole } = useAuth();
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isExpanded, setIsExpanded] = useState(!collapsible);

  const totalComments = ticket.ticketMessages?.length || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    try {
      setIsSubmitting(true);
      const updatedTicket = await addTicketComment(ticket.id, {
        message: comment.trim(),
        senderEmail: currentUser?.email || 'Anonymous',
      });
      onUpdate(updatedTicket);
      setComment('');
      toast.success('Comment added');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (index: number, text: string) => {
    setEditingIndex(index);
    setEditingText(text);
  };

  const handleUpdate = async (index: number) => {
    if (!editingText.trim()) return;

    try {
      setIsSubmitting(true);
      const updatedTicket = await updateTicketComment(ticket.id, index, {
        message: editingText.trim(),
      });
      onUpdate(updatedTicket);
      setEditingIndex(null);
      toast.success('Comment updated');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (index: number) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      const updatedTicket = await deleteTicketComment(ticket.id, index);
      onUpdate(updatedTicket);
      toast.success('Comment deleted');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete comment');
    }
  };

  return (
    <div className="comment-section">
      {collapsible ? (
        <button
          type="button"
          className="comments-toggle-btn"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
        >
          <span>Comments ({totalComments})</span>
          <span>{isExpanded ? 'Hide' : 'Show'}</span>
        </button>
      ) : (
        <h4>Comments ({totalComments})</h4>
      )}

      {isExpanded && (
        <>
          <div className="comment-list">
            {ticket.ticketMessages?.map((msg, index) => {
              const isOwner = currentUser?.uid === msg.senderId;
              const isEditing = editingIndex === index;

              return (
                <div key={`${msg.createdAt}-${index}`} className={`comment-item ${isOwner ? 'own-comment' : ''}`}>
                  <div className="comment-header">
                    <span className="comment-author">{msg.senderEmail || 'Unknown'}</span>
                    <span className="comment-role-tag">{msg.senderRole}</span>
                    <span className="comment-date">{formatDate(msg.createdAt)}</span>
                  </div>

                  <div className="comment-body">
                    {isEditing ? (
                      <div className="edit-comment-form">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                        />
                        <div className="edit-actions">
                          <button onClick={() => handleUpdate(index)} disabled={isSubmitting}>Save</button>
                          <button onClick={() => setEditingIndex(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <p>{msg.message}</p>
                    )}

                    {msg.imageDataUrl && (
                      <div className="comment-attachment">
                        <img src={msg.imageDataUrl} alt="Attachment" />
                      </div>
                    )}
                  </div>

                  {!isEditing && (isOwner || userRole === 'ADMIN') && (
                    <div className="comment-actions">
                      {isOwner && <button onClick={() => handleEdit(index, msg.message || '')}>Edit</button>}
                      <button onClick={() => handleDelete(index)} className="delete-btn">Delete</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {ticket.status !== 'CLOSED' && ticket.status !== 'REJECTED' && (
            <form onSubmit={handleSubmit} className="comment-form">
              <textarea
                placeholder="Add a comment or update..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={isSubmitting}
              />
              <button type="submit" disabled={isSubmitting || !comment.trim()}>
                {isSubmitting ? 'Posting...' : 'Post Comment'}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
};

export default CommentSection;
