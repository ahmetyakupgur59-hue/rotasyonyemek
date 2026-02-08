// src/services/supabase.js

import { createClient } from '@supabase/supabase-js'

// ==========================================
// SUPABASE CLIENT (MEVCUT YAPILANDIRMANIZ)
// ==========================================
const supabaseUrl = 'https://kssbshmfxquaqigmbppc.supabase.co'
const supabaseKey = 'sb_publishable_xMdLsII-ozs1oHYUZuUpew_hd5YMobX'

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: localStorage
    }
});

// ==========================================
// AUTH SERVİSLERİ
// ==========================================
export const authService = {
    // Giriş yap
    login: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        })
        return { data, error }
    },

    // Kayıt ol
    signup: async (email, password) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password
        })
        return { data, error }
    },

    // Çıkış yap
    logout: async () => {
        const { error } = await supabase.auth.signOut()
        return { error }
    },

    // Mevcut oturumu al
    getSession: async () => {
        const { data, error } = await supabase.auth.getSession()
        return { data, error }
    },

    // Şifre sıfırlama maili gönder
    resetPassword: async (email) => {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/sifre-sifirla`
        })
        return { data, error }
    },

    // Şifre güncelle
    updatePassword: async (newPassword) => {
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        })
        return { data, error }
    }
}

// ==========================================
// KULLANICI SERVİSLERİ
// ==========================================
export const userService = {
    // Kullanıcı detaylarını getir
    getById: async (userId) => {
        const { data, error } = await supabase
            .from('kullanicilar')
            .select('*')
            .eq('id', userId)
            .single()
        return { data, error }
    },

    // Kullanıcı oluştur
    create: async (userData) => {
        const { data, error } = await supabase
            .from('kullanicilar')
            .insert([userData])
            .select()
            .single()
        return { data, error }
    },

    // Kullanıcı güncelle
    update: async (userId, updates) => {
        const { data, error } = await supabase
            .from('kullanicilar')
            .update({ ...updates, guncellenme_tarihi: new Date().toISOString() })
            .eq('id', userId)
            .select()
            .single()
        return { data, error }
    },

    // Tüm kullanıcıları getir (Admin için)
    getAll: async (filters = {}) => {
        let query = supabase.from('kullanicilar').select('*')

        if (filters.rol) query = query.eq('rol', filters.rol)
        if (filters.search) {
            query = query.or(`ad_soyad.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
        }

        const { data, error } = await query.order('olusturma_tarihi', { ascending: false })
        return { data, error }
    }
}

// ==========================================
// RESTORAN SERVİSLERİ
// ==========================================
export const restaurantService = {
    // Tüm restoranları getir
    getAll: async (filters = {}) => {
        let query = supabase
            .from('restaurants')
            .select(`
                *,
                kategoriler(id, ad),
                bolgeler(id, ad)
            `)

        if (filters.aktif !== undefined) query = query.eq('aktif', filters.aktif)
        if (filters.kategori_id) query = query.eq('kategori_id', filters.kategori_id)
        if (filters.bolge_id) query = query.eq('bolge_id', filters.bolge_id)
        if (filters.sehir) query = query.eq('sehir', filters.sehir)
        if (filters.search) {
            query = query.or(`ad.ilike.%${filters.search}%,aciklama.ilike.%${filters.search}%`)
        }

        const { data, error } = await query.order('created_at', { ascending: false })
        return { data, error }
    },

    // Tek restoran getir
    getById: async (id) => {
        const { data, error } = await supabase
            .from('restaurants')
            .select(`
                *,
                kategoriler(id, ad),
                bolgeler(id, ad)
            `)
            .eq('id', id)
            .single()
        return { data, error }
    },

    // Restoran oluştur
    create: async (restaurantData) => {
        const { data, error } = await supabase
            .from('restaurants')
            .insert([restaurantData])
            .select()
            .single()
        return { data, error }
    },

    // Restoran güncelle
    update: async (id, updates) => {
        const { data, error } = await supabase
            .from('restaurants')
            .update(updates)
            .eq('id', id)
            .select()
            .single()
        return { data, error }
    },

    // Restoran sil
    delete: async (id) => {
        const { error } = await supabase
            .from('restaurants')
            .delete()
            .eq('id', id)
        return { error }
    },

    // Restoran sahibinin restoranını getir
    getByOwner: async (ownerId) => {
        const { data, error } = await supabase
            .from('restaurants')
            .select('*')
            .eq('sahibi_id', ownerId)
            .single()
        return { data, error }
    },

    // Popüler restoranlar
    getPopular: async (limit = 10) => {
        const { data, error } = await supabase
            .from('restaurants')
            .select('*')
            .eq('aktif', true)
            .order('ortalama_puan', { ascending: false })
            .limit(limit)
        return { data, error }
    }
}

// ==========================================
// ÜRÜN SERVİSLERİ
// ==========================================
export const productService = {
    // Restoranın ürünlerini getir
    getByRestaurant: async (restaurantId, filters = {}) => {
        let query = supabase
            .from('urunler')
            .select(`
                *,
                kategoriler(id, ad)
            `)
            .eq('restoran_id', restaurantId)

        if (filters.kategori_id) query = query.eq('kategori_id', filters.kategori_id)
        if (filters.aktif !== undefined) query = query.eq('aktif', filters.aktif)
        if (filters.search) {
            query = query.ilike('ad', `%${filters.search}%`)
        }

        const { data, error } = await query.order('sira', { ascending: true })
        return { data, error }
    },

    // Tek ürün getir
    getById: async (id) => {
        const { data, error } = await supabase
            .from('urunler')
            .select(`
                *,
                kategoriler(id, ad),
                restaurants(id, ad)
            `)
            .eq('id', id)
            .single()
        return { data, error }
    },

    // Ürün oluştur
    create: async (productData) => {
        const { data, error } = await supabase
            .from('urunler')
            .insert([productData])
            .select()
            .single()
        return { data, error }
    },

    // Ürün güncelle
    update: async (id, updates) => {
        const { data, error } = await supabase
            .from('urunler')
            .update(updates)
            .eq('id', id)
            .select()
            .single()
        return { data, error }
    },

    // Ürün sil
    delete: async (id) => {
        const { error } = await supabase
            .from('urunler')
            .delete()
            .eq('id', id)
        return { error }
    }
}

// ==========================================
// SİPARİŞ SERVİSLERİ
// ==========================================
export const orderService = {
    // Sipariş oluştur
    create: async (orderData, orderItems) => {
        // Önce siparişi oluştur
        const { data: siparis, error: siparisError } = await supabase
            .from('siparisler')
            .insert([orderData])
            .select()
            .single()

        if (siparisError) return { data: null, error: siparisError }

        // Sipariş detaylarını ekle
        const detaylar = orderItems.map(item => ({
            siparis_id: siparis.id,
            urun_id: item.urun_id || item.id,
            urun_adi: item.urun_adi || item.ad,
            adet: item.adet,
            birim_fiyat: item.birim_fiyat || item.fiyat,
            toplam_fiyat: item.adet * (item.birim_fiyat || item.fiyat)
        }))

        const { error: detayError } = await supabase
            .from('siparis_detaylari')
            .insert(detaylar)

        if (detayError) {
            // Hata durumunda siparişi sil (rollback)
            await supabase.from('siparisler').delete().eq('id', siparis.id)
            return { data: null, error: detayError }
        }

        return { data: siparis, error: null }
    },

    // Müşterinin siparişleri
    getByCustomer: async (customerId, filters = {}) => {
        let query = supabase
            .from('siparisler')
            .select(`
                *,
                restaurants(id, ad, logo_url),
                siparis_detaylari(*)
            `)
            .eq('musteri_id', customerId)

        if (filters.durum) {
            if (Array.isArray(filters.durum)) {
                query = query.in('durum', filters.durum)
            } else {
                query = query.eq('durum', filters.durum)
            }
        }

        const { data, error } = await query.order('created_at', { ascending: false })
        return { data, error }
    },

    // Restoranın siparişleri
    getByRestaurant: async (restaurantId, filters = {}) => {
        let query = supabase
            .from('siparisler')
            .select(`
                *,
                kullanicilar(id, ad_soyad, telefon, email),
                siparis_detaylari(*)
            `)
            .eq('restoran_id', restaurantId)

        if (filters.durum) {
            if (Array.isArray(filters.durum)) {
                query = query.in('durum', filters.durum)
            } else {
                query = query.eq('durum', filters.durum)
            }
        }

        const { data, error } = await query.order('created_at', { ascending: false })
        return { data, error }
    },

    // Tek sipariş getir
    getById: async (id) => {
        const { data, error } = await supabase
            .from('siparisler')
            .select(`
                *,
                kullanicilar(id, ad_soyad, telefon, email),
                restaurants(id, ad, telefon, adres),
                siparis_detaylari(*)
            `)
            .eq('id', id)
            .single()
        return { data, error }
    },

    // Sipariş durumu güncelle
    updateStatus: async (id, status, notes = null) => {
        const updates = { durum: status }

        if (status === 'teslim_edildi') {
            updates.teslim_tarihi = new Date().toISOString()
        }

        if (notes) {
            updates.notlar = notes
        }

        const { data, error } = await supabase
            .from('siparisler')
            .update(updates)
            .eq('id', id)
            .select()
            .single()
        return { data, error }
    },

    // Tüm siparişler (Admin için)
    getAll: async (filters = {}) => {
        let query = supabase
            .from('siparisler')
            .select(`
                *,
                kullanicilar(id, ad_soyad, email),
                restaurants(id, ad)
            `)

        if (filters.durum) query = query.eq('durum', filters.durum)
        if (filters.restoran_id) query = query.eq('restoran_id', filters.restoran_id)

        const { data, error } = await query
            .order('created_at', { ascending: false })
            .limit(filters.limit || 100)

        return { data, error }
    }
}

// ==========================================
// KATEGORİ SERVİSLERİ
// ==========================================
export const categoryService = {
    getAll: async () => {
        const { data, error } = await supabase
            .from('kategoriler')
            .select('*')
            .order('sira', { ascending: true })
        return { data, error }
    },

    create: async (categoryData) => {
        const { data, error } = await supabase
            .from('kategoriler')
            .insert([categoryData])
            .select()
            .single()
        return { data, error }
    },

    update: async (id, updates) => {
        const { data, error } = await supabase
            .from('kategoriler')
            .update(updates)
            .eq('id', id)
            .select()
            .single()
        return { data, error }
    },

    delete: async (id) => {
        const { error } = await supabase
            .from('kategoriler')
            .delete()
            .eq('id', id)
        return { error }
    }
}

// ==========================================
// BÖLGE SERVİSLERİ (Şehir, İlçe, Mahalle)
// ==========================================
export const locationService = {
    // Şehirler
    getCities: async () => {
        const { data, error } = await supabase
            .from('sehirler')
            .select('*')
            .order('ad', { ascending: true })
        return { data, error }
    },

    // İlçeler
    getDistricts: async (cityId) => {
        const { data, error } = await supabase
            .from('ilceler')
            .select('*')
            .eq('sehir_id', cityId)
            .order('ad', { ascending: true })
        return { data, error }
    },

    // Mahalleler
    getNeighborhoods: async (districtId) => {
        const { data, error } = await supabase
            .from('mahalleler')
            .select('*')
            .eq('ilce_id', districtId)
            .order('ad', { ascending: true })
        return { data, error }
    },

    // Bölgeler
    getRegions: async () => {
        const { data, error } = await supabase
            .from('bolgeler')
            .select('*')
            .order('ad', { ascending: true })
        return { data, error }
    }
}

// ==========================================
// KUPON SERVİSLERİ
// ==========================================
export const couponService = {
    // Kupon doğrula
    validate: async (code, orderTotal = 0) => {
        const { data, error } = await supabase
            .from('kuponlar')
            .select('*')
            .eq('kod', code.toUpperCase())
            .eq('aktif', true)
            .single()

        if (error || !data) {
            return { valid: false, error: 'Geçersiz kupon kodu' }
        }

        // Kullanım limiti kontrolü
        if (data.max_kullanim && data.kullanim_sayisi >= data.max_kullanim) {
            return { valid: false, error: 'Kupon kullanım limiti dolmuş' }
        }

        // Minimum tutar kontrolü
        if (data.min_tutar && orderTotal < data.min_tutar) {
            return { valid: false, error: `Minimum sipariş tutarı: ${data.min_tutar} TL` }
        }

        // İndirim hesapla
        let discount = 0
        if (data.indirim_tipi === 'yuzde') {
            discount = (orderTotal * data.indirim_degeri) / 100
            if (data.max_indirim && discount > data.max_indirim) {
                discount = data.max_indirim
            }
        } else {
            discount = data.indirim_degeri
        }

        return { valid: true, coupon: data, discount }
    },

    // Tüm kuponları getir (Admin)
    getAll: async () => {
        const { data, error } = await supabase
            .from('kuponlar')
            .select('*')
            .order('created_at', { ascending: false })
        return { data, error }
    }
}

// ==========================================
// KAMPANYA SERVİSLERİ
// ==========================================
export const campaignService = {
    // Aktif kampanyaları getir
    getActive: async () => {
        const now = new Date().toISOString()
        const { data, error } = await supabase
            .from('kampanyalar')
            .select('*')
            .eq('aktif', true)
            .lte('baslangic_tarihi', now)
            .gte('bitis_tarihi', now)
        return { data, error }
    },

    // Tüm kampanyaları getir (Admin)
    getAll: async () => {
        const { data, error } = await supabase
            .from('kampanyalar')
            .select('*')
            .order('created_at', { ascending: false })
        return { data, error }
    }
}

// ==========================================
// BANNER SERVİSLERİ
// ==========================================
export const bannerService = {
    // Aktif bannerları getir
    getActive: async () => {
        const { data, error } = await supabase
            .from('bannerlar')
            .select('*')
            .eq('aktif', true)
            .order('sira', { ascending: true })
        return { data, error }
    },

    // Tüm bannerları getir (Admin)
    getAll: async () => {
        const { data, error } = await supabase
            .from('bannerlar')
            .select('*')
            .order('sira', { ascending: true })
        return { data, error }
    }
}

// ==========================================
// YORUM SERVİSLERİ
// ==========================================
export const reviewService = {
    // Restoran yorumlarını getir
    getByRestaurant: async (restaurantId) => {
        const { data, error } = await supabase
            .from('yorumlar')
            .select(`
                *,
                kullanicilar(id, ad_soyad)
            `)
            .eq('restoran_id', restaurantId)
            .order('created_at', { ascending: false })
        return { data, error }
    },

    // Yorum ekle
    create: async (reviewData) => {
        const { data, error } = await supabase
            .from('yorumlar')
            .insert([reviewData])
            .select()
            .single()
        return { data, error }
    }
}

// ==========================================
// BİLDİRİM SERVİSLERİ
// ==========================================
export const notificationService = {
    // Kullanıcının bildirimlerini getir
    getByUser: async (userId) => {
        const { data, error } = await supabase
            .from('bildirimler')
            .select('*')
            .eq('kullanici_id', userId)
            .order('created_at', { ascending: false })
            .limit(50)
        return { data, error }
    },

    // Okunmamış bildirimleri getir
    getUnreadCount: async (userId) => {
        const { count, error } = await supabase
            .from('bildirimler')
            .select('*', { count: 'exact', head: true })
            .eq('kullanici_id', userId)
            .eq('okundu', false)
        return { count, error }
    },

    // Okundu olarak işaretle
    markAsRead: async (id) => {
        const { error } = await supabase
            .from('bildirimler')
            .update({ okundu: true })
            .eq('id', id)
        return { error }
    },

    // Tümünü okundu olarak işaretle
    markAllAsRead: async (userId) => {
        const { error } = await supabase
            .from('bildirimler')
            .update({ okundu: true })
            .eq('kullanici_id', userId)
        return { error }
    }
}

// ==========================================
// FİNANS & HAKEDİŞ SERVİSLERİ
// ==========================================
export const financeService = {
    // Restoran hakedişleri
    getEarnings: async (restaurantId) => {
        const { data, error } = await supabase
            .from('hakedisler')
            .select('*')
            .eq('restoran_id', restaurantId)
            .order('yil', { ascending: false })
            .order('ay', { ascending: false })
        return { data, error }
    },

    // Tüm hakedişler (Admin)
    getAllEarnings: async (filters = {}) => {
        let query = supabase
            .from('hakedisler')
            .select(`
                *,
                restaurants(id, ad)
            `)

        if (filters.durum) query = query.eq('durum', filters.durum)

        const { data, error } = await query
            .order('yil', { ascending: false })
            .order('ay', { ascending: false })
        return { data, error }
    }
}

// ==========================================
// DASHBOARD İSTATİSTİKLERİ
// ==========================================
export const dashboardService = {
    // Admin Dashboard istatistikleri
    getAdminStats: async () => {
        try {
            // Toplam sayılar - her biri ayrı try-catch ile
            let totalUsers = 0, totalRestaurants = 0, totalOrders = 0, todayOrders = 0

            try {
                const { count } = await supabase
                    .from('kullanicilar')
                    .select('*', { count: 'exact', head: true })
                totalUsers = count || 0
            } catch (e) { console.log('kullanicilar count error') }

            try {
                const { count } = await supabase
                    .from('restaurants')
                    .select('*', { count: 'exact', head: true })
                    .eq('aktif', true)
                totalRestaurants = count || 0
            } catch (e) { console.log('restaurants count error') }

            try {
                const { count } = await supabase
                    .from('siparisler')
                    .select('*', { count: 'exact', head: true })
                totalOrders = count || 0
            } catch (e) { console.log('siparisler count error') }

            try {
                const today = new Date().toISOString().split('T')[0]
                const { count } = await supabase
                    .from('siparisler')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', today)
                todayOrders = count || 0
            } catch (e) { console.log('today orders count error') }

            return {
                totalUsers,
                totalRestaurants,
                totalOrders,
                todayOrders,
                monthlyRevenue: 0
            }
        } catch (error) {
            console.error('Dashboard stats error:', error)
            return {
                totalUsers: 0,
                totalRestaurants: 0,
                totalOrders: 0,
                todayOrders: 0,
                monthlyRevenue: 0
            }
        }
    },

    // Restoran Dashboard istatistikleri
    getRestaurantStats: async (restaurantId) => {
        try {
            const today = new Date().toISOString().split('T')[0]

            const [todayResult, pendingResult] = await Promise.all([
                supabase
                    .from('siparisler')
                    .select('*', { count: 'exact', head: true })
                    .eq('restoran_id', restaurantId)
                    .gte('created_at', today),
                supabase
                    .from('siparisler')
                    .select('*', { count: 'exact', head: true })
                    .eq('restoran_id', restaurantId)
                    .in('durum', ['beklemede', 'onaylandi', 'hazirlaniyor'])
            ])

            return {
                todayOrders: todayResult.count || 0,
                pendingOrders: pendingResult.count || 0
            }
        } catch (error) {
            console.error('Restaurant stats error:', error)
            return { todayOrders: 0, pendingOrders: 0 }
        }
    }
}

// ==========================================
// DOSYA YÜKLEME SERVİSLERİ
// ==========================================
export const storageService = {
    // Dosya yükle
    upload: async (bucket, path, file) => {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `${path}/${fileName}`

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filePath, file)

        if (error) return { url: null, error }

        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath)

        return { url: publicUrl, error: null }
    },

    // Dosya sil
    delete: async (bucket, path) => {
        const { error } = await supabase.storage
            .from(bucket)
            .remove([path])
        return { error }
    }
}

// Default export
export default supabase