import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { auth, googleProvider, db, ADMIN_EMAIL, isDemoMode } from '../config/firebase';
import { signInWithPopup, onAuthStateChanged, signOut, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext(null);

const AUTH_TIMEOUT_MS = 3000; // 3 seconds max wait for Firebase Auth

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const timeoutRef = useRef(null);
    const authResolvedRef = useRef(false);

    useEffect(() => {
        if (isDemoMode) {
            const savedUser = localStorage.getItem('demoKrustyUser');
            if (savedUser) {
                const parsedUser = JSON.parse(savedUser);
                setUser(parsedUser);
                setUserData(parsedUser.userData);
                setIsAdmin(parsedUser.userData.role === 'admin');
            }
            setLoading(false);
            return;
        }

        // Safety timeout: if Firebase Auth takes too long, stop blocking the UI
        timeoutRef.current = setTimeout(() => {
            if (!authResolvedRef.current) {
                console.warn('Firebase Auth timeout - allowing UI to render');
                setLoading(false);
            }
        }, AUTH_TIMEOUT_MS);

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            authResolvedRef.current = true;
            if (timeoutRef.current) clearTimeout(timeoutRef.current);

            if (firebaseUser) {
                setUser(firebaseUser);
                setIsAdmin(firebaseUser.email === ADMIN_EMAIL);
                try {
                    const userDocRef = doc(db, 'users', firebaseUser.uid);
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists()) {
                        setUserData(userDoc.data());
                    } else {
                        const newUserData = {
                            displayName: firebaseUser.displayName || 'Invitado',
                            email: firebaseUser.email || '',
                            photoURL: firebaseUser.photoURL || '',
                            phone: '',
                            address: '',
                            addressNotes: '',
                            location: '',
                            role: firebaseUser.email === ADMIN_EMAIL ? 'admin' : 'user',
                            hasCompletedProfile: false,
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp()
                        };
                        await setDoc(userDocRef, newUserData);
                        setUserData(newUserData);
                    }
                } catch (error) {
                    // If Firestore fails to load user data, set basic data from auth
                    setUserData({
                        displayName: firebaseUser.displayName || 'Invitado',
                        email: firebaseUser.email || '',
                        photoURL: firebaseUser.photoURL || '',
                        phone: '',
                        address: '',
                        role: firebaseUser.email === ADMIN_EMAIL ? 'admin' : 'user',
                        hasCompletedProfile: false
                    });
                }
            } else {
                setUser(null);
                setUserData(null);
                setIsAdmin(false);
            }
            setLoading(false);
        });

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            unsubscribe();
        };
    }, []);

    const loginWithGoogle = async () => {
        if (isDemoMode) {
            const mockUser = { uid: 'demo-google', email: 'demogoogle@krusty.com', displayName: 'Usuario Demo Google' };
            const mockUserData = { ...mockUser, role: 'user', hasCompletedProfile: true, phone: '3001234567', address: 'Calle 123' };
            setUser(mockUser);
            setUserData(mockUserData);
            setIsAdmin(false);
            localStorage.setItem('demoKrustyUser', JSON.stringify({ ...mockUser, userData: mockUserData }));
            return { success: true, user: mockUser };
        }
        try {
            const result = await signInWithPopup(auth, googleProvider);
            return { success: true, user: result.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const loginAsGuest = async () => {
        if (isDemoMode) {
            const mockUser = { uid: 'demo-guest', email: '', displayName: 'Invitado Demo' };
            const mockUserData = { ...mockUser, role: 'user', hasCompletedProfile: false };
            setUser(mockUser);
            setUserData(mockUserData);
            setIsAdmin(false);
            localStorage.setItem('demoKrustyUser', JSON.stringify({ ...mockUser, userData: mockUserData }));
            return { success: true, user: mockUser };
        }
        try {
            const result = await signInAnonymously(auth);
            return { success: true, user: result.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const loginAsAdminDemo = async () => {
        if (isDemoMode) {
            const mockUser = { uid: 'demo-admin', email: ADMIN_EMAIL, displayName: 'Krusty Admin' };
            const mockUserData = { ...mockUser, role: 'admin', hasCompletedProfile: true };
            setUser(mockUser);
            setUserData(mockUserData);
            setIsAdmin(true);
            localStorage.setItem('demoKrustyUser', JSON.stringify({ ...mockUser, userData: mockUserData }));
            return { success: true, user: mockUser };
        }
        return { success: false, error: 'Not in demo mode' };
    };

    const logout = async () => {
        if (isDemoMode) {
            setUser(null);
            setUserData(null);
            setIsAdmin(false);
            localStorage.removeItem('demoKrustyUser');
            return { success: true };
        }
        try {
            await signOut(auth);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const updateUserData = async (data) => {
        if (!user) return { success: false, error: 'No autenticado' };
        if (isDemoMode) {
            const updatedData = { ...userData, ...data };
            setUserData(updatedData);
            const saved = JSON.parse(localStorage.getItem('demoKrustyUser') || '{}');
            localStorage.setItem('demoKrustyUser', JSON.stringify({ ...saved, userData: updatedData }));
            return { success: true };
        }
        try {
            const userDocRef = doc(db, 'users', user.uid);
            const updateData = { ...data, updatedAt: serverTimestamp() };
            await setDoc(userDocRef, updateData, { merge: true });
            setUserData((prev) => ({ ...prev, ...data }));
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const value = {
        user,
        userData,
        loading,
        isAdmin,
        loginWithGoogle,
        loginAsGuest,
        loginAsAdminDemo,
        logout,
        updateUserData
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
    return context;
}
