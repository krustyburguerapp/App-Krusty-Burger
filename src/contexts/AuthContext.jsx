import { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider, db, ADMIN_EMAIL, isDemoMode } from '../config/firebase';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, getDocFromCache, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

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

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // PURGA AUTOMÁTICA DE SESIONES DE INVITADOS RESIDUALES:
                // Si el navegador recuerda un inicio de sesión anónimo antiguo, lo expulsa.
                if (firebaseUser.isAnonymous) {
                    signOut(auth);
                    setUser(null);
                    setUserData(null);
                    setIsAdmin(false);
                    setLoading(false);
                    return;
                }

                setUser(firebaseUser);
                setIsAdmin(firebaseUser.email === ADMIN_EMAIL);

                try {
                    const userDocRef = doc(db, 'users', firebaseUser.uid);

                    let userDataFromCache = null;

                    // Helper para asegurar que la info fresca nativa de Google siempre gane sobre cachés viejos
                    const enrichUserData = (data) => ({
                        ...data,
                        displayName: firebaseUser.displayName || data?.displayName || 'Krusty Fan',
                        email: firebaseUser.email || data?.email || '',
                        photoURL: firebaseUser.photoURL || data?.photoURL || ''
                    });

                    // 1. INTENTO DE CACHÉ (Ultrarrápido, ~0ms)
                    try {
                        const cachedDoc = await getDocFromCache(userDocRef);
                        if (cachedDoc.exists()) {
                            userDataFromCache = cachedDoc.data();
                            setUserData(enrichUserData(userDataFromCache));
                            // ELIMINAMOS EL SPINNER INMEDIATAMENTE
                            setLoading(false);
                        }
                    } catch (cacheError) {
                        // Caché no disponible, buscando en servidor...
                    }

                    // 2. RECUPERACIÓN / ACTUALIZACIÓN EN SEGUNDO PLANO
                    const fetchFromServer = async () => {
                        const serverPromise = getDoc(userDocRef);

                        let timeoutId;
                        const timeoutPromise = new Promise((_, reject) => {
                            timeoutId = setTimeout(() => {
                                reject(new Error('Timeout de 4s superado buscando en servidor'));
                            }, 4000);
                        });

                        try {
                            const userDoc = userDataFromCache ? await serverPromise : await Promise.race([serverPromise, timeoutPromise]);
                            clearTimeout(timeoutId);

                            if (userDoc.exists()) {
                                const serverData = userDoc.data();

                                // 🔄 SINCRONIZAR EMAIL DE GOOGLE AUTOMÁTICAMENTE
                                // Si el email de Google es diferente al guardado, actualizarlo
                                if (firebaseUser.email && serverData.email !== firebaseUser.email) {
                                    const userDocRef = doc(db, 'users', firebaseUser.uid);
                                    await updateDoc(userDocRef, {
                                        email: firebaseUser.email,
                                        emailUpdatedAt: serverTimestamp()
                                    });
                                    serverData.email = firebaseUser.email;
                                }

                                setUserData(enrichUserData(serverData)); // Actualiza datos silenciamente si el caché era viejo
                                if (!userDataFromCache) setLoading(false);
                            } else {
                                // Es un usuario nuevo que acaba de loguearse pero que no tiene documento
                                const newUserData = {
                                    displayName: firebaseUser.displayName || 'Krusty Fan',
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
                                if (!userDataFromCache) setLoading(false);
                            }
                        } catch (serverError) {
                            clearTimeout(timeoutId);

                            // Si no teníamos caché y falló todo lo demás, creamos un perfil temporal en memoria para NO bloquear la app
                            if (!userDataFromCache) {
                                setUserData(enrichUserData({
                                    role: firebaseUser.email === ADMIN_EMAIL ? 'admin' : 'user',
                                    hasCompletedProfile: false
                                }));
                                setLoading(false);
                            }
                        }
                    };

                    fetchFromServer();

                } catch (error) {
                    setLoading(false);
                }
            } else {
                setUser(null);
                setUserData(null);
                setIsAdmin(false);
                setLoading(false);
            }
        });

        return () => unsubscribe();
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
