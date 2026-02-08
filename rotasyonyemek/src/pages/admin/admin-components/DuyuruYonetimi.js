// src/pages/admin/admin-components/DuyuruYonetimi.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import LoadingSpinner from './common/LoadingSpinner';
import Modal from './common/Modal';
import { 
    Megaphone, 
    Plus, 
    Search, 
    Edit, 
    Trash2, 
    Eye,
    EyeOff,
    Pin,
    Calendar,
    Users,
    Store,
    MapPin,
    AlertTriangle,
    Info,
    Gift,
    Wrench,
    RefreshCw,
    Image,
    Save,
    X,
    ChevronDown,
    Bell,
    CheckCircle,
    Clock
} from 'lucide-react';

const DuyuruYonetimi = () => {
    const [duyurular, setDuyurular] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingDuyuru, setEditingDuyuru] = useState(null);
    const [bolgeler, setBolgeler] = useState([]);
    const [formData, setFormData] = useState({
        baslik: '',
        icerik: '',
        ozet: '',
        resim_url: '',
        hedef_kitle: 'hepsi',
        hedef_bolge_id: '',
        tip: 'bilgi',
        oncelik: 0,
        aktif: true,
        sabitle: false,
        baslangic_tarihi: new Date().toISOString().slice(0, 16),
        bitis_tarihi: ''
    });
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTip, setFilterTip] = useState('');
    const [stats, setStats] = useState({ toplam: 0, aktif: 0, sabitlenmis: 0 });

    // Duyuru tipleri
    const duyuruTipleri = [
        { value: 'bilgi', label: 'Bilgi', icon: Info, color: 'blue' },
        { value: 'uyari', label: 'Uyarı', icon: AlertTriangle, color: 'yellow' },
        { value: 'kampanya', label: 'Kampanya', icon: Gift, color: 'purple' },
        { value: 'bakim', label: 'Bakım', icon: Wrench, color: 'orange' },
        { value: 'guncelleme', label: 'Güncelleme', icon: RefreshCw, color: 'green' }
    ];

    // Hedef kitle seçenekleri
    const hedefKitleler = [
        { value: 'hepsi', label: 'Herkes', icon: Users },
        { value: 'musteriler', label: 'Sadece Müşteriler', icon: Users },
        { value: 'restoranlar', label: 'Sadece Restoranlar', icon: Store },
        { value: 'belirli_bolge', label: 'Belirli Bölge', icon: MapPin }
    ];

    useEffect(() => {
        fetchDuyurular();
        fetchBolgeler();
    }, [searchTerm, filterTip]);

    const fetchDuyurular = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('duyurular')
                .select('*')
                .order('sabitle', { ascending: false })
                .order('created_at', { ascending: false });

            if (searchTerm) {
                query = query.or(`baslik.ilike.%${searchTerm}%,icerik.ilike.%${searchTerm}%`);
            }
            if (filterTip) {
                query = query.eq('tip', filterTip);
            }

            const { data, error } = await query;
            if (error) throw error;

            setDuyurular(data || []);

            // İstatistikler
            const aktifSayisi = data?.filter(d => d.aktif).length || 0;
            const sabitSayisi = data?.filter(d => d.sabitle).length || 0;
            setStats({
                toplam: data?.length || 0,
                aktif: aktifSayisi,
                sabitlenmis: sabitSayisi
            });
        } catch (error) {
            console.error('Duyurular yüklenirken hata:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBolgeler = async () => {
        try {
            const { data } = await supabase
                .from('bolgeler')
                .select('*')
                .order('ad', { ascending: true });
            setBolgeler(data || []);
        } catch (error) {
            console.error('Bölgeler yüklenirken hata:', error);
        }
    };

    // Modal aç
    const openModal = (duyuru = null) => {
        if (duyuru) {
            setEditingDuyuru(duyuru);
            setFormData({
                baslik: duyuru.baslik || '',
                icerik: duyuru.icerik || '',
                ozet: duyuru.ozet || '',
                resim_url: duyuru.resim_url || '',
                hedef_kitle: duyuru.hedef_kitle || 'hepsi',
                hedef_bolge_id: duyuru.hedef_bolge_id || '',
                tip: duyuru.tip || 'bilgi',
                oncelik: duyuru.oncelik || 0,
                aktif: duyuru.aktif ?? true,
                sabitle: duyuru.sabitle ?? false,
                baslangic_tarihi: duyuru.baslangic_tarihi ? new Date(duyuru.baslangic_tarihi).toISOString().slice(0, 16) : '',
                bitis_tarihi: duyuru.bitis_tarihi ? new Date(duyuru.bitis_tarihi).toISOString().slice(0, 16) : ''
            });
        } else {
            setEditingDuyuru(null);
            setFormData({
                baslik: '',
                icerik: '',
                ozet: '',
                resim_url: '',
                hedef_kitle: 'hepsi',
                hedef_bolge_id: '',
                tip: 'bilgi',
                oncelik: 0,
                aktif: true,
                sabitle: false,
                baslangic_tarihi: new Date().toISOString().slice(0, 16),
                bitis_tarihi: ''
            });
        }
        setShowModal(true);
    };

    // Kaydet
    const handleSave = async () => {
        if (!formData.baslik.trim() || !formData.icerik.trim()) {
            alert('Başlık ve içerik zorunludur!');
            return;
        }

        try {
            setSaving(true);

            const duyuruData = {
                baslik: formData.baslik.trim(),
                icerik: formData.icerik.trim(),
                ozet: formData.ozet.trim() || null,
                resim_url: formData.resim_url.trim() || null,
                hedef_kitle: formData.hedef_kitle,
                hedef_bolge_id: formData.hedef_kitle === 'belirli_bolge' ? formData.hedef_bolge_id : null,
                tip: formData.tip,
                oncelik: parseInt(formData.oncelik) || 0,
                aktif: formData.aktif,
                sabitle: formData.sabitle,
                baslangic_tarihi: formData.baslangic_tarihi || new Date().toISOString(),
                bitis_tarihi: formData.bitis_tarihi || null,
                updated_at: new Date().toISOString()
            };

            if (editingDuyuru) {
                const { error } = await supabase
                    .from('duyurular')
                    .update(duyuruData)
                    .eq('id', editingDuyuru.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('duyurular')
                    .insert([duyuruData]);
                if (error) throw error;
            }

            setShowModal(false);
            fetchDuyurular();
        } catch (error) {
            console.error('Kaydetme hatası:', error);
            alert('Kaydetme sırasında hata oluştu!');
        } finally {
            setSaving(false);
        }
    };

    // Sil
    const handleDelete = async (id) => {
        if (!window.confirm('Bu duyuruyu silmek istediğinize emin misiniz?')) return;

        try {
            const { error } = await supabase
                .from('duyurular')
                .delete()
                .eq('id', id);
            if (error) throw error;
            fetchDuyurular();
        } catch (error) {
            console.error('Silme hatası:', error);
        }
    };

    // Aktiflik değiştir
    const toggleAktif = async (duyuru) => {
        try {
            const { error } = await supabase
                .from('duyurular')
                .update({ aktif: !duyuru.aktif, updated_at: new Date().toISOString() })
                .eq('id', duyuru.id);
            if (error) throw error;
            fetchDuyurular();
        } catch (error) {
            console.error('Durum değiştirme hatası:', error);
        }
    };

    // Sabitle/Kaldır
    const toggleSabitle = async (duyuru) => {
        try {
            const { error } = await supabase
                .from('duyurular')
                .update({ sabitle: !duyuru.sabitle, updated_at: new Date().toISOString() })
                .eq('id', duyuru.id);
            if (error) throw error;
            fetchDuyurular();
        } catch (error) {
            console.error('Sabitleme hatası:', error);
        }
    };

    // Tip bilgisi
    const getTipInfo = (tip) => {
        return duyuruTipleri.find(t => t.value === tip) || duyuruTipleri[0];
    };

    // Tarih formatla
    const formatTarih = (tarih) => {
        if (!tarih) return '-';
        return new Intl.DateTimeFormat('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(tarih));
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl">
                            <Megaphone className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Duyuru Yönetimi</h1>
                            <p className="text-gray-600">Kullanıcılara duyuru ve bildirimler gönderin</p>
                        </div>
                    </div>
                    <button
                        onClick={() => openModal()}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Yeni Duyuru
                    </button>
                </div>
            </div>

            {/* İstatistikler */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Megaphone className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Toplam Duyuru</p>
                            <p className="text-2xl font-bold text-gray-800">{stats.toplam}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Aktif</p>
                            <p className="text-2xl font-bold text-green-600">{stats.aktif}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Pin className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Sabitlenmiş</p>
                            <p className="text-2xl font-bold text-purple-600">{stats.sabitlenmis}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtreler */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Duyuru ara..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                    </div>
                    <select
                        value={filterTip}
                        onChange={(e) => setFilterTip(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    >
                        <option value="">Tüm Tipler</option>
                        {duyuruTipleri.map(tip => (
                            <option key={tip.value} value={tip.value}>{tip.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Duyuru Listesi */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <LoadingSpinner message="Duyurular yükleniyor..." />
                ) : duyurular.length === 0 ? (
                    <div className="text-center py-12">
                        <Megaphone className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-900">Duyuru bulunamadı</h3>
                        <p className="text-gray-500 mt-1">Henüz duyuru eklenmemiş</p>
                        <button
                            onClick={() => openModal()}
                            className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                        >
                            İlk Duyuruyu Ekle
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {duyurular.map((duyuru) => {
                            const tipInfo = getTipInfo(duyuru.tip);
                            const TipIcon = tipInfo.icon;

                            return (
                                <div 
                                    key={duyuru.id} 
                                    className={`p-4 hover:bg-gray-50 transition-colors ${
                                        duyuru.sabitle ? 'bg-purple-50 border-l-4 border-purple-500' : ''
                                    } ${!duyuru.aktif ? 'opacity-60' : ''}`}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Resim veya İkon */}
                                        {duyuru.resim_url ? (
                                            <img 
                                                src={duyuru.resim_url} 
                                                alt={duyuru.baslik}
                                                className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                                            />
                                        ) : (
                                            <div className={`p-3 rounded-lg bg-${tipInfo.color}-100 flex-shrink-0`}>
                                                <TipIcon className={`h-6 w-6 text-${tipInfo.color}-600`} />
                                            </div>
                                        )}

                                        {/* İçerik */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                {duyuru.sabitle && (
                                                    <Pin className="h-4 w-4 text-purple-600" />
                                                )}
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-${tipInfo.color}-100 text-${tipInfo.color}-700`}>
                                                    <TipIcon className="h-3 w-3" />
                                                    {tipInfo.label}
                                                </span>
                                                {!duyuru.aktif && (
                                                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                        Pasif
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="font-medium text-gray-900">{duyuru.baslik}</h3>
                                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                                {duyuru.ozet || duyuru.icerik}
                                            </p>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Users className="h-3.5 w-3.5" />
                                                    {hedefKitleler.find(h => h.value === duyuru.hedef_kitle)?.label || 'Herkes'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    {formatTarih(duyuru.created_at)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Eye className="h-3.5 w-3.5" />
                                                    {duyuru.goruntulenme_sayisi || 0} görüntülenme
                                                </span>
                                            </div>
                                        </div>

                                        {/* Aksiyonlar */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => toggleSabitle(duyuru)}
                                                className={`p-2 rounded-lg transition-colors ${
                                                    duyuru.sabitle 
                                                        ? 'bg-purple-100 text-purple-600' 
                                                        : 'hover:bg-gray-100 text-gray-500'
                                                }`}
                                                title={duyuru.sabitle ? 'Sabitlemeyi Kaldır' : 'Sabitle'}
                                            >
                                                <Pin className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => toggleAktif(duyuru)}
                                                className={`p-2 rounded-lg transition-colors ${
                                                    duyuru.aktif 
                                                        ? 'hover:bg-gray-100 text-green-600' 
                                                        : 'hover:bg-gray-100 text-gray-400'
                                                }`}
                                                title={duyuru.aktif ? 'Pasif Yap' : 'Aktif Yap'}
                                            >
                                                {duyuru.aktif ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                            </button>
                                            <button
                                                onClick={() => openModal(duyuru)}
                                                className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                                                title="Düzenle"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(duyuru.id)}
                                                className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                                                title="Sil"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Duyuru Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {editingDuyuru ? 'Duyuru Düzenle' : 'Yeni Duyuru'}
                                </h3>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Başlık */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Başlık <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.baslik}
                                    onChange={(e) => setFormData({ ...formData, baslik: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    placeholder="Duyuru başlığı"
                                />
                            </div>

                            {/* Özet */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Kısa Özet
                                </label>
                                <input
                                    type="text"
                                    value={formData.ozet}
                                    onChange={(e) => setFormData({ ...formData, ozet: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    placeholder="Listede görünecek kısa açıklama"
                                />
                            </div>

                            {/* İçerik */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    İçerik <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={formData.icerik}
                                    onChange={(e) => setFormData({ ...formData, icerik: e.target.value })}
                                    rows={5}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                                    placeholder="Duyuru içeriği"
                                />
                            </div>

                            {/* Resim URL */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Resim URL
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        value={formData.resim_url}
                                        onChange={(e) => setFormData({ ...formData, resim_url: e.target.value })}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        placeholder="https://example.com/image.jpg"
                                    />
                                    {formData.resim_url && (
                                        <img 
                                            src={formData.resim_url} 
                                            alt="Önizleme" 
                                            className="h-10 w-10 object-cover rounded-lg border"
                                            onError={(e) => e.target.style.display = 'none'}
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Tip */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Duyuru Tipi
                                    </label>
                                    <select
                                        value={formData.tip}
                                        onChange={(e) => setFormData({ ...formData, tip: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                    >
                                        {duyuruTipleri.map(tip => (
                                            <option key={tip.value} value={tip.value}>{tip.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Hedef Kitle */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Hedef Kitle
                                    </label>
                                    <select
                                        value={formData.hedef_kitle}
                                        onChange={(e) => setFormData({ ...formData, hedef_kitle: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                    >
                                        {hedefKitleler.map(kitle => (
                                            <option key={kitle.value} value={kitle.value}>{kitle.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Bölge Seçimi (eğer belirli bölge seçildiyse) */}
                            {formData.hedef_kitle === 'belirli_bolge' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Bölge
                                    </label>
                                    <select
                                        value={formData.hedef_bolge_id}
                                        onChange={(e) => setFormData({ ...formData, hedef_bolge_id: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                    >
                                        <option value="">Bölge seçin</option>
                                        {bolgeler.map(bolge => (
                                            <option key={bolge.id} value={bolge.id}>{bolge.ad}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                {/* Başlangıç Tarihi */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Başlangıç Tarihi
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={formData.baslangic_tarihi}
                                        onChange={(e) => setFormData({ ...formData, baslangic_tarihi: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>

                                {/* Bitiş Tarihi */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Bitiş Tarihi (Opsiyonel)
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={formData.bitis_tarihi}
                                        onChange={(e) => setFormData({ ...formData, bitis_tarihi: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                            </div>

                            {/* Checkbox'lar */}
                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.aktif}
                                        onChange={(e) => setFormData({ ...formData, aktif: e.target.checked })}
                                        className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                                    />
                                    <span className="text-sm text-gray-700">Aktif</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.sabitle}
                                        onChange={(e) => setFormData({ ...formData, sabitle: e.target.checked })}
                                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                    />
                                    <span className="text-sm text-gray-700">Üstte Sabitle</span>
                                </label>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
                            >
                                {saving ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                {saving ? 'Kaydediliyor...' : 'Kaydet'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DuyuruYonetimi;
