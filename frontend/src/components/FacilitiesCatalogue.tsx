import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createResource, deleteResource, getResources, updateResource } from '../api/resourceApi';
import type { Resource } from '../api/resourceApi';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, Filter, MapPin, Users, Clock, Trash2, Edit3, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import './FacilitiesCatalogue.css';

const LOCATIONS = ['Block A', 'Block B', 'Admin Block', 'AV Store'];
const STATUS_OPTIONS = ['ACTIVE', 'OUT_OF_SERVICE'];
const FACILITY_TYPES = ['Lecture Hall', 'Computer Lab', 'Science Lab', 'Meeting Room', 'Auditorium'];
const ASSET_TYPES = ['Projector', 'Camera', 'Laptop', 'Sound System', 'Router'];

const initialForm: Omit<Resource, 'id'> = {
  name: '',
  type: 'Lecture Hall',
  capacity: 0,
  location: 'Block A',
  availability: '08:00 - 18:00',
  status: 'ACTIVE',
};

interface FacilitiesCatalogueProps {
  mode?: 'facilities' | 'assets' | 'all';
}

const FacilitiesCatalogue: React.FC<FacilitiesCatalogueProps> = ({ mode = 'all' }) => {
  const { userRole } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchParams] = useSearchParams();
  const highlightedResourceRef = useRef<string | null>(null);
  
  const currentResourceTypes = mode === 'facilities' 
    ? ['All', ...FACILITY_TYPES] 
    : mode === 'assets' 
    ? ['All', ...ASSET_TYPES] 
    : ['All', ...FACILITY_TYPES, ...ASSET_TYPES];

  const [typeFilter, setTypeFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [minCapacity, setMinCapacity] = useState('');
  const [formData, setFormData] = useState<Omit<Resource, 'id'>>({
    ...initialForm,
    type: mode === 'assets' ? ASSET_TYPES[0] : FACILITY_TYPES[0]
  });
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const loadResources = async () => {
    setLoading(true);
    try {
      let typeParam = typeFilter !== 'All' ? typeFilter : '';
      
      const data = await getResources({
        search: searchTerm,
        type: typeParam,
        location: locationFilter !== 'All' ? locationFilter : '',
        minCapacity: minCapacity !== '' ? Number(minCapacity) : undefined,
      });

      // Client side filtering for Mode if typeParam is empty
      if (typeParam === '' && mode !== 'all') {
        const allowedTypes = mode === 'facilities' ? FACILITY_TYPES : ASSET_TYPES;
        setResources(data.filter((r: Resource) => allowedTypes.includes(r.type)));
      } else {
        setResources(data);
      }
    } catch (error: any) {
      toast.error(error.message || 'Unable to load resources', { position: 'bottom-right' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, [searchTerm, typeFilter, locationFilter, minCapacity]);

  // Deep-linking logic
  useEffect(() => {
    const targetId = searchParams.get('id');
    if (targetId && !loading && resources.length > 0) {
      const element = document.getElementById(`resource-${targetId}`);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          highlightedResourceRef.current = targetId;
          element.classList.add('highlight-pulse');
          setTimeout(() => {
            element.classList.remove('highlight-pulse');
            highlightedResourceRef.current = null;
          }, 4000);
        }, 100);
      }
    }
  }, [searchParams, loading, resources]);


  const statusClass = (status: string) =>
    status === 'ACTIVE' ? 'resource-status active' : 'resource-status out-of-service';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await createResource({
        ...formData,
        capacity: Number(formData.capacity),
      });
      setFormData(initialForm);
      setIsFormOpen(false);
      loadResources();
      toast.success('Resource created successfully.');
    } catch (error: any) {
      toast.error(error.message || 'Could not create resource');
    }
  };

  const handleDelete = async (resourceId: string) => {
    if (!window.confirm('Are you sure you want to delete this resource? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteResource(resourceId);
      loadResources();
      toast.success('Resource deleted successfully.');
    } catch (error: any) {
      toast.error(error.message || 'Delete failed');
    }
  };

  const handleStatusToggle = async (resource: Resource) => {
    const updated: Resource = {
      ...resource,
      status: resource.status === 'ACTIVE' ? 'OUT_OF_SERVICE' : 'ACTIVE',
    };
    try {
      await updateResource(resource.id!, updated);
      loadResources();
      toast.success(`Status updated for ${resource.name}.`, { position: 'bottom-right' });
    } catch (error: any) {
      toast.error(error.message || 'Unable to update status');
    }
  };

  return (
    <section className="facilities-catalogue">
      <div className="catalogue-header">
        <div>
          <h2>{mode === 'facilities' ? 'Facility Booking Management' : mode === 'assets' ? 'Asset & Resource Management' : 'Facilities & Assets Catalogue'}</h2>
          <p className="catalogue-description">
            {mode === 'facilities' 
              ? 'Manage infrastructure resources like lecture halls, labs, and meeting rooms.' 
              : mode === 'assets' 
              ? 'Manage portable equipment inventory like projectors, cameras, and laptops.' 
              : 'Browse and manage all campus resources and equipment.'}
          </p>
        </div>
        {userRole === 'ADMIN' && (
          <button className="add-resource-btn" onClick={() => setIsFormOpen(!isFormOpen)}>
            {isFormOpen ? 'Close Form' : <><Plus size={18} /> Add New Resource</>}
          </button>
        )}
      </div>

      <div className="catalogue-filters">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search resources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <Filter size={16} />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            {currentResourceTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
            {['All', ...LOCATIONS].map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>

          {mode !== 'assets' && (
            <input
              type="number"
              min="0"
              placeholder="Min Cap"
              value={minCapacity}
              onChange={(e) => setMinCapacity(e.target.value)}
            />
          )}
        </div>
      </div>

      <div className="catalogue-summary">
        Displaying <strong>{resources.length}</strong> {mode === 'all' ? 'resources' : mode}
      </div>

      <div className="catalogue-grid">
        {loading && resources.length === 0 ? (
          <div className="loading-container">
            <Loader2 className="spinner" size={40} />
            <p>Fetching {mode} catalogues...</p>
          </div>
        ) : (
          resources.map((resource) => (
            <article key={resource.id} id={`resource-${resource.id}`} className="resource-card glass">
              <div className="resource-card-header">
                <div>
                  <span className="type-tag">{resource.type}</span>
                  <h3>{resource.name}</h3>
                </div>
                <div className={statusClass(resource.status)}>
                  {resource.status === 'ACTIVE' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                  {resource.status.replace('_', ' ')}
                </div>
              </div>
              
              <div className="resource-details">
                <div className="detail-item">
                  <MapPin size={16} />
                  <span>{resource.location}</span>
                </div>
                {resource.capacity > 0 && (
                  <div className="detail-item">
                    <Users size={16} />
                    <span>Capacity: {resource.capacity}</span>
                  </div>
                )}
                <div className="detail-item">
                  <Clock size={16} />
                  <span>{resource.availability}</span>
                </div>
              </div>

              {userRole === 'ADMIN' && (
                <div className="resource-actions">
                  <button 
                    className="action-btn toggle" 
                    onClick={() => handleStatusToggle(resource)}
                    title="Toggle Operational Status"
                  >
                    <Edit3 size={16} /> Toggle Status
                  </button>
                  <button 
                    className="action-btn delete" 
                    onClick={() => handleDelete(resource.id!)}
                    title="Remove Resource"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </article>
          ))
        )}
      </div>

      {isFormOpen && (
        <div className="form-overlay active">
          <section className="resource-form-section glass">
            <div className="form-header">
              <h3>Register {mode === 'assets' ? 'Equipment/Resource' : 'Campus Facility'}</h3>
              <button className="close-btn" onClick={() => setIsFormOpen(false)}>&times;</button>
            </div>
            <form className="resource-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-field">
                  <label>Resource Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={mode === 'assets' ? "e.g. Sony Alpha 7 IV" : "e.g. Hall A101"}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    {currentResourceTypes.slice(1).map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {mode !== 'assets' && (
                  <div className="form-field">
                    <label>Capacity</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                      required
                    />
                  </div>
                )}

                <div className="form-field">
                  <label>Location / Store</label>
                  <select
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  >
                    {LOCATIONS.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field full-width">
                  <label>Availability Hours</label>
                  <input
                    type="text"
                    value={formData.availability}
                    onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                    placeholder="e.g. 08:00 - 18:00"
                    required
                  />
                </div>

                <div className="form-field full-width">
                  <label>Operational Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-footer">
                <button type="submit" className="submit-btn">
                  Confirm Registration
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
};

export default FacilitiesCatalogue;
