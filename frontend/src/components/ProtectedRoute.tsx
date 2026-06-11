/**
 * Contribution of Member 4: Global Access Control Middleware.
 * Usage: This component acts as a security gate for protected areas of the app. 
 * It ensures that only authenticated users can access internal routes, 
 * redirecting anonymous users back to the login gateway.
 */
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Outlet, Navigate } from 'react-router-dom';
import SplashScreen from './SplashScreen';

const ProtectedRoute = () => {
    const { currentUser, loading, logout, sendVerificationEmail } = useAuth();
    const [message, setMessage] = useState('');

    if (loading) return <SplashScreen />;

    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    if (!currentUser.emailVerified) {
        return (
            <div style={{ textAlign: 'center', marginTop: '10%', fontFamily: 'sans-serif' }}>
                <h2>Verify Your Email</h2>
                <p>We sent a verification link to <strong>{currentUser.email}</strong>.</p>
                <p>Please check your inbox (and spam folder) and verify your email to access the Smart Campus Dashboard.</p>

                {message && <div style={{ color: '#059669', margin: '1rem 0', fontWeight: 'bold' }}>{message}</div>}

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.5rem' }}>
                    <button
                        onClick={async () => {
                            await currentUser.reload();
                            // Force a hard reload to ensure Firebase re-evaluates the token
                            window.location.reload();
                        }}
                        style={{ padding: '0.8rem 1.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        I've Verified My Email (Refresh)
                    </button>

                    <button
                        onClick={async () => {
                            try {
                                await sendVerificationEmail();
                                setMessage('Verification email resent!');
                            } catch (e: any) {
                                setMessage(e.message || 'Failed to resend.');
                            }
                        }}
                        style={{ padding: '0.8rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        Resend Link
                    </button>

                    <button
                        onClick={() => logout()}
                        style={{ padding: '0.8rem 1.5rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        );
    }

    return <Outlet />;
};

export default ProtectedRoute;
