import React, { useState, useEffect } from 'react';
import { Palette, Check, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const THEMES = [
  {
    id: 'cyber-cyan',
    name: 'Organic Classic',
    description: 'Original Dark Teal workspace design',
    color: '#1D9E75',
    bg: '#14161A',
    border: '#2A2D33'
  },
  {
    id: 'nordic-light',
    name: 'Nordic Light',
    description: 'Clean porcelain daylight with sky blue',
    color: '#0284c7',
    bg: '#f0f4f8',
    border: '#cbd5e1'
  },
  {
    id: 'modern-dark',
    name: 'Modern Dark',
    description: 'Pitch black OLED void with electric cyan glow',
    color: '#00f2fe',
    bg: '#050505',
    border: '#1f1f23'
  }
];

export function applyTheme(themeId) {
  const selected = THEMES.find(t => t.id === themeId) || THEMES[0];
  document.documentElement.setAttribute('data-theme', selected.id);
  document.body.setAttribute('data-theme', selected.id);

  const root = document.documentElement;
  if (selected.id === 'nordic-light') {
    root.style.setProperty('--bg-page', '#f0f4f8');
    root.style.setProperty('--bg-sidebar', '#e2e8f0');
    root.style.setProperty('--bg-card', '#ffffff');
    root.style.setProperty('--brand-teal', '#0284c7');
    root.style.setProperty('--brand-light', '#38bdf8');
    root.style.setProperty('--brand-dark', '#e0f2fe');
    root.style.setProperty('--text-primary', '#0f172a');
    root.style.setProperty('--text-secondary', '#334155');
    root.style.setProperty('--text-tertiary', '#64748b');
    root.style.setProperty('--border-hairline', '#cbd5e1');
  } else if (selected.id === 'modern-dark') {
    root.style.setProperty('--bg-page', '#050505');
    root.style.setProperty('--bg-sidebar', '#020202');
    root.style.setProperty('--bg-card', '#0d0d0d');
    root.style.setProperty('--brand-teal', '#00f2fe');
    root.style.setProperty('--brand-light', '#38bdf8');
    root.style.setProperty('--brand-dark', '#032b38');
    root.style.setProperty('--text-primary', '#ffffff');
    root.style.setProperty('--text-secondary', '#a1a1aa');
    root.style.setProperty('--text-tertiary', '#71717a');
    root.style.setProperty('--border-hairline', '#1f1f23');
  } else {
    // Default Organic Classic
    root.style.setProperty('--bg-page', '#14161A');
    root.style.setProperty('--bg-sidebar', '#101215');
    root.style.setProperty('--bg-card', '#1B1E23');
    root.style.setProperty('--brand-teal', '#1D9E75');
    root.style.setProperty('--brand-light', '#9FE1CB');
    root.style.setProperty('--brand-dark', '#04342C');
    root.style.setProperty('--text-primary', '#F1EFE8');
    root.style.setProperty('--text-secondary', '#B4B2A9');
    root.style.setProperty('--text-tertiary', '#5F5E5A');
    root.style.setProperty('--border-hairline', '#2A2D33');
  }

  localStorage.setItem('insight_rag_theme', selected.id);
}

export function initTheme() {
  const saved = localStorage.getItem('insight_rag_theme') || 'cyber-cyan';
  applyTheme(saved);
}

export default function ThemeSelector({ compact = false }) {
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('insight_rag_theme') || 'cyber-cyan';
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    initTheme();
  }, []);

  const handleSelect = (id) => {
    setCurrentTheme(id);
    applyTheme(id);
    setIsOpen(false);
  };

  const activeThemeObj = THEMES.find(t => t.id === currentTheme) || THEMES[0];

  return (
    <div className="relative inline-block text-left">
      {/* Palette Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-control border border-border-hairline bg-background-card px-2.5 py-1.5 text-xs font-medium text-text-primary hover:border-brand-teal/50 hover:bg-background-sidebar transition-all cursor-pointer select-none"
        title="Select Workspace Theme"
      >
        <span
          className="h-3 w-3 rounded-full border border-white/20 shadow-sm shrink-0"
          style={{ backgroundColor: activeThemeObj.color }}
        />
        {!compact && <span className="text-xs font-medium">{activeThemeObj.name}</span>}
        <Palette className="h-3.5 w-3.5 text-text-tertiary" />
      </button>

      {/* Popover Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for outside clicks */}
            <div
              className="fixed inset-0 z-[9990]"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Menu Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 4 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 mt-2 z-[9999] w-60 rounded-xl border border-border-hairline bg-background-card p-2.5 shadow-2xl backdrop-blur-2xl space-y-1"
            >
              <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono font-medium uppercase tracking-wider text-text-secondary border-b border-border-hairline/45 mb-1">
                <Sparkles className="h-3 w-3 text-brand-teal" />
                <span>Workspace Theme</span>
              </div>

              {THEMES.map((t) => {
                const isSelected = currentTheme === t.id;
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => handleSelect(t.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-brand-teal/15 text-text-primary border border-brand-teal/40 font-medium'
                        : 'text-text-secondary hover:bg-background-sidebar hover:text-text-primary border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-white/20 shadow-sm shrink-0"
                        style={{ backgroundColor: t.color }}
                      />
                      <div>
                        <div className="text-xs font-medium">{t.name}</div>
                        <div className="text-[10px] text-text-tertiary leading-tight">{t.description}</div>
                      </div>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-brand-teal flex-shrink-0" />}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
