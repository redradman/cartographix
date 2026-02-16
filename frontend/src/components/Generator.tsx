import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ThemeSelector from './ThemeSelector';
import DistanceSlider from './DistanceSlider';
import StatusDisplay from './StatusDisplay';
import type { Theme } from '@/lib/api';
import { fetchThemes, generatePoster, fetchStatus } from '@/lib/api';

type AppState = 'default' | 'generating' | 'completed' | 'error' | 'rate_limited';

const FALLBACK_THEMES: Theme[] = [
  { id: 'classic', name: 'Classic', preview_colors: ['#FFFFFF', '#E5E7EB', '#6B7280', '#0A0A0A'] },
  { id: 'midnight', name: 'Midnight', preview_colors: ['#0F172A', '#1E293B', '#334155', '#475569'] },
  { id: 'ocean', name: 'Ocean', preview_colors: ['#0C4A6E', '#0369A1', '#38BDF8', '#E0F2FE'] },
  { id: 'sunset', name: 'Sunset', preview_colors: ['#7C2D12', '#EA580C', '#FB923C', '#FED7AA'] },
  { id: 'forest', name: 'Forest', preview_colors: ['#14532D', '#166534', '#22C55E', '#DCFCE7'] },
  { id: 'rose', name: 'Rose', preview_colors: ['#881337', '#E11D48', '#FB7185', '#FFE4E6'] },
  { id: 'arctic', name: 'Arctic', preview_colors: ['#F8FAFC', '#CBD5E1', '#64748B', '#1E293B'] },
  { id: 'desert', name: 'Desert', preview_colors: ['#78350F', '#D97706', '#FCD34D', '#FFFBEB'] },
  { id: 'lavender', name: 'Lavender', preview_colors: ['#581C87', '#7C3AED', '#A78BFA', '#EDE9FE'] },
  { id: 'neon', name: 'Neon', preview_colors: ['#020617', '#4ADE80', '#22D3EE', '#F472B6'] },
  { id: 'vintage', name: 'Vintage', preview_colors: ['#44403C', '#78716C', '#D6D3D1', '#FAFAF9'] },
  { id: 'monochrome', name: 'Monochrome', preview_colors: ['#000000', '#404040', '#808080', '#FFFFFF'] },
  { id: 'coral', name: 'Coral', preview_colors: ['#7F1D1D', '#EF4444', '#FCA5A5', '#FEF2F2'] },
  { id: 'emerald', name: 'Emerald', preview_colors: ['#064E3B', '#059669', '#6EE7B7', '#ECFDF5'] },
  { id: 'twilight', name: 'Twilight', preview_colors: ['#1E1B4B', '#4338CA', '#818CF8', '#EEF2FF'] },
  { id: 'autumn', name: 'Autumn', preview_colors: ['#431407', '#C2410C', '#FB923C', '#FFF7ED'] },
  { id: 'blueprint', name: 'Blueprint', preview_colors: ['#1E3A5F', '#2563EB', '#60A5FA', '#DBEAFE'] },
];

export default function Generator() {
  const [themes, setThemes] = useState<Theme[]>(FALLBACK_THEMES);
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [theme, setTheme] = useState('classic');
  const [distance, setDistance] = useState(10000);
  const [email, setEmail] = useState('');
  const [appState, setAppState] = useState<AppState>('default');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchThemes()
      .then(setThemes)
      .catch(() => { /* use fallback themes */ });
  }, []);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const pollStatus = useCallback((jobId: string) => {
    pollingRef.current = setInterval(async () => {
      try {
        const status = await fetchStatus(jobId);
        if (status.status === 'completed') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setAppState('completed');
        } else if (status.status === 'failed') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setErrorMessage(status.message || 'Generation failed');
          setAppState('error');
        }
      } catch {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setErrorMessage('Lost connection to server');
        setAppState('error');
      }
    }, 5000);
  }, []);

  const handleGenerate = async () => {
    if (!city.trim() || !isValidEmail(email)) return;
    setIsSubmitting(true);
    try {
      const result = await generatePoster({ city, country, theme, distance, email });
      setAppState('generating');
      pollStatus(result.job_id);
    } catch (err) {
      if (err instanceof Error && err.message === 'RATE_LIMITED') {
        setAppState('rate_limited');
      } else {
        setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
        setAppState('error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setAppState('default');
    setCity('');
    setCountry('');
    setEmail('');
    setErrorMessage('');
  };

  const handleRetry = () => {
    setAppState('default');
    setErrorMessage('');
  };

  const selectedTheme = themes.find((t) => t.id === theme);
  const canSubmit = city.trim().length > 0 && isValidEmail(email) && !isSubmitting;

  return (
    <section id="generator" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-[#0A0A0A] text-center mb-16">
          Create your poster
        </h2>

        <AnimatePresence mode="wait">
          {appState === 'default' ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-12"
            >
              {/* Form */}
              <div className="space-y-8">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm font-medium text-[#0A0A0A]">
                    City
                  </Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="border-[#E5E7EB] rounded-lg px-4 py-3 focus:border-[#0A0A0A] focus:ring-[#0A0A0A]/10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country" className="text-sm font-medium text-[#0A0A0A]">
                    Country <span className="text-[#9CA3AF] font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="border-[#E5E7EB] rounded-lg px-4 py-3 focus:border-[#0A0A0A] focus:ring-[#0A0A0A]/10"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium text-[#0A0A0A]">Theme</Label>
                  <ThemeSelector themes={themes} selected={theme} onSelect={setTheme} />
                </div>

                <DistanceSlider value={distance} onChange={setDistance} />

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-[#0A0A0A]">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-[#E5E7EB] rounded-lg px-4 py-3 focus:border-[#0A0A0A] focus:ring-[#0A0A0A]/10"
                  />
                </div>

                <motion.button
                  onClick={handleGenerate}
                  disabled={!canSubmit}
                  whileHover={canSubmit ? { y: -1 } : {}}
                  whileTap={canSubmit ? { scale: 0.98 } : {}}
                  className="w-full py-3.5 bg-[#0A0A0A] text-white rounded-lg font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1a1a1a]"
                >
                  {isSubmitting ? (
                    <motion.span
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 0.5 }}
                      transition={{ repeat: Infinity, repeatType: 'reverse', duration: 0.8 }}
                    >
                      Generating...
                    </motion.span>
                  ) : (
                    'Generate poster'
                  )}
                </motion.button>
              </div>

              {/* Preview */}
              <div className="hidden lg:flex items-start justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={theme}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="w-72 h-96 rounded-lg overflow-hidden shadow-xl border border-[#E5E7EB]"
                  >
                    {selectedTheme && (
                      <div className="w-full h-full flex flex-col">
                        <div
                          className="flex-1 flex items-center justify-center"
                          style={{ backgroundColor: selectedTheme.preview_colors[0] }}
                        >
                          <div className="w-32 h-32 opacity-20">
                            <svg viewBox="0 0 100 100" fill="none" stroke={selectedTheme.preview_colors[3]} strokeWidth="0.5">
                              {Array.from({ length: 20 }, (_, i) => (
                                <line key={`h${i}`} x1="0" y1={i * 5} x2="100" y2={i * 5} />
                              ))}
                              {Array.from({ length: 20 }, (_, i) => (
                                <line key={`v${i}`} x1={i * 5} y1="0" x2={i * 5} y2="100" />
                              ))}
                              <circle cx="50" cy="50" r="20" />
                              <line x1="20" y1="30" x2="80" y2="30" />
                              <line x1="30" y1="20" x2="30" y2="80" />
                              <line x1="25" y1="60" x2="75" y2="40" />
                            </svg>
                          </div>
                        </div>
                        <div
                          className="p-4"
                          style={{ backgroundColor: selectedTheme.preview_colors[3] }}
                        >
                          <p
                            className="text-xs tracking-widest uppercase opacity-60"
                            style={{ color: selectedTheme.preview_colors[0] }}
                          >
                            {city || 'Your City'}
                          </p>
                          <p
                            className="text-sm font-semibold mt-1"
                            style={{ color: selectedTheme.preview_colors[0] }}
                          >
                            {selectedTheme.name}
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <StatusDisplay
              state={appState}
              city={city}
              errorMessage={errorMessage}
              onRetry={handleRetry}
              onReset={handleReset}
            />
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
