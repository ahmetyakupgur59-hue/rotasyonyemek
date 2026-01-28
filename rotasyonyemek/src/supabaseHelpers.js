// =============================================
// SUPABASE HELPER FONKSİYONLAR
// Firebase fonksiyonlarının Supabase karşılıkları
// =============================================

import { supabase } from './supabase';

// ============ AUTH FONKSİYONLARI ============

// Mevcut kullanıcıyı al
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Auth durumunu dinle
export const onAuthStateChanged = (callback) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });
  return () => subscription.unsubscribe();
};

// Email/Şifre ile Giriş
export const signInWithEmailAndPassword = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw { code: error.message, message: error.message };
  return { user: data.user };
};

// Email/Şifre ile Kayıt
export const createUserWithEmailAndPassword = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw { code: error.message, message: error.message };
  return { user: data.user };
};

// Şifre Sıfırlama
export const sendPasswordResetEmail = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw { code: error.message, message: error.message };
};

// Google ile Giriş
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  });
  if (error) throw error;
  return data;
};

// Facebook ile Giriş
export const signInWithFacebook = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: { redirectTo: window.location.origin }
  });
  if (error) throw error;
  return data;
};

// Çıkış Yap
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// ============ DATABASE FONKSİYONLARI ============

// Tek döküman getir
export const getDoc = async (tableName, docId) => {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq('id', docId)
    .single();

  return {
    exists: () => !!data && !error,
    data: () => data,
    id: docId
  };
};

// Döküman oluştur/güncelle
export const setDoc = async (tableName, docId, docData, options = {}) => {
  const dataWithTimestamp = {
    ...docData,
    id: docId,
    updated_at: new Date().toISOString()
  };

  if (!options.merge) {
    dataWithTimestamp.created_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from(tableName)
    .upsert(dataWithTimestamp);

  if (error) throw error;
};

// Döküman güncelle
export const updateDoc = async (tableName, docId, updates) => {
  const { error } = await supabase
    .from(tableName)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', docId);

  if (error) throw error;
};

// Döküman ekle (otomatik ID)
export const addDoc = async (tableName, docData) => {
  const { data, error } = await supabase
    .from(tableName)
    .insert([{ ...docData, created_at: new Date().toISOString() }])
    .select()
    .single();

  if (error) throw error;
  return { id: data.id, ...data };
};

// Döküman sil
export const deleteDoc = async (tableName, docId) => {
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', docId);

  if (error) throw error;
};

// Koleksiyon getir (tümü)
export const getCollection = async (tableName) => {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return {
    docs: (data || []).map(doc => ({
      id: doc.id,
      data: () => doc,
      ...doc
    })),
    empty: !data || data.length === 0
  };
};

// Sorgu ile getir
export const queryCollection = async (tableName, conditions = []) => {
  let query = supabase.from(tableName).select('*');

  conditions.forEach(({ field, operator, value }) => {
    switch (operator) {
      case '==':
        query = query.eq(field, value);
        break;
      case '!=':
        query = query.neq(field, value);
        break;
      case '>':
        query = query.gt(field, value);
        break;
      case '>=':
        query = query.gte(field, value);
        break;
      case '<':
        query = query.lt(field, value);
        break;
      case '<=':
        query = query.lte(field, value);
        break;
      case 'in':
        query = query.in(field, value);
        break;
      case 'contains':
        query = query.contains(field, value);
        break;
      default:
        query = query.eq(field, value);
    }
  });

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;

  return {
    docs: (data || []).map(doc => ({
      id: doc.id,
      data: () => doc,
      ...doc
    })),
    empty: !data || data.length === 0
  };
};

// Realtime dinleme (onSnapshot alternatifi)
export const onSnapshot = (tableName, callback, conditions = []) => {
  // İlk veriyi çek
  const fetchData = async () => {
    try {
      const result = await queryCollection(tableName, conditions);
      callback(result);
    } catch (error) {
      console.error('Snapshot error:', error);
    }
  };

  fetchData();

  // Realtime subscription
  let query = supabase
    .channel(`${tableName}-changes`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: tableName },
      () => {
        fetchData(); // Değişiklik olunca tekrar çek
      }
    )
    .subscribe();

  // Unsubscribe fonksiyonu döndür
  return () => {
    supabase.removeChannel(query);
  };
};

// Tek döküman dinleme
export const onDocSnapshot = (tableName, docId, callback) => {
  // İlk veriyi çek
  const fetchData = async () => {
    try {
      const result = await getDoc(tableName, docId);
      callback(result);
    } catch (error) {
      console.error('Doc snapshot error:', error);
    }
  };

  fetchData();

  // Realtime subscription
  const channel = supabase
    .channel(`${tableName}-${docId}-changes`)
    .on('postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: tableName,
        filter: `id=eq.${docId}`
      },
      () => {
        fetchData();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// ============ YARDIMCI FONKSİYONLAR ============

// serverTimestamp alternatifi
export const serverTimestamp = () => new Date().toISOString();

// increment alternatifi
export const incrementField = async (tableName, docId, field, amount = 1) => {
  const { data } = await supabase
    .from(tableName)
    .select(field)
    .eq('id', docId)
    .single();

  const currentValue = data?.[field] || 0;

  await supabase
    .from(tableName)
    .update({ [field]: currentValue + amount })
    .eq('id', docId);
};

// arrayUnion alternatifi
export const arrayUnion = async (tableName, docId, field, newItem) => {
  const { data } = await supabase
    .from(tableName)
    .select(field)
    .eq('id', docId)
    .single();

  const currentArray = data?.[field] || [];

  // Obje ise stringify yaparak karşılaştır, değilse direkt
  const exists = currentArray.some(item => {
    if (typeof item === 'object' && item !== null && typeof newItem === 'object' && newItem !== null) {
      // Eğer id varsa ona göre bak
      if (item.id && newItem.id) return item.id === newItem.id;
      return JSON.stringify(item) === JSON.stringify(newItem);
    }
    return item === newItem;
  });

  if (!exists) {
    await supabase
      .from(tableName)
      .update({ [field]: [...currentArray, newItem] })
      .eq('id', docId);
  }
};

// arrayRemove alternatifi
export const arrayRemove = async (tableName, docId, field, itemToRemove) => {
  const { data } = await supabase
    .from(tableName)
    .select(field)
    .eq('id', docId)
    .single();

  const currentArray = data?.[field] || [];

  const newArray = currentArray.filter(item => {
    if (typeof item === 'object' && item !== null && typeof itemToRemove === 'object' && itemToRemove !== null) {
      if (item.id && itemToRemove.id) return item.id !== itemToRemove.id;
      return JSON.stringify(item) !== JSON.stringify(itemToRemove);
    }
    return item !== itemToRemove;
  });

  await supabase
    .from(tableName)
    .update({ [field]: newArray })
    .eq('id', docId);
};

// getDocs (Firebase uyumluluğu için - queryCollection zaten aynı yapıyı döndürüyor)
export const getDocs = async (queryResult) => {
  // Eğer promise ise, çözülmesini bekle
  if (queryResult instanceof Promise) {
    return await queryResult;
  }
  return queryResult;
};

// Batch işlemleri (Basitleştirilmiş)
export const batchOperations = async (operations) => {
  // Supabase'de gerçek transaction desteği için RPC kullanmak gerekir.
  // Burada sıralı işlemler olarak simüle ediyoruz.
  for (const op of operations) {
    if (op.type === 'update') {
      await updateDoc(op.collection, op.id, op.data);
    } else if (op.type === 'set') {
      await setDoc(op.collection, op.id, op.data);
    } else if (op.type === 'delete') {
      await deleteDoc(op.collection, op.id);
    } else if (op.type === 'add') {
      await addDoc(op.collection, op.data);
    }
  }
};

// Supabase client'ı da export et (gerekirse direkt kullanım için)
export { supabase };