import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = useCallback(async (userId, signal) => {
    try {
      const { data, error } = await supabase
        .from('kullanicilar')
        .select('rol')
        .eq('id', userId)
        .single()
        .abortSignal(signal);

      if (error && error.name === 'AbortError') return;
      
      if (!signal?.aborted) {
        setUserRole(data?.rol || 'musteri');
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Rol alınamadı:', error);
      if (!signal?.aborted) {
        setUserRole('musteri');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    // Mevcut oturumu kontrol et
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserRole(session.user.id, abortController.signal);
        } else {
          setLoading(false);
        }
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Session hatası:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initSession();

    // Oturum değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;
        
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserRole(session.user.id, abortController.signal);
        } else {
          setUserRole(null);
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      abortController.abort();
      subscription.unsubscribe();
    };
  }, [fetchUserRole]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  };

  const register = async (email, password, userData) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });
    if (error) throw error;

    // Kullanıcı tablosuna ekle
    if (data.user) {
      await supabase.from('kullanicilar').insert([{
        id: data.user.id,
        email: email,
        ad: userData.ad,
        telefon: userData.telefon,
        rol: 'musteri'
      }]);
    }

    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserRole(null);
  };

  const value = {
    user,
    userRole,
    loading,
    login,
    register,
    logout,
    isAdmin: userRole === 'admin',
    isRestoran: userRole === 'restoran',
    isMusteri: userRole === 'musteri'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;