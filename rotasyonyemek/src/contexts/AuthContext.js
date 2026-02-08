import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext(null);

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
  const [sessionChecked, setSessionChecked] = useState(false);

  // Kullanıcı rolünü getir
  const fetchUserRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('kullanicilar')
        .select('rol')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Rol hatası:', error);
        return 'musteri';
      }
      
      console.log('✅ Rol bulundu:', data?.rol);
      return data?.rol || 'musteri';
    } catch (error) {
      console.error('fetchUserRole hatası:', error);
      return 'musteri';
    }
  };

  // User ve role'ü birlikte set et
  const setUserAndRole = async (authUser) => {
    if (authUser) {
      console.log('👤 Kullanıcı ayarlanıyor:', authUser.email);
      const role = await fetchUserRole(authUser.id);
      setUser(authUser);
      setUserRole(role);
    } else {
      console.log('👤 Kullanıcı temizleniyor');
      setUser(null);
      setUserRole(null);
    }
  };

  // İlk yükleme - Sadece 1 kere çalışır
  useEffect(() => {
    const checkSession = async () => {
      console.log('🔍 Session kontrol ediliyor...');
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session hatası:', error);
        }

        if (session?.user) {
          console.log('✅ Mevcut session bulundu');
          await setUserAndRole(session.user);
        } else {
          console.log('ℹ️ Session yok');
          setUser(null);
          setUserRole(null);
        }
      } catch (error) {
        console.error('checkSession hatası:', error);
      } finally {
        setLoading(false);
        setSessionChecked(true);
      }
    };

    checkSession();
  }, []); // Boş dependency array - sadece 1 kere çalışır

  // Auth state değişikliklerini dinle
  useEffect(() => {
    if (!sessionChecked) return; // İlk check bitene kadar listener'ı başlatma

    console.log('👂 Auth listener başlatılıyor...');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 Auth event:', event);

        if (event === 'SIGNED_OUT') {
          console.log('🚪 Çıkış yapıldı');
          setUser(null);
          setUserRole(null);
        } 
        else if (event === 'SIGNED_IN' && session?.user) {
          console.log('🔑 Giriş yapıldı');
          await setUserAndRole(session.user);
        }
        else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('🔄 Token yenilendi');
          // Token yenilenmesinde user/role değiştirmiyoruz
        }
        else if (event === 'USER_UPDATED' && session?.user) {
          console.log('👤 Kullanıcı güncellendi');
          await setUserAndRole(session.user);
        }
      }
    );

    return () => {
      console.log('🧹 Auth listener temizleniyor');
      subscription?.unsubscribe();
    };
  }, [sessionChecked]);

  // Giriş yap
  const login = async (email, password) => {
    console.log('🔐 Login başlatılıyor...');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });
    
    if (error) {
      console.error('❌ Login hatası:', error);
      throw error;
    }
    
    console.log('✅ Login başarılı');
    
    // State güncellemesi onAuthStateChange tarafından yapılacak
    // Ama yine de manuel olarak da yapalım (güvenlik için)
    if (data.user) {
      await setUserAndRole(data.user);
    }
    
    return data;
  };

  // Kayıt ol
  const register = async (email, password, userData) => {
    console.log('📝 Register başlatılıyor...');
    
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password
    });
    
    if (error) throw error;

    if (data.user) {
      await supabase.from('kullanicilar').insert([{
        id: data.user.id,
        email: email.trim().toLowerCase(),
        ad: userData?.ad || '',
        telefon: userData?.telefon || '',
        rol: 'musteri'
      }]);
    }

    return data;
  };

  // Çıkış yap
  const logout = async () => {
    console.log('🚪 Logout başlatılıyor...');
    
    try {
      // Önce Supabase'den çıkış yap
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout hatası:', error);
      }
      
      // State'i temizle
      setUser(null);
      setUserRole(null);
      
      // LocalStorage'dan Supabase auth bilgilerini temizle
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      console.log('✅ Logout tamamlandı');
      
    } catch (error) {
      console.error('Logout catch hatası:', error);
      
      // Hata olsa bile temizle
      setUser(null);
      setUserRole(null);
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      });
    }
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
    isMusteri: userRole === 'musteri' || (!userRole && user)
  };

  // Debug log
  console.log('📊 Auth State:', { 
    hasUser: !!user, 
    email: user?.email,
    role: userRole, 
    loading, 
    sessionChecked,
    isAdmin: userRole === 'admin'
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;