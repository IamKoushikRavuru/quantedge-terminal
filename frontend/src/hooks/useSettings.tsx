import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

interface AppSettings {
    theme: Theme;
    zoom: number; // 0.8 to 1.5 multiplier
}

interface SettingsContextType {
    settings: AppSettings;
    setTheme: (t: Theme) => void;
    setZoom: (z: number) => void;
    reset: () => void;
}

const DEFAULT_SETTINGS: AppSettings = { theme: 'dark', zoom: 1.0 };

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<AppSettings>(() => {
        const saved = localStorage.getItem('qe_settings');
        if (saved) {
            try { return JSON.parse(saved); } catch { /* ignore */ }
        }
        return DEFAULT_SETTINGS;
    });

    useEffect(() => {
        localStorage.setItem('qe_settings', JSON.stringify(settings));

        // Apply theme classes
        if (settings.theme === 'light') {
            document.documentElement.classList.add('theme-light');
        } else {
            document.documentElement.classList.remove('theme-light');
        }

        // Apply global zoom
        document.documentElement.style.fontSize = `${14 * settings.zoom}px`;
    }, [settings]);

    const setTheme = (theme: Theme) => setSettings(s => ({ ...s, theme }));
    const setZoom = (zoom: number) => setSettings(s => ({ ...s, zoom: Math.max(0.7, Math.min(1.5, zoom)) }));
    const reset = () => setSettings(DEFAULT_SETTINGS);

    return (
        <SettingsContext.Provider value={{ settings, setTheme, setZoom, reset }}>
            <div style={{ zoom: settings.zoom, height: '100%' }}>
                {children}
            </div>
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
    return ctx;
}
