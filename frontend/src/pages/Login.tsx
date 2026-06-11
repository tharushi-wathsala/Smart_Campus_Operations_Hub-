import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import './Login.css';

const Login: React.FC = () => {
  const { login, loginWithEmail, signupWithEmail, resetPassword, sendVerificationEmail, currentUser, userRole } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);

  // Form Validation
  const validateEmail = (emailStr: string) => /\S+@\S+\.\S+/.test(emailStr);
  const validatePassword = (passStr: string) => passStr.length >= 6;

  useEffect(() => {
    if (currentUser && userRole !== null) {
      if (userRole === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [currentUser, userRole, navigate]);

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      await login();
      toast.success("Successfully logged in with Google!");
      // Navigation happens dynamically via useEffect above
    } catch (err: any) {
      toast.error(err.message || 'Failed to log in with Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!validatePassword(password)) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    
    try {
      setLoading(true);
      if (isLogin) {
        await loginWithEmail(email, password);
        toast.success("Welcome back!");
      } else {
        await signupWithEmail(email, password);
        toast.success("Account created successfully!");
        try {
          await sendVerificationEmail();
          toast.success("Verification email sent! Please check your inbox.");
        } catch (e) {
          console.error("Failed to send initial verification email:", e);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first so we know where to send the reset link.');
      return;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email before requesting a password reset.');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      await resetPassword(email);
      toast.success(`Password reset link sent to ${email}. Check your inbox!`, { duration: 5000 });
    } catch (err: any) {
      toast.error(err.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="logo-container">
            <div className="logo-pulse"></div>
            <h1>Smart Campus</h1>
        </div>
        <p className="login-subtitle">
            {isLogin ? 'Sign in to access facility hubs.' : 'Create an account to get started.'}
        </p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form className="auth-form" onSubmit={handleEmailAuth}>
            <div className="input-group">
                <Mail size={18} className="input-icon" />
                <input 
                    type="email" 
                    placeholder="University Email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="auth-input"
                />
            </div>
            
            <div className="input-group">
                <Lock size={18} className="input-icon" />
                <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="auth-input"
                />
                <button 
                  type="button" 
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>

            {!isLogin && (
                <div className="input-group">
                    <Lock size={18} className="input-icon" />
                    <input 
                        type={showConfirmPassword ? "text" : "password"} 
                        placeholder="Confirm Password" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="auth-input"
                    />
                    <button 
                      type="button" 
                      className="password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>
            )}
            
            {isLogin && (
                <div className="forgot-password" onClick={!loading ? handleForgotPassword : undefined}>
                    Forgot Password?
                </div>
            )}
            
            <button type="submit" className={`primary-btn ${loading ? 'loading' : ''}`} disabled={loading}>
                {loading ? (
                  <div className="spinner"></div>
                ) : (
                  <>
                    {isLogin ? 'Sign In' : 'Sign Up'}
                    {isLogin ? <LogIn size={18} className="btn-icon" /> : <UserPlus size={18} className="btn-icon" />}
                  </>
                )}
            </button>
        </form>

        <div className="divider">
            <span>OR</span>
        </div>

        <button className="google-btn" onClick={handleGoogleLogin} type="button" disabled={loading}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="google-icon">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.7 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          <span>Continue with Google</span>
        </button>

        <p className="toggle-auth">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span onClick={!loading ? toggleAuthMode : undefined} className={`toggle-link ${loading ? 'disabled' : ''}`}>
                {isLogin ? 'Sign up' : 'Sign in'}
            </span>
        </p>
      </div>
    </div>
  );
};

export default Login;;
