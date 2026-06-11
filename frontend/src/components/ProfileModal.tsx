import React, { useState, useRef } from 'react';
import { X, Lock, Save, CheckCircle, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isContentInappropriate } from '../utils/profanityUtils';
import { compressImage } from '../utils/imageUtils';
import './ProfileModal.css';

interface ProfileModalProps {
    onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
    const { currentUser, userProfile, updateUserPassword, updateUserProfile } = useAuth();

    // Tab switching state
    const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

    // Profile information state
    const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
    const [photoURL, setPhotoURL] = useState(userProfile?.photoURL || currentUser?.photoURL || '');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [localPreview, setLocalPreview] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Password state
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setLocalPreview(URL.createObjectURL(file));
        }
    };



    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        try {
            setProfileLoading(true);

            // Profanity Check
            if (isContentInappropriate(displayName)) {
                setError('Identity Error: This name does not meet our campus community standards for professionalism.');
                setProfileLoading(false);
                return;
            }

            let finalPhotoURL = photoURL;
            if (selectedFile) {
                // Convert to compressed Base64 since we are skipping Storage
                finalPhotoURL = await compressImage(selectedFile, 200, 0.7);
            }

            await updateUserProfile(displayName, finalPhotoURL);

            // Sync local state
            setPhotoURL(finalPhotoURL);

            setSuccessMessage('Profile updated successfully');
            setSelectedFile(null);

            if (localPreview) {
                URL.revokeObjectURL(localPreview);
                setLocalPreview(null);
            }
        } catch (err: any) {
            console.error("Profile update failed:", err);
            setError(err.message || 'Failed to synchronize profile data.');
        } finally {
            setProfileLoading(false);
        }
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        try {
            setLoading(true);
            await updateUserPassword(newPassword);
            setSuccessMessage('Password successfully updated!');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            if (err.code === 'auth/requires-recent-login') {
                setError('For security reasons, please log out and log back in before updating your password.');
            } else {
                setError(err.message || 'Failed to update password.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content profile-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header-premium">
                    <div className="modal-title-row">
                        <h2>My Profile</h2>
                        <button className="close-btn" onClick={onClose}><X size={20} /></button>
                    </div>
                </div>

                <div className="profile-identity-section">
                    <div className="avatar-edit-wrapper">
                        <div className="avatar-preview-container" onClick={() => fileInputRef.current?.click()}>
                            <img
                                src={localPreview || photoURL || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}
                                alt="Profile"
                                className="profile-avatar-large"
                            />
                            <div className="avatar-overlay">
                                <Camera size={24} />
                            </div>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>
                    <div className="profile-identity">
                        <div className="email-display">{currentUser?.email || 'Archive Identity'}</div>
                        <div className="uid-display">Account UID: <span className="mono">{(currentUser?.uid || '').substring(0, 10) || 'ARCH-IDX'}...</span></div>
                    </div>
                </div>

                <div className="profile-tabs-nav">
                    <button
                        className={`profile-tab-toggle ${activeTab === 'profile' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('profile'); setError(''); setSuccessMessage(''); }}
                    >
                        Profile Information
                    </button>
                    <button
                        className={`profile-tab-toggle ${activeTab === 'security' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('security'); setError(''); setSuccessMessage(''); }}
                    >
                        Security & Privacy
                    </button>
                </div>

                <div className="modal-body-content">
                    {/* Messaging Area */}
                    {(error || successMessage) && (
                        <div className="alert-container">
                            {error && <div className="error-alert">{error}</div>}
                            {successMessage && <div className="success-alert"><CheckCircle size={16} /> {successMessage}</div>}
                        </div>
                    )}

                    {activeTab === 'profile' ? (
                        <div className="settings-tab-pane">
                            <form onSubmit={handleProfileUpdate} className="modern-form">
                                <div className="modern-input-group">
                                    <label>Preferred Name</label>
                                    <div className="modern-field">
                                        <input
                                            type="text"
                                            placeholder="John Doe"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <p className="field-hint">This name will be visible to campus administration.</p>
                                </div>
                                <div className="form-actions-row">
                                    <button type="submit" className="prime-save-btn profile-prime" disabled={profileLoading}>
                                        {profileLoading ? 'Compressing Identity...' : 'Save Profile Changes'} <CheckCircle size={18} />
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div className="settings-tab-pane">
                            <form onSubmit={handlePasswordUpdate} className="modern-form">
                                <div className="modern-input-group">
                                    <label>Update Secret Password</label>
                                    <div className="modern-field">
                                        <Lock size={18} className="field-icon-left" />
                                        <input
                                            type="password"
                                            placeholder="Enter new strong password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            style={{ paddingLeft: '3rem' }}
                                        />
                                    </div>
                                </div>
                                <div className="modern-input-group">
                                    <label>Verify New Password</label>
                                    <div className="modern-field">
                                        <input
                                            type="password"
                                            placeholder="Repeat password to confirm"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="form-actions-row">
                                    <button type="submit" className="prime-save-btn security-prime" disabled={loading}>
                                        {loading ? 'Securing Account...' : 'Update Password Record'} <Save size={18} />
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
