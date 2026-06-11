import React, { useState, useEffect } from "react";
import {
  Clock,
  Sun,
  Moon,
  ChevronUp,
  ChevronDown,
  Timer,
  X
} from "lucide-react";
import "./Booking_Form.css";
import { useAuth } from "../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import AppLayout from "./AppLayout";
import apiClient from "../api/apiClient";
import { toast } from "react-hot-toast";

interface BookingFormProps {
  mode: 'facilities' | 'assets';
}

function BookingForm({ mode }: BookingFormProps) {
  const { currentUser } = useAuth();
  const [date, setDate] = useState("");
  const [resource, setResource] = useState("");
  const [userID] = useState(currentUser?.displayName || currentUser?.email || "");
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");
  const [purpose, setPurpose] = useState("");
  const [attendees, setAttendees] = useState("");
  const [editingBooking, setEditingBooking] = useState<BookingRecord | null>(null);

  // Luxe Time State
  const [sH, setSH] = useState("08");
  const [sM, setSM] = useState("00");
  const [sP, setSP] = useState("AM");
  const [eH, setEH] = useState("10");
  const [eM, setEM] = useState("00");
  const [eP, setEP] = useState("AM");

  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("10:00");
  const [duration, setDuration] = useState("2h 0m");

  const [confirmation, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [availableResources, setAvailableResources] = useState<any[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // Load editing state from registry navigation
  useEffect(() => {
    if (location.state?.editingBooking) {
      handleEditBooking(location.state.editingBooking);
    }
  }, [location.state]);

  const isFacility = mode === 'facilities';

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const year = tomorrow.getFullYear();
    const month = `${tomorrow.getMonth() + 1}`.padStart(2, '0');
    const day = `${tomorrow.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Sync Luxe Time to standard strings and calculate duration
  useEffect(() => {
    const convert = (h: string, m: string, p: string) => {
      let hh = parseInt(h);
      if (p === "PM" && hh < 12) hh += 12;
      if (p === "AM" && hh === 12) hh = 0;
      return `${hh.toString().padStart(2, '0')}:${m}`;
    };

    const s = convert(sH, sM, sP);
    const e = convert(eH, eM, eP);
    setStartTime(s);
    setEndTime(e);

    const startMins = (parseInt(s.split(":")[0]) * 60) + parseInt(s.split(":")[1]);
    const endMins = (parseInt(e.split(":")[0]) * 60) + parseInt(e.split(":")[1]);
    let diff = endMins - startMins;
    if (diff < 0) diff = 0;
    setDuration(`${Math.floor(diff / 60)}h ${diff % 60}m`);
  }, [sH, sM, sP, eH, eM, eP]);

  useEffect(() => {
    fetchResources();
  }, [mode]);

  const fetchResources = async () => {
    try {
      setLoadingResources(true);
      const res = await apiClient.get('/resources');
      const data = Array.isArray(res.data) ? res.data : [];
      let filtered = data.filter((r: any) => r.status === 'ACTIVE');
      const facilityTypes = ['Lecture Hall', 'Computer Lab', 'Science Lab', 'Meeting Room', 'Auditorium'];
      const assetTypes = ['Projector', 'Camera', 'Laptop', 'Sound System', 'Router'];

      if (mode === 'facilities') {
        filtered = filtered.filter((r: any) => facilityTypes.includes(r.type));
      } else {
        filtered = filtered.filter((r: any) => assetTypes.includes(r.type));
      }
      setAvailableResources(filtered);
    } catch (err) {
      console.error("Failed to fetch resources", err);
    } finally {
      setLoadingResources(false);
    }
  };

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

  const handleEditBooking = (booking: BookingRecord) => {
    setEditingBooking(booking);
    setDate(booking.date);
    setResource(booking.bookingResource);
    setPurpose(booking.purpose);
    setAttendees(booking.noOfAttendees?.toString() || "");
    
    // Parse times
    const [startH, startM] = booking.startTime.split(':');
    const [endH, endM] = booking.endTime.split(':');
    
    const parseUnit = (h: string, m: string) => {
      let hh = parseInt(h);
      let p = "AM";
      if (hh >= 12) {
        p = "PM";
        if (hh > 12) hh -= 12;
      }
      if (hh === 0) hh = 12;
      return { h: hh.toString().padStart(2, '0'), m, p };
    };

    const s = parseUnit(startH, startM);
    const e = parseUnit(endH, endM);
    
    setSH(s.h); setSM(s.m); setSP(s.p);
    setEH(e.h); setEM(e.m); setEP(e.p);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingBooking(null);
    setDate("");
    setResource("");
    setPurpose("");
    setAttendees("");
    setSH("08"); setSM("00"); setSP("AM");
    setEH("10"); setEM("00"); setEP("AM");
    setConfirm("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const minDate = getTomorrowDate();
    if (!date || !resource || !userID || !year || !semester || !startTime || !endTime || !purpose || (isFacility && !attendees)) {
      setError("⚠️ Please fill all required fields!");
      setConfirm("");
      return;
    }

    if (date < minDate) {
      setError("⚠️ Application Date must be tomorrow or later.");
      setConfirm("");
      return;
    }

    const bookingData = {
      id: editingBooking?.id,
      userId: currentUser?.email || userID,
      requesterUid: currentUser?.uid || "",
      bookingResource: resource,
      date: date,
      startTime: startTime,
      endTime: endTime,
      purpose: purpose,
      noOfAttendees: isFacility ? Number(attendees) : 1,
      status: editingBooking ? editingBooking.status : 'PENDING',
      hiddenByUser: false
    };
    try {
      const response = editingBooking 
        ? await apiClient.put(`/booking/${editingBooking.id}`, bookingData)
        : await apiClient.post("/booking", bookingData);
      
      const result = response.data;
      if (response.status === 200) {
        // If status is 200, we treat it as success regardless of the exact string, 
        // though we prefer the 'successfully' message from our standardized backend.
        setError("");
        
        const isUpdate = editingBooking || (typeof result === 'string' && result.toLowerCase().includes("updated"));
        toast.success(isUpdate ? "Booking updated successfully" : "Request submitted successfully");
        
        // Redirect to registry after success
        setTimeout(() => {
          navigate('/my-bookings');
        }, 1500);

        if (!editingBooking) resetForm();
      } else {
        setError("⚠️ " + (typeof result === 'string' ? result : "Unexpected server response"));
        setConfirm("");
      }
    } catch (err: any) {
      const errorData = err.response?.data;
      const errorMsg = (typeof errorData === 'string' ? errorData : errorData?.message) || "Failed to connect to backend";
      setError("⚠️ " + errorMsg);
      setConfirm("");
    }
  };

  const increment = (val: string, setVal: any, max: number, min: number = 1) => {
    let n = parseInt(val) + 1;
    if (n > max) n = min;
    setVal(n.toString().padStart(2, '0'));
  };

  const decrement = (val: string, setVal: any, max: number, min: number = 1) => {
    let n = parseInt(val) - 1;
    if (n < min) n = max;
    setVal(n.toString().padStart(2, '0'));
  };

  const TimePickerUnit = ({ label, h, m, p, setH, setM, setP }: any) => (
    <div className="luxe-picker-unit">
      <div className="unit-header">
        <Clock size={14} />
        <span>{label}</span>
      </div>
      <div className="unit-controls">
        <div className="control-group">
          <button type="button" onClick={() => increment(h, setH, 12)}><ChevronUp size={16} /></button>
          <span className="unit-val">{h}</span>
          <button type="button" onClick={() => decrement(h, setH, 12)}><ChevronDown size={16} /></button>
        </div>
        <span className="unit-sep">:</span>
        <div className="control-group">
          <button type="button" onClick={() => increment(m, setM, 59, 0)}><ChevronUp size={16} /></button>
          <span className="unit-val">{m}</span>
          <button type="button" onClick={() => decrement(m, setM, 59, 0)}><ChevronDown size={16} /></button>
        </div>
        <button type="button"
          className={`period-toggle ${p === 'AM' ? 'am' : 'pm'}`}
          onClick={() => setP(p === 'AM' ? 'PM' : 'AM')}
        >
          {p === 'AM' ? <Sun size={14} /> : <Moon size={14} />}
          <span>{p}</span>
        </button>
      </div>
    </div>
  );

  return (
    <AppLayout activeTab="none">
      <div className={`portal-container animate-fade-in theme-${mode}`}>
        <div className="portal-header admin-portal-header">
          <div className="header-text">
            <h1 className="admin-page-title marquee">
              {editingBooking ? `Edit ${isFacility ? 'Venue' : 'Asset'} Request` : (isFacility ? 'Venue Reservation' : 'Asset Request')}
            </h1>
            <p className="admin-page-subtitle">
              {editingBooking ? 'Adjust your reservation details below.' : `Configure your institutional ${isFacility ? 'venue' : 'equipment'} allocation.`}
            </p>
          </div>
          {editingBooking && (
            <button className="secondary-btn" onClick={resetForm} style={{ marginBottom: '1rem' }}>
              <X size={16} /> Cancel Edit
            </button>
          )}
        </div>

        <div className="portal-content">
          <div className="admin-card luxe-card">
            <div className="card-header">
              <h3>{isFacility ? 'Session Specifications' : 'Request Requirements'}</h3>
              <div className="duration-pill">
                <Timer size={14} />
                <span>{duration} Session</span>
              </div>
            </div>

            <form className="admin-form-padding" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-field">
                  <label>Application Date</label>
                  <input type="date" value={date} min={getTomorrowDate()} required onChange={(e) => setDate(e.target.value)} />
                </div>

                <div className="form-field">
                  <label>{isFacility ? 'Target Facility' : 'Inventory Asset'}</label>
                  <select value={resource} required onChange={(e) => setResource(e.target.value)} disabled={loadingResources}>
                    <option value="">{loadingResources ? "Syncing..." : `--- Select ${isFacility ? 'Facility' : 'Asset'} ---`}</option>
                    {availableResources.map((res: any) => (
                      <option key={res.id} value={res.name}>{res.name} ({res.type})</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Student UID</label>
                  <input type="text" value={userID} readOnly className="readonly-field" />
                </div>

                <div className="form-field">
                  <label>Academic Standing</label>
                  <div className="select-row">
                    <select value={year} required onChange={(e) => setYear(e.target.value)}>
                      <option value="">Year</option>
                      <option>Year 1</option>
                      <option>Year 2</option>
                      <option>Year 3</option>
                      <option>Year 4</option>
                    </select>
                    <select value={semester} required onChange={(e) => setSemester(e.target.value)}>
                      <option value="">Sem</option>
                      <option>Sem 1</option>
                      <option>Sem 2</option>
                    </select>
                  </div>
                </div>

                <div className="form-field full-width">
                  <label className="luxe-label">Booking Interval</label>
                  <div className="luxe-time-suite">
                    <TimePickerUnit label="Start Time" h={sH} m={sM} p={sP} setH={setSH} setM={setSM} setP={setSP} />
                    <div className="luxe-timeline">
                      <div className="timeline-labels">
                        <span>08:00</span>
                        <span>12:00</span>
                        <span>16:00</span>
                        <span>20:00</span>
                      </div>
                      <div className="timeline-track">
                        <div
                          className="timeline-range"
                          style={{
                            left: `${Math.max(0, (parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]) - 480) / 7.2)}%`,
                            width: `${Math.max(0, (parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]) - (parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]))) / 7.2)}%`
                          }}
                        ></div>
                      </div>
                    </div>
                    <TimePickerUnit label="End Time" h={eH} m={eM} p={eP} setH={setEH} setM={setEM} setP={setEP} />
                  </div>
                </div>

                {isFacility && (
                  <div className="form-field">
                    <label>Expected Attendees</label>
                    <input type="number" value={attendees} required min="1" onChange={(e) => setAttendees(e.target.value)} />
                  </div>
                )}

                <div className="form-field full-width">
                  <label>Purpose Designation</label>
                  <input
                    type="text"
                    value={purpose}
                    required
                    placeholder="Describe the nature of your request..."
                    onChange={(e) => setPurpose(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="admin-submit-btn">
                  {editingBooking ? 'Update Request' : `Confirm ${isFacility ? 'Booking' : 'Request'}`}
                </button>
              </div>

              {error && <div className="admin-alert error">{error}</div>}
              {confirmation && <div className="admin-alert success">{confirmation}</div>}
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default BookingForm;