import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: User needs to replace these with their actual Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyD9ge9Qs4LRw7fjv_XbiQf4OaqIa_FvZFs",
    authDomain: "smart-campus-operations-hub-tv.firebaseapp.com",
    projectId: "smart-campus-operations-hub-tv",
    storageBucket: "smart-campus-operations-hub-tv.firebasestorage.app",
    messagingSenderId: "786482798937",
    appId: "1:786482798937:web:ff23c16f9c22f15620ec48",
    measurementId: "G-YKMT6SWFJH"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

export const loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error("Error signing in with Google", error);
        throw error;
    }
};

export const logout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error signing out", error);
        throw error;
    }
};
