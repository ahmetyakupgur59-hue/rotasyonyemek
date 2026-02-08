// src/pages/admin/Admin.js

import React, { useState, useEffect, useRef } from 'react';
import Dashboard from './admin-components/Dashboard';
import RestoranYonetimi from './admin-components/RestoranYonetimi';
import KullaniciYonetimi from './admin-components/KullaniciYonetimi';
import SiparisYonetimi from './admin-components/SiparisYonetimi';
import KategoriYonetimi from './admin-components/KategoriYonetimi';
import BolgeYonetimi from './admin-components/BolgeYonetimi';
import KomisyonYonetimi from './admin-components/KomisyonYonetimi';
import KuponYonetimi from './admin-components/KuponYonetimi';
import KampanyaYonetimi from './admin-components/KampanyaYonetimi';
import BannerYonetimi from './admin-components/BannerYonetimi';
import FinansYonetimi from './admin-components/FinansYonetimi';
import SistemAyarlari from './admin-components/SistemAyarlari';
import AktiviteLoglari from './admin-components/AktiviteLoglari';
import DestekTalepleri from './admin-components/DestekTalepleri';
import DuyuruYonetimi from './admin-components/DuyuruYonetimi';
import { ToastProvider } from './admin-components/common/Toast';

// ==================== MENU GROUPS ====================
const menuGroups = [
  {
    title: 'Ana Menü',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: '📊',
        component: Dashboard,
        description: 'Genel bakış ve istatistikler'
      },
      {
        id: 'restoranlar',
        label: 'Restoranlar',
        icon: '🏪',
        component: RestoranYonetimi,
        description: 'Restoran yönetimi'
      },
      {
        id: 'kullanicilar',
        label: 'Kullanıcılar',
        icon: '👥',
        component: KullaniciYonetimi,
        description: 'Kullanıcı yönetimi'
      },
      {
        id: 'siparisler',
        label: 'Siparişler',
        icon: '📦',
        component: SiparisYonetimi,
        description: 'Sipariş takibi',
        badge: 0 // Dinamik olarak güncellenecek
      }
    ]
  },
  {
    title: 'Yönetim',
    items: [
      {
        id: 'kategoriler',
        label: 'Kategoriler',
        icon: '🏷️',
        component: KategoriYonetimi,
        description: 'Kategori yönetimi'
      },
      {
        id: 'bolgeler',
        label: 'Bölgeler',
        icon: '📍',
        component: BolgeYonetimi,
        description: 'Bölge yönetimi'
      },
      {
        id: 'komisyonlar',
        label: 'Komisyonlar',
        icon: '💰',
        component: KomisyonYonetimi,
        description: 'Komisyon oranları'
      }
    ]
  },
  {
    title: 'Pazarlama',
    items: [
      {
        id: 'kuponlar',
        label: 'Kuponlar',
        icon: '🎟️',
        component: KuponYonetimi,
        description: 'Kupon yönetimi'
      },
      {
        id: 'kampanyalar',
        label: 'Kampanyalar',
        icon: '🎯',
        component: KampanyaYonetimi,
        description: 'Kampanya yönetimi'
      },
      {
        id: 'bannerlar',
        label: 'Bannerlar',
        icon: '🖼️',
        component: BannerYonetimi,
        description: 'Banner yönetimi'
      },
      {
        id: 'duyurular',
        label: 'Duyurular',
        icon: '📢',
        component: DuyuruYonetimi,
        description: 'Duyuru ve bildirim yönetimi'
      }
    ]
  },
  {
    title: 'Finans',
    items: [
      {
        id: 'finans',
        label: 'Finans & Hakediş',
        icon: '🏦',
        component: FinansYonetimi,
        description: 'Finansal işlemler'
      }
    ]
  },
  {
    title: 'Destek',
    items: [
      {
        id: 'destek',
        label: 'Destek Talepleri',
        icon: '🎧',
        component: DestekTalepleri,
        description: 'Müşteri destek taleplerini yönet',
        badge: 0 // Dinamik olarak güncellenecek
      }
    ]
  },
  {
    title: 'Sistem',
    items: [
      {
        id: 'sistemayarlari',
        label: 'Sistem Ayarları',
        icon: '⚙️',
        component: SistemAyarlari,
        description: 'Platform ayarlarını yönet'
      },
      {
        id: 'aktiviteloglari',
        label: 'Aktivite Logları',
        icon: '📋',
        component: AktiviteLoglari,
        description: 'Sistem işlemlerini takip et'
      }
    ]
  }
];

// Tüm menü öğelerini düz liste olarak al
const getAllMenuItems = () => {
  return menuGroups.flatMap(group => group.items);
};

// ==================== ADMIN COMPONENT ====================
function Admin() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pendingOrders, setPendingOrders] = useState(0);
  const [pendingSupport, setPendingSupport] = useState(0);
  const userMenuRef = useRef(null);

  const allMenuItems = getAllMenuItems();

  // Saat güncelleme
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // User menu dışına tıklama kontrolü
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Bekleyen sipariş ve destek taleplerini kontrol et
  useEffect(() => {
    const fetchBadgeCounts = async () => {
      try {
        // Bu kısım supabase import edildiğinde aktif edilebilir
        // const { count: orderCount } = await supabase
        //   .from('siparisler')
        //   .select('*', { count: 'exact', head: true })
        //   .in('durum', ['beklemede', 'onaylandi']);
        // setPendingOrders(orderCount || 0);

        // const { count: supportCount } = await supabase
        //   .from('destek_talepleri')
        //   .select('*', { count: 'exact', head: true })
        //   .eq('durum', 'acik');
        // setPendingSupport(supportCount || 0);
      } catch (error) {
        console.error('Badge counts error:', error);
      }
    };

    fetchBadgeCounts();
    const interval = setInterval(fetchBadgeCounts, 60000); // Her dakika güncelle
    return () => clearInterval(interval);
  }, []);

  // Sayfa değişimi
  const handleSectionChange = (sectionId) => {
    if (sectionId === activeSection) return;
    
    setIsTransitioning(true);
    
    setTimeout(() => {
      setActiveSection(sectionId);
      setIsTransitioning(false);
    }, 150);
  };

  const ActiveComponent = allMenuItems.find(item => item.id === activeSection)?.component || Dashboard;
  const activeItem = allMenuItems.find(item => item.id === activeSection);

  const formatDate = (date) => {
    return date.toLocaleDateString('tr-TR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Badge değerini dinamik olarak al
  const getBadgeValue = (itemId) => {
    if (itemId === 'siparisler') return pendingOrders;
    if (itemId === 'destek') return pendingSupport;
    return 0;
  };

  return (
    <ToastProvider>
      <div style={styles.container}>
      {/* ==================== SIDEBAR ==================== */}
      <aside 
        style={{
          ...styles.sidebar,
          width: sidebarCollapsed ? '80px' : '280px',
        }}
      >
        {/* Logo */}
        <div style={styles.logoContainer}>
          <div style={styles.logoIcon}>🍽️</div>
          {!sidebarCollapsed && (
            <div style={styles.logoText}>
              <span style={styles.logoTitle}>Rotasyon</span>
              <span style={styles.logoSubtitle}>Yemek</span>
            </div>
          )}
        </div>

        {/* Toggle Button */}
        <button 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          style={styles.toggleButton}
          title={sidebarCollapsed ? 'Genişlet' : 'Daralt'}
        >
          <span style={{
            ...styles.toggleIcon,
            transform: sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)'
          }}>
            ◀
          </span>
        </button>

        {/* Navigation */}
        <nav style={styles.nav}>
          {menuGroups.map((group, groupIndex) => (
            <div key={groupIndex} style={styles.navSection}>
              {!sidebarCollapsed && (
                <span style={styles.navSectionTitle}>{group.title}</span>
              )}
              {group.items.map((item) => {
                const badgeValue = getBadgeValue(item.id);
                return (
                  <MenuItem 
                    key={item.id}
                    item={{ ...item, badge: badgeValue > 0 ? badgeValue : null }}
                    isActive={activeSection === item.id}
                    isCollapsed={sidebarCollapsed}
                    onClick={() => handleSectionChange(item.id)}
                  />
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div style={styles.sidebarFooter}>
          {!sidebarCollapsed && (
            <div style={styles.versionBadge}>
              <span>v3.0.0</span>
            </div>
          )}
          
          <a 
            href="/" 
            style={{
              ...styles.backToSite,
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            }}
          >
            <span style={styles.backIcon}>🏠</span>
            {!sidebarCollapsed && <span>Siteye Dön</span>}
          </a>
        </div>
      </aside>

      {/* ==================== MAIN CONTENT ==================== */}
      <main style={{
        ...styles.main,
        marginLeft: sidebarCollapsed ? '80px' : '280px',
      }}>
        {/* Top Header */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            {/* Breadcrumb */}
            <div style={styles.breadcrumb}>
              <span style={styles.breadcrumbItem}>Admin</span>
              <span style={styles.breadcrumbSeparator}>›</span>
              <span style={styles.breadcrumbCurrent}>{activeItem?.label}</span>
            </div>
            
            {/* Page Title */}
            <div style={styles.pageTitle}>
              <span style={styles.pageTitleIcon}>{activeItem?.icon}</span>
              <h1 style={styles.pageTitleText}>{activeItem?.label}</h1>
              {activeItem?.description && (
                <span style={styles.pageTitleDesc}>— {activeItem?.description}</span>
              )}
            </div>
          </div>

          <div style={styles.headerRight}>
            {/* Date & Time */}
            <div style={styles.dateTime}>
              <span style={styles.date}>{formatDate(currentTime)}</span>
              <span style={styles.time}>{formatTime(currentTime)}</span>
            </div>

            {/* Quick Actions */}
            <div style={styles.quickActions}>
              {/* Bekleyen Siparişler */}
              <button 
                style={{
                  ...styles.quickActionButton,
                  ...(activeSection === 'siparisler' && styles.quickActionButtonActive)
                }}
                onClick={() => handleSectionChange('siparisler')}
                title="Siparişler"
              >
                <span>📦</span>
                {pendingOrders > 0 && (
                  <span style={styles.quickActionBadge}>{pendingOrders}</span>
                )}
              </button>

              {/* Destek Talepleri */}
              <button 
                style={{
                  ...styles.quickActionButton,
                  ...(activeSection === 'destek' && styles.quickActionButtonActive)
                }}
                onClick={() => handleSectionChange('destek')}
                title="Destek Talepleri"
              >
                <span>🎧</span>
                {pendingSupport > 0 && (
                  <span style={styles.quickActionBadge}>{pendingSupport}</span>
                )}
              </button>

              {/* Bildirimler */}
              <button style={styles.quickActionButton} title="Bildirimler">
                <span>🔔</span>
                <span style={styles.quickActionBadge}>3</span>
              </button>
            </div>

            {/* User Menu */}
            <div style={styles.userMenuContainer} ref={userMenuRef}>
              <button 
                style={styles.userButton}
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div style={styles.userAvatar}>
                  <span>👤</span>
                </div>
                <div style={styles.userInfo}>
                  <span style={styles.userName}>Admin</span>
                  <span style={styles.userRole}>Yönetici</span>
                </div>
                <span style={{
                  ...styles.userArrow,
                  transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0deg)'
                }}>▼</span>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div style={styles.userDropdown}>
                  <div style={styles.dropdownHeader}>
                    <div style={styles.dropdownAvatar}>👤</div>
                    <div>
                      <p style={styles.dropdownName}>Admin User</p>
                      <p style={styles.dropdownEmail}>admin@rotasyonyemek.com</p>
                    </div>
                  </div>
                  <div style={styles.dropdownDivider}></div>
                  <button 
                    style={styles.dropdownItem}
                    onClick={() => handleSectionChange('sistemayarlari')}
                  >
                    <span>⚙️</span> Sistem Ayarları
                  </button>
                  <button 
                    style={styles.dropdownItem}
                    onClick={() => handleSectionChange('aktiviteloglari')}
                  >
                    <span>📋</span> Aktivite Logları
                  </button>
                  <div style={styles.dropdownDivider}></div>
                  <button style={styles.dropdownItemDanger}>
                    <span>🚪</span> Çıkış Yap
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div 
          style={{
            ...styles.content,
            opacity: isTransitioning ? 0 : 1,
            transform: isTransitioning ? 'translateY(10px)' : 'translateY(0)',
          }}
        >
          <ActiveComponent />
        </div>

        {/* Footer */}
        <footer style={styles.footer}>
          <p style={styles.footerText}>
            © 2024 RotasyonYemek Admin Panel v3.0 — Tüm hakları saklıdır.
          </p>
        </footer>
      </main>
    </div>
    </ToastProvider>
  );
}

// ==================== MENU ITEM COMPONENT ====================
const MenuItem = ({ item, isActive, isCollapsed, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...styles.menuItem,
        ...(isActive && styles.menuItemActive),
        ...(isHovered && !isActive && styles.menuItemHover),
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        padding: isCollapsed ? '14px' : '12px 16px',
      }}
      title={isCollapsed ? item.label : undefined}
    >
      {/* Active Indicator */}
      {isActive && <div style={styles.activeIndicator}></div>}
      
      {/* Icon */}
      <span style={{
        ...styles.menuIcon,
        ...(isActive && styles.menuIconActive),
      }}>
        {item.icon}
      </span>
      
      {/* Label */}
      {!isCollapsed && (
        <span style={{
          ...styles.menuLabel,
          ...(isActive && styles.menuLabelActive),
        }}>
          {item.label}
        </span>
      )}
      
      {/* Badge */}
      {item.badge && !isCollapsed && (
        <span style={styles.menuBadge}>{item.badge}</span>
      )}
      
      {/* Collapsed Badge */}
      {item.badge && isCollapsed && (
        <span style={styles.menuBadgeCollapsed}>{item.badge}</span>
      )}
    </button>
  );
};

// ==================== STYLES ====================
const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#f1f5f9',
  },

  // Sidebar
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '4px 0 24px rgba(0, 0, 0, 0.15)',
    overflowX: 'hidden',
  },
  
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '24px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    minHeight: '80px',
  },
  logoIcon: {
    fontSize: '32px',
    flexShrink: 0,
  },
  logoText: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  logoTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: '-0.5px',
    whiteSpace: 'nowrap',
  },
  logoSubtitle: {
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  },

  toggleButton: {
    position: 'absolute',
    top: '32px',
    right: '-14px',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    border: '3px solid #f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    transition: 'all 0.2s',
    zIndex: 10,
  },
  toggleIcon: {
    color: 'white',
    fontSize: '10px',
    transition: 'transform 0.3s',
  },

  nav: {
    flex: 1,
    padding: '16px 12px',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  navSection: {
    marginBottom: '20px',
  },
  navSectionTitle: {
    display: 'block',
    fontSize: '11px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    padding: '0 16px',
    marginBottom: '8px',
    whiteSpace: 'nowrap',
  },

  menuItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '12px',
    color: '#e2e8f0',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginBottom: '4px',
    position: 'relative',
    textAlign: 'left',
    fontSize: '14px',
    fontFamily: 'inherit',
    opacity: 1,
  },
  menuItemActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#ffffff',
  },
  menuItemHover: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: '4px',
    height: '24px',
    backgroundColor: '#3b82f6',
    borderRadius: '0 4px 4px 0',
  },
  menuIcon: {
    fontSize: '20px',
    transition: 'transform 0.2s',
    flexShrink: 0,
  },
  menuIconActive: {
    transform: 'scale(1.1)',
  },
  menuLabel: {
    fontSize: '14px',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  menuLabelActive: {
    fontWeight: '600',
  },
  menuBadge: {
    marginLeft: 'auto',
    backgroundColor: '#ef4444',
    color: 'white',
    fontSize: '11px',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: '10px',
    minWidth: '20px',
    textAlign: 'center',
    flexShrink: 0,
  },
  menuBadgeCollapsed: {
    position: 'absolute',
    top: '6px',
    right: '6px',
    backgroundColor: '#ef4444',
    color: 'white',
    fontSize: '9px',
    fontWeight: '600',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sidebarFooter: {
    padding: '16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  },
  versionBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#94a3b8',
    fontSize: '11px',
    padding: '4px 12px',
    borderRadius: '20px',
    textAlign: 'center',
    marginBottom: '12px',
  },
  backToSite: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    color: '#94a3b8',
    textDecoration: 'none',
    borderRadius: '12px',
    transition: 'all 0.2s',
    fontSize: '14px',
  },
  backIcon: {
    fontSize: '18px',
    flexShrink: 0,
  },

  // Main Content
  main: {
    flex: 1,
    transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },

  header: {
    position: 'sticky',
    top: 0,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 32px',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid #e2e8f0',
    zIndex: 100,
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
  },
  breadcrumbItem: {
    color: '#94a3b8',
  },
  breadcrumbSeparator: {
    color: '#cbd5e1',
  },
  breadcrumbCurrent: {
    color: '#3b82f6',
    fontWeight: '500',
  },
  pageTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  pageTitleIcon: {
    fontSize: '28px',
  },
  pageTitleText: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  pageTitleDesc: {
    fontSize: '14px',
    color: '#94a3b8',
    fontWeight: '400',
  },

  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  dateTime: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '2px',
  },
  date: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: '500',
  },
  time: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e293b',
  },

  // Quick Actions
  quickActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  quickActionButton: {
    position: 'relative',
    width: '44px',
    height: '44px',
    backgroundColor: '#f1f5f9',
    border: 'none',
    borderRadius: '12px',
    fontSize: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionButtonActive: {
    backgroundColor: '#3b82f6',
    color: 'white',
  },
  quickActionBadge: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    minWidth: '18px',
    height: '18px',
    backgroundColor: '#ef4444',
    color: 'white',
    fontSize: '10px',
    fontWeight: '600',
    borderRadius: '9px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid white',
    padding: '0 4px',
  },

  userMenuContainer: {
    position: 'relative',
  },
  userButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 12px',
    backgroundColor: '#f1f5f9',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  userAvatar: {
    width: '36px',
    height: '36px',
    backgroundColor: '#3b82f6',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  userName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
  },
  userRole: {
    fontSize: '12px',
    color: '#64748b',
  },
  userArrow: {
    fontSize: '10px',
    color: '#64748b',
    transition: 'transform 0.2s',
  },

  userDropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    width: '280px',
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
    border: '1px solid #e2e8f0',
    padding: '8px',
    zIndex: 1000,
  },
  dropdownHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    marginBottom: '8px',
  },
  dropdownAvatar: {
    width: '44px',
    height: '44px',
    backgroundColor: '#3b82f6',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
  },
  dropdownName: {
    margin: 0,
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
  },
  dropdownEmail: {
    margin: 0,
    fontSize: '12px',
    color: '#64748b',
  },
  dropdownDivider: {
    height: '1px',
    backgroundColor: '#e2e8f0',
    margin: '8px 0',
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    color: '#475569',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    transition: 'background-color 0.2s',
    backgroundColor: 'transparent',
    border: 'none',
    width: '100%',
    cursor: 'pointer',
    textAlign: 'left',
  },
  dropdownItemDanger: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    color: '#ef4444',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    width: '100%',
    transition: 'background-color 0.2s',
    textAlign: 'left',
  },

  content: {
    flex: 1,
    padding: '24px 32px',
    transition: 'opacity 0.15s ease, transform 0.15s ease',
  },

  footer: {
    padding: '16px 32px',
    borderTop: '1px solid #e2e8f0',
    backgroundColor: 'white',
  },
  footerText: {
    margin: 0,
    fontSize: '13px',
    color: '#94a3b8',
    textAlign: 'center',
  },
};

export default Admin;