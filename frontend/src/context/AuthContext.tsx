/**
 * Contribution of Member 4: Global Identity & Session Management.
 * Usage: This context provides a centralized authentication state for the React app. 
 * It handles Firebase session monitoring, role extraction from Custom Claims, 
 * and profile synchronization with Firestore.
 */
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updatePassword, sendPasswordResetEmail, sendEmailVerification, updateProfile } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth, loginWithGoogle, logout, db } from '../config/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import SplashScreen from '../components/SplashScreen';

/**
 * Context for managing Global Authentication state.
 * This file coordinates Firebase Authentication, custom claims for Role-Based Access Control (RBAC),
 * and dynamic profile data fetching from Cloud Firestore.
 */
interface UserProfile {
  photoURL: string;
}

interface AuthContextType {
  currentUser: User | null; // The low-level Firebase User object
  userProfile: UserProfile | null; // Extended profile data (e.g., photo) from Firestore
  userRole: string | null; // The user's role determined via Firebase Custom Claims
  loading: boolean; // Flag to indicate if auth state is still being initialized
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string) => Promise<void>;
  updateUserPassword: (newPass: string) => Promise<void>;
  updateUserProfile: (displayName: string, photoURL: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

/**
 * Custom hook to consume the AuthContext within components.
 */
export const useAuth = () => useContext(AuthContext);

/**
 * Provider component that wraps the application to provide authentication state.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("Setting up Firebase Auth state listener...");
    let unsubscribeProfile = () => { }; // Storage for the Firestore profile listener cleanup
    let unsubscribeAuth = () => { }; // Storage for the Firebase Auth listener cleanup

    try {
      // Listen for authentication changes (login, logout, token refresh)
      unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        console.log("Firebase Auth triggered!", user);
        unsubscribeProfile(); // Stop listening to the previous user's profile

        if (user) {
          try {
            // Force refresh the token to retrieve the latest Custom Claims (like 'role')
            const idTokenResult = await user.getIdTokenResult(true);
            console.log("POSTMAN BEARER TOKEN:", idTokenResult.token); // TEMPORARY LOG FOR TESTING
            const role = idTokenResult.claims.role as string || 'USER'; // Default to 'USER' if no role claim exists
            setUserRole(role);

            // Set up a real-time listener for the user's Firestore profile document
            unsubscribeProfile = onSnapshot(doc(db, 'profiles', user.uid), (docSnap) => {
              if (docSnap.exists()) {
                setUserProfile(docSnap.data() as UserProfile);
              } else {
                setUserProfile(null);
              }
            });

          } catch (e) {
            console.error("Failed to fetch custom claims:", e);
            setUserRole('USER');
            setUserProfile(null);
          }
        } else {
          // Clear state on logout
          setUserRole(null);
          setUserProfile(null);
        }
        setCurrentUser(user); // Update the current session user
        setLoading(false); // Signal that the initial auth check is complete
      }, (error) => {
        console.error("Firebase Auth Error:", error);
        setCurrentUser(null);
        setUserRole('USER');
        setLoading(false);
      });
    } catch (error) {
      console.error("Firebase initialization error:", error);
      setCurrentUser(null);
      setUserRole('USER');
      setLoading(false);
    }

    // Safeguard to prevent an infinite "loading" state if Firebase takes too long
    const timeout = setTimeout(() => {
      if (loading) {
        console.log("Firebase taking too long, forcefully releasing loading lock.");
        setLoading(false);
      }
    }, 4000);

    return () => {
      clearTimeout(timeout);
      unsubscribeAuth(); // Clean up Auth listener on unmount
      unsubscribeProfile(); // Clean up Profile listener on unmount
    };
  }, []);

  /**
   * Helper methods for various authentication flows.
   */
  const login = async () => { await loginWithGoogle(); }; // Google OAuth Login
  const loginWithEmail = async (email: string, pass: string) => { await signInWithEmailAndPassword(auth, email, pass); }; // Email/Pass Login
  const signupWithEmail = async (email: string, pass: string) => { await createUserWithEmailAndPassword(auth, email, pass); }; // New Account Creation
  const updateUserPassword = async (newPass: string) => {
    if (auth.currentUser) { await updatePassword(auth.currentUser, newPass); }
    else { throw new Error("No user is currently logged in."); }
  };

  /**
   * Updates the user's public profile and synced Firestore profile data.
   */
  const updateUserProfile = async (displayName: string, photoURL: string) => {
    if (auth.currentUser) {
      // Update Firebase Auth profile (display name)
      await updateProfile(auth.currentUser, { displayName });

      // Update extended profile (Base64 image) in Firestore due to its higher capacity
      await setDoc(doc(db, 'profiles', auth.currentUser.uid), { photoURL }, { merge: true });

      // Refresh local state by cloning the current user object
      const user = auth.currentUser;
      setCurrentUser({ ...user } as User);
    } else {
      throw new Error("No user is currently logged in.");
    }
  };

  const resetPassword = async (email: string) => { await sendPasswordResetEmail(auth, email); }; // Send trigger for password reset
  const sendVerificationEmail = async () => { if (auth.currentUser) { await sendEmailVerification(auth.currentUser); } }; // Verify user email
  const handleLogout = async () => { await logout(); }; // Perform system logout

  const value = {
    currentUser,
    userProfile,
    userRole,
    loading,
    login,
    loginWithEmail,
    signupWithEmail,
    updateUserPassword,
    updateUserProfile,
    resetPassword,
    sendVerificationEmail,
    logout: handleLogout
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? <SplashScreen /> : children}
    </AuthContext.Provider>
  );
};


