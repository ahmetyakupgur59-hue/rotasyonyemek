// src/contexts/AppContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { locationService, categoryService, bannerService } from '../services/supabase';

const AppContext = createContext({});

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};

export const AppProvider = ({ children }) => {
    // Auth context'ten bilgiler
    const auth = useAuth();

    // Global state
    const [cities, setCities] = useState([]);
    const [categories, setCategories] = useState([]);
    const [banners, setBanners] = useState([]);
    const [selectedCity, setSelectedCity] = useState(null);
    const [appLoading, setAppLoading] = useState(true);

    // Toast/Notification state
    const [toasts, setToasts] = useState([]);

    // Initial data yükle
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [citiesRes, categoriesRes, bannersRes] = await Promise.all([
                    locationService.getCities(),
                    categoryService.getAll(),
                    bannerService.getActive()
                ]);

                if (citiesRes.data) setCities(citiesRes.data);
                if (categoriesRes.data) setCategories(categoriesRes.data);
                if (bannersRes.data) setBanners(bannersRes.data);

                // Varsayılan şehir
                const savedCity = localStorage.getItem('selectedCity');
                if (savedCity) {
                    setSelectedCity(JSON.parse(savedCity));
                } else if (citiesRes.data?.length > 0) {
                    // İstanbul'u varsayılan yap
                    const istanbul = citiesRes.data.find(c => c.ad === 'İstanbul') || citiesRes.data[0];
                    setSelectedCity(istanbul);
                }
            } catch (error) {
                console.error('Initial data yüklenirken hata:', error);
            } finally {
                setAppLoading(false);
            }
        };

        loadInitialData();
    }, []);

    // Şehir değiştiğinde kaydet
    useEffect(() => {
        if (selectedCity) {
            localStorage.setItem('selectedCity', JSON.stringify(selectedCity));
        }
    }, [selectedCity]);

    // Toast göster
    const showToast = (message, type = 'info', duration = 3000) => {
        const id = Date.now();
        const toast = { id, message, type };
        
        setToasts(prev => [...prev, toast]);

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);

        return id;
    };

    // Toast kaldır
    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    // Kategorileri yenile
    const refreshCategories = async () => {
        const { data } = await categoryService.getAll();
        if (data) setCategories(data);
    };

    // Bannerları yenile
    const refreshBanners = async () => {
        const { data } = await bannerService.getActive();
        if (data) setBanners(data);
    };

    const value = {
        // Auth bilgileri (spread)
        ...auth,

        // Global state
        cities,
        categories,
        banners,
        selectedCity,
        appLoading,

        // Setters
        setSelectedCity,

        // Toast
        toasts,
        showToast,
        removeToast,

        // Refresh metodları
        refreshCategories,
        refreshBanners,

        // Loading state (auth + app)
        isLoading: auth.loading || appLoading
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

export default AppContext;