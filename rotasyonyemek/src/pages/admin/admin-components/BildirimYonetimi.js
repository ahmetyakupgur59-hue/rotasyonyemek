import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';

const BildirimYonetimi = () => {
  const [bildirimler, setBildirimler] = useState([]);
  const [kullanicilar, setKullanicilar] = useState([]);
  const [restoranlar, setRestoranlar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [activeTab, setActiveTab] = useState('gonder');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTip, setFilterTip] = useState('all');
  
  // Bildirim gönderme formu
  const [form, setForm] = useState({
    baslik: '',
    mesaj: '',
    tip: 'genel', // genel, kisisel, restoran, toplu
    hedef_tip: 'hepsi', // hepsi, musteriler, restoranlar, secili
    hedef_kullanicilar: [],
    hedef_restoranlar: [],
    kanal: ['push'], // push, email, sms
    zamanla: false,
    zamanlama_tarihi: '',
    zamanlama_saati: '',
    link: '',
    gorsel_url: '',
    oncelik: 'normal' // dusuk, normal, yuksek, acil
  });

  const [stats, setStats] = useState({
    toplam: 0,
    bugun: 0,
    okunmamis: 0,
    basarili: 0
  });

  // Bildirim şablonları
  const sablonlar = [
    { id: 1, ad: '🎉 Hoş Geldin', baslik: 'Hoş Geldiniz!', mesaj: 'Rotasyon Yemek\'e hoş geldiniz! İlk siparişinize %20 indirim kazanın.' },
    { id: 2, ad: '🛒 Sepet Hatırlatma', baslik: 'Sepetinizi Unuttunuz!', mesaj: 'Sepetinizde ürünler bekliyor. Siparişinizi tamamlayın!' },
    { id: 3, ad: '⭐ Yorum İste', baslik: 'Siparişiniz Nasıldı?', mesaj: 'Son siparişinizi değerlendirin ve puan kazanın!' },
    { id: 4, ad: '🎁 Kampanya', baslik: 'Özel Kampanya!', mesaj: 'Bugüne özel %30 indirim fırsatını kaçırmayın!' },
    { id: 5, ad: '🚚 Teslimat Bilgisi', baslik: 'Siparişiniz Yolda!', mesaj: 'Siparişiniz teslimata çıktı. Tahmini süre: 30 dakika.' }
  ];

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Bildirimleri çek
      const { data: bildirimData } = await supabase
        .from('bildirimler')
        .select(`
          *,
          kullanici:kullanici_id(id, email, ad)
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      setBildirimler(bildirimData || []);

      // Kullanıcıları çek
      const { data: kullaniciData } = await supabase
        .from('kullanicilar')
        .select('id, email, ad, rol')
        .order('ad');
      setKullanicilar(kullaniciData || []);

      // Restoranları çek
      const { data: restoranData } = await supabase
        .from('restoranlar')
        .select('id, ad')
        .eq('aktif', true)
        .order('ad');
      setRestoranlar(restoranData || []);

      // İstatistikler
      const bugun = new Date().toISOString().split('T')[0];
      const bugunBildirimler = bildirimData?.filter(b => b.created_at?.startsWith(bugun)) || [];
      const okunmamislar = bildirimData?.filter(b => !b.okundu) || [];
      const basarililar = bildirimData?.filter(b => b.durum === 'gonderildi') || [];

      setStats({
        toplam: bildirimData?.length || 0,
        bugun: bugunBildirimler.length,
        okunmamis: okunmamislar.length,
        basarili: basarililar.length
      });

    } catch (error) {
      console.error('Veri çekme hatası:', error);
      showMessage('error', 'Veriler yüklenirken hata oluştu');
    }
    setLoading(false);
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  // Şablon uygula
  const applySablon = (sablon) => {
    setForm({ ...form, baslik: sablon.baslik, mesaj: sablon.mesaj });
  };

  // Bildirim gönder
  const handleSend = async () => {
    if (!form.baslik.trim() || !form.mesaj.trim()) {
      showMessage('error', 'Başlık ve mesaj zorunludur');
      return;
    }

    if (form.hedef_tip === 'secili' && form.hedef_kullanicilar.length === 0) {
      showMessage('error', 'En az bir kullanıcı seçin');
      return;
    }

    setSaving(true);
    try {
      let hedefKullanicilar = [];

      // Hedef kullanıcıları belirle
      if (form.hedef_tip === 'hepsi') {
        hedefKullanicilar = kullanicilar.map(k => k.id);
      } else if (form.hedef_tip === 'musteriler') {
        hedefKullanicilar = kullanicilar.filter(k => k.rol === 'musteri').map(k => k.id);
      } else if (form.hedef_tip === 'restoranlar') {
        hedefKullanicilar = kullanicilar.filter(k => k.rol === 'restoran').map(k => k.id);
      } else if (form.hedef_tip === 'secili') {
        hedefKullanicilar = form.hedef_kullanicilar;
      }

      // Her kullanıcı için bildirim oluştur
      const bildirimlerToInsert = hedefKullanicilar.map(kullaniciId => ({
        kullanici_id: kullaniciId,
        baslik: form.baslik.trim(),
        mesaj: form.mesaj.trim(),
        tip: form.tip,
        kanal: form.kanal.join(','),
        link: form.link?.trim() || null,
        gorsel_url: form.gorsel_url?.trim() || null,
        oncelik: form.oncelik,
        okundu: false,
        durum: form.zamanla ? 'planli' : 'gonderildi',
        zamanlama: form.zamanla ? `${form.zamanlama_tarihi}T${form.zamanlama_saati}` : null
      }));

      const { error } = await supabase
        .from('bildirimler')
        .insert(bildirimlerToInsert);

      if (error) throw error;

      showMessage('success', `${hedefKullanicilar.length} kullanıcıya bildirim gönderildi`);
      setForm({
        baslik: '',
        mesaj: '',
        tip: 'genel',
        hedef_tip: 'hepsi',
        hedef_kullanicilar: [],
        hedef_restoranlar: [],
        kanal: ['push'],
        zamanla: false,
        zamanlama_tarihi: '',
        zamanlama_saati: '',
        link: '',
        gorsel_url: '',
        oncelik: 'normal'
      });
      fetchAllData();
    } catch (error) {
      console.error('Gönderme hatası:', error);
      showMessage('error', 'Bildirim gönderilemedi');
    }
    setSaving(false);
  };

  // Bildirim sil
  const handleDelete = async (id) => {
    if (!window.confirm('Bu bildirimi silmek istediğinize emin misiniz?')) return;

    try {
      const { error } = await supabase.from('bildirimler').delete().eq('id', id);
      if (error) throw error;
      showMessage('success', 'Bildirim silindi');
      fetchAllData();
    } catch (error) {
      showMessage('error', 'Silme başarısız');
    }
  };

  // Filtreleme
  const filteredBildirimler = bildirimler.filter(b => {
    if (searchTerm && !b.baslik?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !b.mesaj?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterTip !== 'all' && b.tip !== filterTip) return false;
    return true;
  });

  const styles = {
    container: { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
    header: { marginBottom: '24px' },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#1a1a2e', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' },
    subtitle: { color: '#666', fontSize: '14px' },
    message: { padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' },
    successMessage: { backgroundColor: '#d4edda', color: '#155724' },
    errorMessage: { backgroundColor: '#f8d7da', color: '#721c24' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' },
    statCard: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' },
    statValue: { fontSize: '32px', fontWeight: 'bold' },
    statLabel: { fontSize: '13px', color: '#666', marginTop: '4px' },
    tabs: { display: 'flex', gap: '0', marginBottom: '24px', backgroundColor: 'white', borderRadius: '12px', padding: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
    tab: { flex: 1, padding: '12px 24px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '14px', fontWeight: '500', borderRadius: '8px', transition: 'all 0.2s' },
    activeTab: { backgroundColor: '#667eea', color: 'white' },
    card: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: '24px' },
    formSection: { marginBottom: '24px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '12px' },
    formSectionTitle: { fontSize: '14px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' },
    inputGroup: { marginBottom: '16px' },
    label: { display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' },
    input: { width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' },
    textarea: { width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', minHeight: '100px', resize: 'vertical', boxSizing: 'border-box' },
    select: { width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', backgroundColor: 'white' },
    row: { display: 'flex', gap: '16px', flexWrap: 'wrap' },
    col: { flex: 1, minWidth: '200px' },
    button: { padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '8px' },
    primaryButton: { backgroundColor: '#667eea', color: 'white' },
    outlineButton: { backgroundColor: 'white', border: '1px solid #e0e0e0', color: '#333' },
    sablonGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginTop: '12px' },
    sablonCard: { padding: '12px', border: '1px solid #e0e0e0', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' },
    checkboxGroup: { display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '8px' },
    checkbox: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' },
    multiSelect: { border: '1px solid #ddd', borderRadius: '8px', maxHeight: '150px', overflowY: 'auto', marginTop: '8px' },
    multiSelectItem: { padding: '10px 12px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' },
    multiSelectItemSelected: { backgroundColor: '#e3f2fd' },
    bildirimCard: { padding: '16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
    bildirimContent: { flex: 1 },
    bildirimBaslik: { fontWeight: '600', marginBottom: '4px' },
    bildirimMesaj: { color: '#666', fontSize: '13px', marginBottom: '8px' },
    bildirimMeta: { display: 'flex', gap: '12px', fontSize: '11px', color: '#999' },
    badge: { padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' },
    successBadge: { backgroundColor: '#d4edda', color: '#155724' },
    warningBadge: { backgroundColor: '#fff3cd', color: '#856404' },
    infoBadge: { backgroundColor: '#cce5ff', color: '#004085' },
    deleteBtn: { padding: '6px 12px', border: '1px solid #dc3545', borderRadius: '6px', backgroundColor: 'white', color: '#dc3545', cursor: 'pointer', fontSize: '12px' },
    emptyState: { textAlign: 'center', padding: '40px' },
    toolbar: { display: 'flex', gap: '12px', marginBottom: '20px' },
    searchInput: { padding: '10px 16px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', width: '250px' },
    previewCard: { backgroundColor: '#1a1a2e', color: 'white', borderRadius: '12px', padding: '20px', marginTop: '20px' },
    previewHeader: { fontSize: '12px', color: '#888', marginBottom: '8px' },
    previewBaslik: { fontSize: '16px', fontWeight: '600', marginBottom: '8px' },
    previewMesaj: { fontSize: '14px', opacity: 0.9 }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}><span>🔔</span> Bildirim Yönetimi</h1>
        <p style={styles.subtitle}>Push, Email ve SMS bildirimleri gönderin ve yönetin</p>
      </div>

      {message.text && (
        <div style={{ ...styles.message, ...(message.type === 'success' ? styles.successMessage : styles.errorMessage) }}>
          <span>{message.type === 'success' ? '✅' : '❌'}</span>
          {message.text}
        </div>
      )}

      {/* İstatistikler */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.toplam}</div>
          <div style={styles.statLabel}>Toplam Bildirim</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: '#667eea' }}>{stats.bugun}</div>
          <div style={styles.statLabel}>Bugün Gönderilen</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: '#ffc107' }}>{stats.okunmamis}</div>
          <div style={styles.statLabel}>Okunmamış</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: '#28a745' }}>{stats.basarili}</div>
          <div style={styles.statLabel}>Başarılı</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button style={{ ...styles.tab, ...(activeTab === 'gonder' ? styles.activeTab : {}) }} onClick={() => setActiveTab('gonder')}>
          📤 Bildirim Gönder
        </button>
        <button style={{ ...styles.tab, ...(activeTab === 'gecmis' ? styles.activeTab : {}) }} onClick={() => setActiveTab('gecmis')}>
          📋 Gönderim Geçmişi
        </button>
      </div>

      {/* Bildirim Gönder */}
      {activeTab === 'gonder' && (
        <div style={styles.card}>
          {/* Şablonlar */}
          <div style={styles.formSection}>
            <div style={styles.formSectionTitle}><span>📋</span> Hızlı Şablonlar</div>
            <div style={styles.sablonGrid}>
              {sablonlar.map(s => (
                <div key={s.id} style={styles.sablonCard} onClick={() => applySablon(s)}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#667eea'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e0e0e0'}
                >
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{s.ad.split(' ')[0]}</div>
                  <div style={{ fontSize: '13px', fontWeight: '500' }}>{s.ad.split(' ').slice(1).join(' ')}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bildirim İçeriği */}
          <div style={styles.formSection}>
            <div style={styles.formSectionTitle}><span>✏️</span> Bildirim İçeriği</div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Başlık *</label>
              <input
                type="text"
                style={styles.input}
                value={form.baslik}
                onChange={(e) => setForm({ ...form, baslik: e.target.value })}
                placeholder="Bildirim başlığı..."
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Mesaj *</label>
              <textarea
                style={styles.textarea}
                value={form.mesaj}
                onChange={(e) => setForm({ ...form, mesaj: e.target.value })}
                placeholder="Bildirim mesajı..."
              />
            </div>
            <div style={styles.row}>
              <div style={styles.col}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Link (Opsiyonel)</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={form.link}
                    onChange={(e) => setForm({ ...form, link: e.target.value })}
                    placeholder="/kampanyalar veya https://..."
                  />
                </div>
              </div>
              <div style={styles.col}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Öncelik</label>
                  <select style={styles.select} value={form.oncelik} onChange={(e) => setForm({ ...form, oncelik: e.target.value })}>
                    <option value="dusuk">🟢 Düşük</option>
                    <option value="normal">🟡 Normal</option>
                    <option value="yuksek">🟠 Yüksek</option>
                    <option value="acil">🔴 Acil</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Hedef Kitle */}
          <div style={styles.formSection}>
            <div style={styles.formSectionTitle}><span>🎯</span> Hedef Kitle</div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Kime Gönderilsin?</label>
              <select style={styles.select} value={form.hedef_tip} onChange={(e) => setForm({ ...form, hedef_tip: e.target.value, hedef_kullanicilar: [] })}>
                <option value="hepsi">🌍 Tüm Kullanıcılar ({kullanicilar.length})</option>
                <option value="musteriler">👥 Sadece Müşteriler ({kullanicilar.filter(k => k.rol === 'musteri').length})</option>
                <option value="restoranlar">🏪 Sadece Restoranlar ({kullanicilar.filter(k => k.rol === 'restoran').length})</option>
                <option value="secili">✅ Seçili Kullanıcılar</option>
              </select>
            </div>

            {form.hedef_tip === 'secili' && (
              <div style={styles.inputGroup}>
                <label style={styles.label}>Kullanıcılar Seçin ({form.hedef_kullanicilar.length} seçili)</label>
                <div style={styles.multiSelect}>
                  {kullanicilar.map(k => (
                    <div
                      key={k.id}
                      style={{ ...styles.multiSelectItem, ...(form.hedef_kullanicilar.includes(k.id) ? styles.multiSelectItemSelected : {}) }}
                      onClick={() => {
                        const newList = form.hedef_kullanicilar.includes(k.id)
                          ? form.hedef_kullanicilar.filter(id => id !== k.id)
                          : [...form.hedef_kullanicilar, k.id];
                        setForm({ ...form, hedef_kullanicilar: newList });
                      }}
                    >
                      <input type="checkbox" checked={form.hedef_kullanicilar.includes(k.id)} readOnly />
                      <span>{k.ad || k.email}</span>
                      <span style={{ ...styles.badge, ...styles.infoBadge, marginLeft: 'auto' }}>{k.rol}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Gönderim Kanalları */}
          <div style={styles.formSection}>
            <div style={styles.formSectionTitle}><span>📡</span> Gönderim Kanalları</div>
            <div style={styles.checkboxGroup}>
              {['push', 'email', 'sms'].map(kanal => (
                <label key={kanal} style={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={form.kanal.includes(kanal)}
                    onChange={(e) => {
                      const newKanal = e.target.checked
                        ? [...form.kanal, kanal]
                        : form.kanal.filter(k => k !== kanal);
                      setForm({ ...form, kanal: newKanal });
                    }}
                  />
                  <span>
                    {kanal === 'push' ? '📱 Push Notification' : kanal === 'email' ? '📧 Email' : '📲 SMS'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Zamanlama */}
          <div style={styles.formSection}>
            <div style={styles.formSectionTitle}><span>⏰</span> Zamanlama</div>
            <label style={styles.checkbox}>
              <input
                type="checkbox"
                checked={form.zamanla}
                onChange={(e) => setForm({ ...form, zamanla: e.target.checked })}
              />
              <span>İleri tarihte gönder</span>
            </label>
            {form.zamanla && (
              <div style={{ ...styles.row, marginTop: '16px' }}>
                <div style={styles.col}>
                  <input
                    type="date"
                    style={styles.input}
                    value={form.zamanlama_tarihi}
                    onChange={(e) => setForm({ ...form, zamanlama_tarihi: e.target.value })}
                  />
                </div>
                <div style={styles.col}>
                  <input
                    type="time"
                    style={styles.input}
                    value={form.zamanlama_saati}
                    onChange={(e) => setForm({ ...form, zamanlama_saati: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Önizleme */}
          {(form.baslik || form.mesaj) && (
            <div style={styles.previewCard}>
              <div style={styles.previewHeader}>📱 Bildirim Önizleme</div>
              <div style={styles.previewBaslik}>{form.baslik || 'Başlık'}</div>
              <div style={styles.previewMesaj}>{form.mesaj || 'Mesaj içeriği...'}</div>
            </div>
          )}

          {/* Gönder Butonu */}
          <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button style={{ ...styles.button, ...styles.outlineButton }} onClick={() => setForm({
              baslik: '', mesaj: '', tip: 'genel', hedef_tip: 'hepsi', hedef_kullanicilar: [], hedef_restoranlar: [], kanal: ['push'], zamanla: false, zamanlama_tarihi: '', zamanlama_saati: '', link: '', gorsel_url: '', oncelik: 'normal'
            })}>
              🔄 Sıfırla
            </button>
            <button style={{ ...styles.button, ...styles.primaryButton }} onClick={handleSend} disabled={saving}>
              {saving ? '⏳ Gönderiliyor...' : (form.zamanla ? '📅 Zamanla' : '📤 Gönder')}
            </button>
          </div>
        </div>
      )}

      {/* Geçmiş */}
      {activeTab === 'gecmis' && (
        <div style={styles.card}>
          <div style={styles.toolbar}>
            <input
              type="text"
              placeholder="🔍 Bildirim ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
            <select value={filterTip} onChange={(e) => setFilterTip(e.target.value)} style={{ ...styles.select, width: 'auto' }}>
              <option value="all">Tüm Tipler</option>
              <option value="genel">Genel</option>
              <option value="kisisel">Kişisel</option>
              <option value="toplu">Toplu</option>
            </select>
          </div>

          {filteredBildirimler.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</div>
              <p>Bildirim bulunamadı</p>
            </div>
          ) : (
            filteredBildirimler.slice(0, 50).map(b => (
              <div key={b.id} style={styles.bildirimCard}>
                <div style={styles.bildirimContent}>
                  <div style={styles.bildirimBaslik}>
                    {b.baslik}
                    <span style={{ ...styles.badge, ...(b.durum === 'gonderildi' ? styles.successBadge : styles.warningBadge), marginLeft: '10px' }}>
                      {b.durum === 'gonderildi' ? '✅ Gönderildi' : '📅 Planlandı'}
                    </span>
                  </div>
                  <div style={styles.bildirimMesaj}>{b.mesaj}</div>
                  <div style={styles.bildirimMeta}>
                    <span>👤 {b.kullanici?.ad || b.kullanici?.email || 'Bilinmiyor'}</span>
                    <span>📅 {new Date(b.created_at).toLocaleString('tr-TR')}</span>
                    <span>{b.okundu ? '👁️ Okundu' : '📭 Okunmadı'}</span>
                  </div>
                </div>
                <button style={styles.deleteBtn} onClick={() => handleDelete(b.id)}>🗑️</button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default BildirimYonetimi;
