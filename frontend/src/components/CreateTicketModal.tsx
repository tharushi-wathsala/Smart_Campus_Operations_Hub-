import React, { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { createTicket, getResources, updateMyTicket } from '../services/ticketService';
import { compressImage } from '../utils/imageUtils';
import type { CreateTicketPayload, Resource, TicketAttachment, MaintenanceTicket } from '../types/ticket';
import { X, Upload, MapPin, Box } from 'lucide-react';
import ImagePreviewModal from './ImagePreviewModal';
import './CreateTicketModal.css';

interface CreateTicketModalProps {
  onClose: () => void;
  onCreated: (ticket: any) => void;
  editingTicket?: MaintenanceTicket;
}

const CATEGORY_OPTIONS = ['ELECTRICAL', 'PLUMBING', 'CLEANING', 'IT_SUPPORT', 'FURNITURE', 'SECURITY', 'OTHER'];
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const MAX_ATTACHMENTS = 3;
const INVENTORY_ASSET_TYPES = ['Projector', 'Camera', 'Laptop', 'Sound System', 'Router'];
type ContactMethod = 'EMAIL' | 'PHONE_NUMBER';

const normalizeContactMethod = (method?: string): ContactMethod => {
  const normalized = method?.trim().toUpperCase();
  if (normalized === 'PHONE' || normalized === 'PHONE_NUMBER') {
    return 'PHONE_NUMBER';
  }
  return 'EMAIL';
};

const CreateTicketModal: React.FC<CreateTicketModalProps> = ({ onClose, onCreated, editingTicket }) => {
  const { currentUser } = useAuth();
  const defaultContactMethod = normalizeContactMethod(editingTicket?.preferredContactMethod);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<'RESOURCE' | 'LOCATION'>(editingTicket?.resourceId ? 'RESOURCE' : 'LOCATION');

  const [formData, setFormData] = useState<CreateTicketPayload>({
    resourceId: editingTicket?.resourceId || '',
    resourceName: editingTicket?.resourceName || '',
    location: editingTicket?.location || '',
    category: editingTicket?.category || 'ELECTRICAL',
    description: editingTicket?.description || '',
    priority: editingTicket?.priority || 'MEDIUM',
    preferredContactDetails:
      editingTicket?.preferredContactDetails || (defaultContactMethod === 'EMAIL' ? currentUser?.email || '' : ''),
    preferredContactMethod: defaultContactMethod,
    attachments: editingTicket?.attachments || [],
  });

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    const loadResources = async () => {
      try {
        const data = await getResources();
        // Only show active inventory assets for incident reporting.
        setResources(
          data.filter(
            (r: Resource) => r.status === 'ACTIVE' && INVENTORY_ASSET_TYPES.includes(r.type),
          ),
        );
      } catch (error) {
        toast.error('Failed to load campus resources');
      }
    };
    loadResources();
  }, []);

  useEffect(() => {
    if (
      !editingTicket
      && formData.preferredContactMethod === 'EMAIL'
      && !formData.preferredContactDetails
      && currentUser?.email
    ) {
      setFormData(prev => ({ ...prev, preferredContactDetails: currentUser.email || '' }));
    }
  }, [editingTicket, formData.preferredContactMethod, formData.preferredContactDetails, currentUser?.email]);

  const handleResourceChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const resId = e.target.value;
    const res = resources.find(r => r.id === resId);
    if (res) {
      setFormData(prev => ({
        ...prev,
        resourceId: res.id,
        resourceName: res.name,
      }));
    } else {
      setFormData(prev => ({ ...prev, resourceId: '', resourceName: '' }));
    }
  };

  const handleModeChange = (nextMode: 'RESOURCE' | 'LOCATION') => {
    setMode(nextMode);
    if (nextMode === 'RESOURCE') {
      setFormData(prev => ({
        ...prev,
        location: '',
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      resourceId: '',
      resourceName: '',
    }));
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    if (formData.attachments.length + files.length > MAX_ATTACHMENTS) {
      toast.error(`Maximum ${MAX_ATTACHMENTS} images allowed`);
      return;
    }

    const newAttachments: TicketAttachment[] = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
            // Compress image to max 800px with higher compression (0.6) to fit 1MB limit
            const dataUrl = await compressImage(file, 800, 0.6);
            
            newAttachments.push({
                fileName: file.name,
                contentType: 'image/jpeg',
                dataUrl
            });
        } catch (error) {
            console.error('Failed to compress image:', error);
            toast.error(`Failed to process ${file.name}`);
        }
    }

    setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...newAttachments]
    }));
  };

  const removeAttachment = (index: number) => {
    setFormData(prev => ({
        ...prev,
        attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const handleContactMethodChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const selectedMethod = e.target.value as ContactMethod;
    setFormData(prev => ({
      ...prev,
      preferredContactMethod: selectedMethod,
      preferredContactDetails: selectedMethod === 'EMAIL' ? currentUser?.email || '' : '',
    }));
  };

  const handleContactDetailsChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    if (formData.preferredContactMethod === 'PHONE_NUMBER') {
      const digitsOnly = rawValue.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({ ...prev, preferredContactDetails: digitsOnly }));
      return;
    }

    setFormData(prev => ({ ...prev, preferredContactDetails: rawValue }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedLocation = formData.location.trim();
    const locationFromAsset = formData.resourceName?.trim() || '';

    if (mode === 'RESOURCE' && !formData.resourceId) {
      toast.error('Please select a resource');
      return;
    }
    if (mode === 'LOCATION' && !trimmedLocation) {
      toast.error('Please specify a location');
      return;
    }
    if (!formData.description) {
      toast.error('Please describe the issue');
      return;
    }
    if (!formData.preferredContactDetails.trim()) {
      toast.error(
        formData.preferredContactMethod === 'PHONE_NUMBER'
          ? 'Please enter your phone number'
          : 'Please provide your email address',
      );
      return;
    }

    if (
      formData.preferredContactMethod === 'PHONE_NUMBER'
      && !/^\d{10}$/.test(formData.preferredContactDetails.trim())
    ) {
      toast.error('Phone number must contain exactly 10 digits');
      return;
    }

    const resolvedLocation = mode === 'RESOURCE' ? (trimmedLocation || locationFromAsset) : trimmedLocation;
    if (!resolvedLocation) {
      toast.error('Selected asset is missing location context. Please switch to General Location and provide it.');
      return;
    }

    const payload: CreateTicketPayload = {
      ...formData,
      resourceId: mode === 'RESOURCE' ? formData.resourceId : undefined,
      resourceName: mode === 'RESOURCE' ? formData.resourceName : undefined,
      location: resolvedLocation,
    };

    try {
      setIsSubmitting(true);
      let ticket;
      if (editingTicket) {
        ticket = await updateMyTicket(editingTicket.id, payload);
        toast.success('Incident report updated successfully');
      } else {
        ticket = await createTicket(payload);
        toast.success('Incident reported successfully');
      }
      onCreated(ticket);
    } catch (error: any) {
      console.error("[CreateTicketModal] Full Submission Error:", error);
      const detailedMsg = error.response?.data?.message || error.message || 'Failed to process ticket';
      toast.error(`Error (${error.response?.status || 'Unknown'}): ${detailedMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="audit-modal-overlay">
      <div className="audit-modal-content">
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>{editingTicket ? 'Edit Incident Report' : 'Report New Incident'}</h2>
            <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                {editingTicket ? 'Update the details of your maintenance issue.' : 'Provide details about the maintenance issue.'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.5rem', borderRadius: '50%' }}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="create-ticket-tabs">
            <button 
                type="button"
                className={`tab-btn ${mode === 'RESOURCE' ? 'active' : ''}`}
              onClick={() => handleModeChange('RESOURCE')}
            >
                <Box size={18} /> Specific Asset
            </button>
            <button 
                type="button"
                className={`tab-btn ${mode === 'LOCATION' ? 'active' : ''}`}
              onClick={() => handleModeChange('LOCATION')}
            >
                <MapPin size={18} /> General Location
            </button>
          </div>

          <div className="form-grid">
             {mode === 'RESOURCE' ? (
                 <section className="form-section">
                    <label className="preview-label">Campus Asset</label>
                    <select 
                        className="form-select"
                        value={formData.resourceId}
                        onChange={handleResourceChange}
                    >
                      <option value="">Select Inventory Asset</option>
                        {resources.map(r => <option key={r.id} value={r.id}>{r.name} ({r.type})</option>)}
                    </select>
                 </section>
             ) : (
                 <section className="form-section">
                    <label className="preview-label">Location</label>
                    <input 
                        type="text"
                        className="form-input"
                        placeholder="e.g. Library 2nd Floor"
                        value={formData.location}
                        onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    />
                 </section>
             )}

             <section className="form-section">
                <label className="preview-label">Category</label>
                <select 
                    className="form-select"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                >
                    {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                </select>
             </section>
          </div>

          <div className="form-section" style={{ marginBottom: '1.5rem' }}>
            <label className="preview-label">Issue Description</label>
            <textarea 
                className="form-textarea"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the issue in detail..."
                style={{ minHeight: '100px' }}
            />
          </div>

              <div className="form-grid">
               <section className="form-section">
                <label className="preview-label">Preferred Contact Type</label>
                <select
                  className="form-select"
                  value={formData.preferredContactMethod || 'EMAIL'}
                  onChange={handleContactMethodChange}
                >
                  <option value="EMAIL">Email</option>
                  <option value="PHONE_NUMBER">Phone Number</option>
                </select>
               </section>

               <section className="form-section">
                <label className="preview-label">Contact Details</label>
                <input
                  type={formData.preferredContactMethod === 'PHONE_NUMBER' ? 'tel' : 'email'}
                  className="form-input"
                  inputMode={formData.preferredContactMethod === 'PHONE_NUMBER' ? 'numeric' : undefined}
                  maxLength={formData.preferredContactMethod === 'PHONE_NUMBER' ? 10 : undefined}
                  pattern={formData.preferredContactMethod === 'PHONE_NUMBER' ? '[0-9]{10}' : undefined}
                  placeholder={
                    formData.preferredContactMethod === 'PHONE_NUMBER'
                    ? 'Enter your phone number'
                    : 'Enter your email address'
                  }
                  value={formData.preferredContactDetails}
                  onChange={handleContactDetailsChange}
                />
               </section>
              </div>

          <div className="form-grid">
             <section className="form-section">
                <label className="preview-label">Priority Level</label>
                <div className="priority-selector">
                    {PRIORITY_OPTIONS.map(p => (
                        <label key={p} className="priority-option">
                            <input 
                                type="radio" 
                                name="priority" 
                                checked={formData.priority === p}
                                onChange={() => setFormData(prev => ({ ...prev, priority: p }))}
                            />
                            <div className="priority-card">{p}</div>
                        </label>
                    ))}
                </div>
             </section>

             <section className="form-section">
                <label className="preview-label">Upload Evidence (Max 3)</label>
                <label className="upload-zone">
                    <Upload size={20} />
                    <span>Select Images</span>
                    <input type="file" multiple accept="image/*" hidden onChange={handleFileChange} />
                </label>
                <div className="attachment-preview-strip">
                    {formData.attachments.map((a, i) => (
                        <div 
                          key={i} 
                          className="attachment-thumbnail-wrapper"
                        >
                          <img 
                            src={a.dataUrl} 
                            alt="preview" 
                            className="attachment-thumbnail" 
                            onClick={() => setPreviewImage(a.dataUrl)}
                          />
                          <div className="thumb-actions">
                             <button 
                                type="button" 
                                className="remove-thumb-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeAttachment(i);
                                }}
                             >
                                <X size={12} />
                             </button>
                          </div>
                          <div className="thumb-overlay" onClick={() => setPreviewImage(a.dataUrl)}>View</div>
                        </div>
                    ))}
                </div>
             </section>
          </div>

          <button 
            type="submit" 
            className="submit-btn" 
            disabled={isSubmitting}
          >
            {isSubmitting ? (editingTicket ? 'UPDATING...' : 'REPORTING INCIDENT...') : (editingTicket ? 'UPDATE INCIDENT REPORT' : 'SUBMIT INCIDENT REPORT')}
          </button>
        </form>
      </div>

      {previewImage && (
        <ImagePreviewModal
          src={previewImage}
          onClose={() => setPreviewImage(null)}
          showDownload={false}
        />
      )}
    </div>
  );
};

export default CreateTicketModal;
