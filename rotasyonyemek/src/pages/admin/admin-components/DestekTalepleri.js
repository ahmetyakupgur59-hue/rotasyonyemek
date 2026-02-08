// src/pages/admin/admin-components/DestekTalepleri.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import LoadingSpinner from './common/LoadingSpinner';
import Pagination from './common/Pagination';
import Modal from './common/Modal';
import { 
    Headphones, 
    Search, 
    Filter, 
    Plus,
    MessageSquare,
    User,
    Clock,
    AlertCircle,
    CheckCircle,
    XCircle,
    Eye,
    Send,
    ChevronDown,
    Phone,
    Mail,
    Tag,
    RefreshCw,
    MoreVertical,
    Inbox,
    AlertTriangle,
    Timer,
    UserCheck,
    FileText,
    Paperclip,
    ArrowRight,
    Store,
    ShoppingBag
} from 'lucide-react';

const DestekTalepleri = () => {
    const [talepler, setTalepler] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedTalep, setSelectedTalep] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [mesajlar, setMesajlar] = useState([]);
    const [yeniMesaj, setYeniMesaj] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);
    const [hazirCevaplar, setHazirCevaplar] = useState([]);
    const [showHazirCevaplar, setShowHazirCevaplar] = useState(false);
    const [filters, setFilters] = useState({
        durum: '',
        kategori: '',
        oncelik: '',
        search: ''
    });
    const [showFilters, setShowFilters] = useState(false);
    const [stats, setStats] = useState({
        toplam: 0,
        acik: 0,
        beklemede: 0,
        cozuldu: 0
    });

    const ITEMS_PER_PAGE = 15;

    // Kategoriler
    const kategoriler = [
        { value: 'siparis', label: 'Sipariş', icon: ShoppingBag, color: 'blue' },
        { value: 'restoran', label: 'Restoran', icon: Store, color: 'purple' },
        { value: 'odeme', label: 'Ödeme', icon: Tag, color: 'green' },
        { value: 'teknik', label: 'Teknik', icon: AlertCircle, color: 'orange' },
        { value: 'oneri', label: 'Öneri', icon: MessageSquare, color: 'teal' },
        { value: 'sikayet', label: 'Şikayet', icon: AlertTriangle, color: 'red' },
        { value: 'diger', label: 'Diğer', icon: FileText, color: 'gray' }
    ];

    // Öncelikler
    const oncelikler = [
        { value: 'dusuk', label: 'Düşük', color: 'gray' },
        { value: 'normal', label: 'Normal', color: 'blue' },
        { value: 'yuksek', label: 'Yüksek', color: 'orange' },
        { value: 'acil', label: 'Acil', color: 'red' }
    ];

    // Durumlar
    const durumlar = [
        { value: 'acik', label: 'Açık', color: 'blue', icon: Inbox },
        { value: 'inceleniyor', label: 'İnceleniyor', color: 'yellow', icon: Eye },
        { value: 'beklemede', label: 'Beklemede', color: 'orange', icon: Timer },
        { value: 'cozuldu', label: 'Çözüldü', color: 'green', icon: CheckCircle },
        { value: 'kapali', label: 'Kapalı', color: 'gray', icon: XCircle }
    ];

    // Verileri yükle
    useEffect(() => {
        fetchTalepler();
        fetchStats();
        fetchHazirCevaplar();
    }, [currentPage, filters]);

    const fetchTalepler = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('destek_talepleri')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false });

            // Filtreler
            if (filters.durum) query = query.eq('durum', filters.durum);
            if (filters.kategori) query = query.eq('kategori', filters.kategori);
            if (filters.oncelik) query = query.eq('oncelik', filters.oncelik);
            if (filters.search) {
                query = query.or(`talep_no.ilike.%${filters.search}%,konu.ilike.%${filters.search}%,kullanici_email.ilike.%${filters.search}%`);
            }

            // Pagination
            const from = (currentPage - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;

            if (error) throw error;

            setTalepler(data || []);
            setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
        } catch (error) {
            console.error('Talepler yüklenirken hata:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const [toplamRes, acikRes, beklemedRes, cozulduRes] = await Promise.all([
                supabase.from('destek_talepleri').select('*', { count: 'exact', head: true }),
                supabase.from('destek_talepleri').select('*', { count: 'exact', head: true }).eq('durum', 'acik'),
                supabase.from('destek_talepleri').select('*', { count: 'exact', head: true }).eq('durum', 'beklemede'),
                supabase.from('destek_talepleri').select('*', { count: 'exact', head: true }).eq('durum', 'cozuldu')
            ]);

            setStats({
                toplam: toplamRes.count || 0,
                acik: acikRes.count || 0,
                beklemede: beklemedRes.count || 0,
                cozuldu: cozulduRes.count || 0
            });
        } catch (error) {
            console.error('İstatistikler yüklenirken hata:', error);
        }
    };

    const fetchHazirCevaplar = async () => {
        try {
            const { data } = await supabase
                .from('hazir_cevaplar')
                .select('*')
                .eq('aktif', true)
                .order('kullanim_sayisi', { ascending: false });
            
            setHazirCevaplar(data || []);
        } catch (error) {
            console.error('Hazır cevaplar yüklenirken hata:', error);
        }
    };

    const fetchMesajlar = async (talepId) => {
        try {
            const { data } = await supabase
                .from('destek_mesajlari')
                .select('*')
                .eq('talep_id', talepId)
                .order('created_at', { ascending: true });
            
            setMesajlar(data || []);
        } catch (error) {
            console.error('Mesajlar yüklenirken hata:', error);
        }
    };

    // Talep detayını aç
    const openTalepDetail = async (talep) => {
        setSelectedTalep(talep);
        setShowDetailModal(true);
        await fetchMesajlar(talep.id);
        
        // Eğer talep açık ise, inceleniyor yap
        if (talep.durum === 'acik') {
            await updateTalepDurum(talep.id, 'inceleniyor');
        }
    };

    // Mesaj gönder
    const sendMessage = async () => {
        if (!yeniMesaj.trim() || !selectedTalep) return;

        try {
            setSendingMessage(true);

            const { error } = await supabase
                .from('destek_mesajlari')
                .insert({
                    talep_id: selectedTalep.id,
                    gonderen_rol: 'admin',
                    gonderen_adi: 'Destek Ekibi',
                    mesaj: yeniMesaj.trim()
                });

            if (error) throw error;

            // Talep durumunu güncelle
            await supabase
                .from('destek_talepleri')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', selectedTalep.id);

            setYeniMesaj('');
            await fetchMesajlar(selectedTalep.id);
        } catch (error) {
            console.error('Mesaj gönderilirken hata:', error);
        } finally {
            setSendingMessage(false);
        }
    };

    // Hazır cevap kullan
    const applyHazirCevap = async (cevap) => {
        setYeniMesaj(cevap.icerik);
        setShowHazirCevaplar(false);

        // Kullanım sayısını artır
        await supabase
            .from('hazir_cevaplar')
            .update({ kullanim_sayisi: (cevap.kullanim_sayisi || 0) + 1 })
            .eq('id', cevap.id);
    };

    // Durum güncelle
    const updateTalepDurum = async (talepId, yeniDurum) => {
        try {
            const updates = { 
                durum: yeniDurum,
                updated_at: new Date().toISOString()
            };

            if (yeniDurum === 'cozuldu') {
                updates.cozum_tarihi = new Date().toISOString();
            }

            await supabase
                .from('destek_talepleri')
                .update(updates)
                .eq('id', talepId);

            // Listeyi güncelle
            setTalepler(prev => prev.map(t => 
                t.id === talepId ? { ...t, ...updates } : t
            ));

            if (selectedTalep?.id === talepId) {
                setSelectedTalep(prev => ({ ...prev, ...updates }));
            }

            fetchStats();
        } catch (error) {
            console.error('Durum güncellenirken hata:', error);
        }
    };

    // Tarihi formatla
    const formatTarih = (tarih) => {
        if (!tarih) return '-';
        const date = new Date(tarih);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 60) return `${minutes} dakika önce`;
        if (hours < 24) return `${hours} saat önce`;
        if (days < 7) return `${days} gün önce`;
        
        return new Intl.DateTimeFormat('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    // Kategori bilgisi
    const getKategoriInfo = (kategori) => {
        return kategoriler.find(k => k.value === kategori) || kategoriler[6];
    };

    // Öncelik bilgisi
    const getOncelikInfo = (oncelik) => {
        return oncelikler.find(o => o.value === oncelik) || oncelikler[1];
    };

    // Durum bilgisi
    const getDurumInfo = (durum) => {
        return durumlar.find(d => d.value === durum) || durumlar[0];
    };

    // Filtreleri temizle
    const clearFilters = () => {
        setFilters({ durum: '', kategori: '', oncelik: '', search: '' });
        setCurrentPage(1);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                            <Headphones className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Destek Talepleri</h1>
                            <p className="text-gray-600">Müşteri ve restoran destek taleplerini yönetin</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchTalepler}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Yenile
                    </button>
                </div>
            </div>

            {/* İstatistik Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Inbox className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Toplam Talep</p>
                            <p className="text-2xl font-bold text-gray-800">{stats.toplam}</p>
                        </div>
                    </div>
                </div>
                <div 
                    onClick={() => setFilters({ ...filters, durum: 'acik' })}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:border-blue-300 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <AlertCircle className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Açık</p>
                            <p className="text-2xl font-bold text-blue-600">{stats.acik}</p>
                        </div>
                    </div>
                </div>
                <div 
                    onClick={() => setFilters({ ...filters, durum: 'beklemede' })}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:border-orange-300 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <Timer className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Beklemede</p>
                            <p className="text-2xl font-bold text-orange-600">{stats.beklemede}</p>
                        </div>
                    </div>
                </div>
                <div 
                    onClick={() => setFilters({ ...filters, durum: 'cozuldu' })}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:border-green-300 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Çözüldü</p>
                            <p className="text-2xl font-bold text-green-600">{stats.cozuldu}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtreler */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Arama */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            placeholder="Talep no, konu veya email ara..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                    </div>

                    {/* Hızlı Filtreler */}
                    <select
                        value={filters.durum}
                        onChange={(e) => setFilters({ ...filters, durum: e.target.value })}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="">Tüm Durumlar</option>
                        {durumlar.map(d => (
                            <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                    </select>

                    <select
                        value={filters.kategori}
                        onChange={(e) => setFilters({ ...filters, kategori: e.target.value })}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="">Tüm Kategoriler</option>
                        {kategoriler.map(k => (
                            <option key={k.value} value={k.value}>{k.label}</option>
                        ))}
                    </select>

                    <select
                        value={filters.oncelik}
                        onChange={(e) => setFilters({ ...filters, oncelik: e.target.value })}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="">Tüm Öncelikler</option>
                        {oncelikler.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>

                    {(filters.durum || filters.kategori || filters.oncelik || filters.search) && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <XCircle className="h-4 w-4" />
                            Temizle
                        </button>
                    )}
                </div>
            </div>

            {/* Talep Listesi */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <LoadingSpinner message="Talepler yükleniyor..." />
                ) : talepler.length === 0 ? (
                    <div className="text-center py-12">
                        <Headphones className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-900">Talep bulunamadı</h3>
                        <p className="text-gray-500 mt-1">Henüz destek talebi yok veya filtreleri değiştirin</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {talepler.map((talep) => {
                            const kategoriInfo = getKategoriInfo(talep.kategori);
                            const oncelikInfo = getOncelikInfo(talep.oncelik);
                            const durumInfo = getDurumInfo(talep.durum);
                            const KategoriIcon = kategoriInfo.icon;
                            const DurumIcon = durumInfo.icon;

                            return (
                                <div 
                                    key={talep.id}
                                    onClick={() => openTalepDetail(talep)}
                                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                                        talep.durum === 'acik' ? 'bg-blue-50/50' : ''
                                    } ${talep.oncelik === 'acil' ? 'border-l-4 border-red-500' : ''}`}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Sol: İkon */}
                                        <div className={`p-2 rounded-lg bg-${kategoriInfo.color}-100 flex-shrink-0`}>
                                            <KategoriIcon className={`h-5 w-5 text-${kategoriInfo.color}-600`} />
                                        </div>

                                        {/* Orta: İçerik */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-mono text-gray-500">{talep.talep_no}</span>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-${durumInfo.color}-100 text-${durumInfo.color}-700`}>
                                                    <DurumIcon className="h-3 w-3" />
                                                    {durumInfo.label}
                                                </span>
                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-${oncelikInfo.color}-100 text-${oncelikInfo.color}-700`}>
                                                    {oncelikInfo.label}
                                                </span>
                                            </div>
                                            <h3 className="font-medium text-gray-900 truncate">{talep.konu}</h3>
                                            <p className="text-sm text-gray-500 truncate mt-1">{talep.mesaj}</p>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <User className="h-3.5 w-3.5" />
                                                    {talep.kullanici_adi || talep.kullanici_email || 'Anonim'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    {formatTarih(talep.created_at)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Sağ: Ok */}
                                        <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                )}
            </div>

            {/* Talep Detay Modal */}
            {showDetailModal && selectedTalep && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-mono text-gray-500">{selectedTalep.talep_no}</span>
                                <h3 className="text-lg font-semibold text-gray-900">{selectedTalep.konu}</h3>
                            </div>
                            <button
                                onClick={() => {
                                    setShowDetailModal(false);
                                    setSelectedTalep(null);
                                    setMesajlar([]);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="flex flex-1 overflow-hidden">
                            {/* Sol: Mesajlar */}
                            <div className="flex-1 flex flex-col border-r border-gray-200">
                                {/* Mesaj Listesi */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {/* İlk mesaj (talep) */}
                                    <div className="flex gap-3">
                                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                            <User className="h-4 w-4 text-gray-600" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-gray-900">
                                                    {selectedTalep.kullanici_adi || 'Müşteri'}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {formatTarih(selectedTalep.created_at)}
                                                </span>
                                            </div>
                                            <div className="bg-gray-100 rounded-lg p-3">
                                                <p className="text-gray-800">{selectedTalep.mesaj}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Diğer mesajlar */}
                                    {mesajlar.map((mesaj) => (
                                        <div 
                                            key={mesaj.id} 
                                            className={`flex gap-3 ${mesaj.gonderen_rol === 'admin' ? 'flex-row-reverse' : ''}`}
                                        >
                                            <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                mesaj.gonderen_rol === 'admin' ? 'bg-purple-100' : 'bg-gray-200'
                                            }`}>
                                                {mesaj.gonderen_rol === 'admin' ? (
                                                    <Headphones className="h-4 w-4 text-purple-600" />
                                                ) : (
                                                    <User className="h-4 w-4 text-gray-600" />
                                                )}
                                            </div>
                                            <div className={`flex-1 ${mesaj.gonderen_rol === 'admin' ? 'text-right' : ''}`}>
                                                <div className={`flex items-center gap-2 mb-1 ${mesaj.gonderen_rol === 'admin' ? 'justify-end' : ''}`}>
                                                    <span className="font-medium text-gray-900">
                                                        {mesaj.gonderen_adi || (mesaj.gonderen_rol === 'admin' ? 'Destek Ekibi' : 'Müşteri')}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {formatTarih(mesaj.created_at)}
                                                    </span>
                                                </div>
                                                <div className={`inline-block rounded-lg p-3 max-w-[80%] ${
                                                    mesaj.gonderen_rol === 'admin' 
                                                        ? 'bg-purple-100 text-purple-900' 
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                    <p>{mesaj.mesaj}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Mesaj Gönderme */}
                                <div className="p-4 border-t border-gray-200 flex-shrink-0">
                                    <div className="flex items-end gap-2">
                                        <div className="flex-1 relative">
                                            <textarea
                                                value={yeniMesaj}
                                                onChange={(e) => setYeniMesaj(e.target.value)}
                                                placeholder="Mesajınızı yazın..."
                                                rows={3}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                                            />
                                            <button
                                                onClick={() => setShowHazirCevaplar(!showHazirCevaplar)}
                                                className="absolute right-2 bottom-2 text-gray-400 hover:text-gray-600"
                                                title="Hazır cevaplar"
                                            >
                                                <FileText className="h-5 w-5" />
                                            </button>

                                            {/* Hazır Cevaplar Dropdown */}
                                            {showHazirCevaplar && (
                                                <div className="absolute bottom-full right-0 mb-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                    <div className="p-2 border-b border-gray-200">
                                                        <span className="text-sm font-medium text-gray-700">Hazır Cevaplar</span>
                                                    </div>
                                                    {hazirCevaplar.map(cevap => (
                                                        <button
                                                            key={cevap.id}
                                                            onClick={() => applyHazirCevap(cevap)}
                                                            className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                                                        >
                                                            <p className="font-medium text-sm text-gray-900">{cevap.baslik}</p>
                                                            <p className="text-xs text-gray-500 truncate">{cevap.icerik}</p>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={sendMessage}
                                            disabled={!yeniMesaj.trim() || sendingMessage}
                                            className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {sendingMessage ? (
                                                <RefreshCw className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <Send className="h-5 w-5" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Sağ: Detaylar */}
                            <div className="w-72 p-4 overflow-y-auto flex-shrink-0">
                                <h4 className="font-medium text-gray-900 mb-4">Talep Bilgileri</h4>
                                
                                <div className="space-y-4">
                                    {/* Durum Değiştir */}
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">Durum</label>
                                        <select
                                            value={selectedTalep.durum}
                                            onChange={(e) => updateTalepDurum(selectedTalep.id, e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                        >
                                            {durumlar.map(d => (
                                                <option key={d.value} value={d.value}>{d.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Kategori */}
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">Kategori</label>
                                        <p className="font-medium text-gray-900">
                                            {getKategoriInfo(selectedTalep.kategori).label}
                                        </p>
                                    </div>

                                    {/* Öncelik */}
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">Öncelik</label>
                                        <p className="font-medium text-gray-900">
                                            {getOncelikInfo(selectedTalep.oncelik).label}
                                        </p>
                                    </div>

                                    <hr />

                                    {/* Müşteri Bilgileri */}
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-2">Müşteri Bilgileri</label>
                                        <div className="space-y-2">
                                            {selectedTalep.kullanici_adi && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <User className="h-4 w-4 text-gray-400" />
                                                    <span>{selectedTalep.kullanici_adi}</span>
                                                </div>
                                            )}
                                            {selectedTalep.kullanici_email && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Mail className="h-4 w-4 text-gray-400" />
                                                    <a href={`mailto:${selectedTalep.kullanici_email}`} className="text-blue-600 hover:underline">
                                                        {selectedTalep.kullanici_email}
                                                    </a>
                                                </div>
                                            )}
                                            {selectedTalep.kullanici_telefon && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Phone className="h-4 w-4 text-gray-400" />
                                                    <a href={`tel:${selectedTalep.kullanici_telefon}`} className="text-blue-600 hover:underline">
                                                        {selectedTalep.kullanici_telefon}
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <hr />

                                    {/* Tarihler */}
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">Oluşturulma</label>
                                        <p className="text-sm text-gray-900">{formatTarih(selectedTalep.created_at)}</p>
                                    </div>

                                    {selectedTalep.cozum_tarihi && (
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-1">Çözüm Tarihi</label>
                                            <p className="text-sm text-gray-900">{formatTarih(selectedTalep.cozum_tarihi)}</p>
                                        </div>
                                    )}

                                    {/* Hızlı İşlemler */}
                                    <div className="pt-4 space-y-2">
                                        {selectedTalep.durum !== 'cozuldu' && (
                                            <button
                                                onClick={() => updateTalepDurum(selectedTalep.id, 'cozuldu')}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                            >
                                                <CheckCircle className="h-4 w-4" />
                                                Çözüldü Olarak İşaretle
                                            </button>
                                        )}
                                        {selectedTalep.durum !== 'kapali' && (
                                            <button
                                                onClick={() => updateTalepDurum(selectedTalep.id, 'kapali')}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                            >
                                                <XCircle className="h-4 w-4" />
                                                Talebi Kapat
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DestekTalepleri;
