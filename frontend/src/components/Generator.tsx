import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CityAutocomplete from './CityAutocomplete';
import ThemeSelector from './ThemeSelector';
import ThemeSkeleton from './ThemeSkeleton';
import DistanceSlider from './DistanceSlider';
import FormatSelector from './FormatSelector';
import LandmarkInput from './LandmarkInput';
import StatusDisplay from './StatusDisplay';
import Toast from './Toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CircleHelp } from 'lucide-react';
import type { Theme, Landmark } from '@/lib/api';

const PREVIEW_CITIES = [
  'barcelona', 'beijing', 'berlin', 'dubai', 'london',
  'madrid', 'new_york', 'paris', 'singapore', 'sydney', 'tokyo',
];
import { fetchThemes, generatePoster, fetchStatus } from '@/lib/api';

type AppState = 'default' | 'generating' | 'completed' | 'error' | 'rate_limited';

const FALLBACK_THEMES: Theme[] = [
  { id: 'default', name: 'Default', preview_colors: ['#FFFFFF', '#333333', '#999999', '#FF6B6B'] },
  { id: 'classic', name: 'Classic', preview_colors: ['#F5F5DC', '#2F2F2F', '#8B8B83', '#CD853F'] },
  { id: 'midnight', name: 'Midnight', preview_colors: ['#0D1117', '#1A1A2E', '#16213E', '#0F3460'] },
  { id: 'ocean', name: 'Ocean', preview_colors: ['#001529', '#003566', '#006D77', '#83C5BE'] },
  { id: 'forest', name: 'Forest', preview_colors: ['#1A1C16', '#2D3A25', '#4A6741', '#8FBC8F'] },
  { id: 'sunset', name: 'Sunset', preview_colors: ['#1A0A2E', '#FF6B35', '#FF9F1C', '#FCE762'] },
  { id: 'neon', name: 'Neon', preview_colors: ['#0A0A0A', '#FF00FF', '#00FFFF', '#39FF14'] },
  { id: 'pastel', name: 'Pastel', preview_colors: ['#FFF0F5', '#FFB6C1', '#DDA0DD', '#B0E0E6'] },
  { id: 'monochrome', name: 'Monochrome', preview_colors: ['#FFFFFF', '#000000', '#404040', '#808080'] },
  { id: 'vintage', name: 'Vintage', preview_colors: ['#F4E4C1', '#5C4033', '#8B6914', '#CD9B1D'] },
  { id: 'arctic', name: 'Arctic', preview_colors: ['#F0F8FF', '#B0C4DE', '#87CEEB', '#4682B4'] },
  { id: 'desert', name: 'Desert', preview_colors: ['#F5DEB3', '#D2691E', '#DEB887', '#CD853F'] },
  { id: 'cyberpunk', name: 'Cyberpunk', preview_colors: ['#0D0221', '#FF2A6D', '#05D9E8', '#D1F7FF'] },
  { id: 'watercolor', name: 'Watercolor', preview_colors: ['#FAF0E6', '#6B8E8E', '#9DB5B2', '#C4D7D1'] },
  { id: 'blueprint', name: 'Blueprint', preview_colors: ['#003082', '#4A90D9', '#7EC8E3', '#FFFFFF'] },
  { id: 'autumn', name: 'Autumn', preview_colors: ['#2D1B00', '#D2691E', '#FF8C00', '#FFD700'] },
  { id: 'minimal', name: 'Minimal', preview_colors: ['#FAFAFA', '#E0E0E0', '#BDBDBD', '#9E9E9E'] },
];

export default function Generator() {
  const [themes, setThemes] = useState<Theme[]>(FALLBACK_THEMES);
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [theme, setTheme] = useState('default');
  const [distance, setDistance] = useState(10000);
  const [email, setEmail] = useState('');
  const [outputFormat, setOutputFormat] = useState('instagram');
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [customTitle, setCustomTitle] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>('default');
  const [errorMessage, setErrorMessage] = useState('');
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [stage, setStage] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [themesLoading, setThemesLoading] = useState(true);
  const [previewCity] = useState(() => PREVIEW_CITIES[Math.floor(Math.random() * PREVIEW_CITIES.length)]);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchThemes()
      .then(setThemes)
      .catch(() => { /* use fallback themes */ })
      .finally(() => setThemesLoading(false));
  }, []);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const pollStatus = useCallback((jobId: string) => {
    pollingRef.current = setInterval(async () => {
      try {
        const status = await fetchStatus(jobId);
        if (status.stage) setStage(status.stage);
        if (status.status === 'completed') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          if (status.poster_url) setPosterUrl(status.poster_url);
          setAppState('completed');
          setToastVisible(true);
        } else if (status.status === 'failed') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setErrorMessage(status.error_message || 'Generation failed. Try again with a different city or smaller distance.');
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
    if (!city.trim()) return;
    setIsSubmitting(true);
    try {
      const result = await generatePoster({ city, country, theme, distance, email, output_format: outputFormat, custom_title: customTitle, landmarks });
      setJobId(result.job_id);
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
    setOutputFormat('instagram');
    setLandmarks([]);
    setCustomTitle('');
    setJobId(null);
    setErrorMessage('');
    setPosterUrl(null);
    setStage(undefined);
    setToastVisible(false);
  };

  const handleRetry = () => {
    setAppState('default');
    setErrorMessage('');
  };

  const canSubmit = city.trim().length > 0 && !isSubmitting;

  return (
    <section id="generator" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-[#0A0A0A] dark:text-[#F9FAFB] text-center mb-16">
          Create your poster
        </h2>

        <AnimatePresence mode="wait">
          {appState === 'default' ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-12"
            >
              {/* Form */}
              <div className="space-y-8">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm font-medium text-[#0A0A0A] dark:text-[#F9FAFB]">
                    City
                  </Label>
                  <CityAutocomplete
                    id="city"
                    value={city}
                    onChange={setCity}
                    onSelectSuggestion={(c, co) => {
                      setCity(c);
                      setCountry(co);
                    }}
                    className="border-[#E5E7EB] dark:border-[#2A2A2A] dark:bg-[#1A1A1A] dark:text-white rounded-lg px-4 py-3 focus:border-[#0A0A0A] dark:focus:border-[#555] focus:ring-[#0A0A0A]/10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country" className="text-sm font-medium text-[#0A0A0A] dark:text-[#F9FAFB]">
                    Country <span className="text-[#9CA3AF] dark:text-[#6B7280] font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="border-[#E5E7EB] dark:border-[#2A2A2A] dark:bg-[#1A1A1A] dark:text-white rounded-lg px-4 py-3 focus:border-[#0A0A0A] dark:focus:border-[#555] focus:ring-[#0A0A0A]/10"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium text-[#0A0A0A] dark:text-[#F9FAFB]">Theme</Label>
                  {themesLoading ? (
                    <ThemeSkeleton />
                  ) : (
                    <ThemeSelector themes={themes} selected={theme} onSelect={setTheme} />
                  )}
                </div>

                <DistanceSlider value={distance} onChange={setDistance} />

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-sm font-medium text-[#0A0A0A] dark:text-[#F9FAFB]">
                      Landmarks <span className="text-[#9CA3AF] dark:text-[#6B7280] font-normal">(optional)</span>
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <CircleHelp className="w-3.5 h-3.5 text-[#9CA3AF] dark:text-[#6B7280] cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[240px] text-center">
                        <p>Paste a Google Maps or OpenStreetMap link to pin up to 5 landmarks on your poster.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <LandmarkInput landmarks={landmarks} onChange={setLandmarks} />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium text-[#0A0A0A] dark:text-[#F9FAFB]">Output format</Label>
                  <FormatSelector selected={outputFormat} onSelect={setOutputFormat} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom-title" className="text-sm font-medium text-[#0A0A0A] dark:text-[#F9FAFB]">
                    Poster title <span className="text-[#9CA3AF] dark:text-[#6B7280] font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="custom-title"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Leave blank to use city name"
                    className="border-[#E5E7EB] dark:border-[#2A2A2A] dark:bg-[#1A1A1A] dark:text-white dark:placeholder:text-[#6B7280] rounded-lg px-4 py-3 focus:border-[#0A0A0A] dark:focus:border-[#555] focus:ring-[#0A0A0A]/10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-[#0A0A0A] dark:text-[#F9FAFB]">
                    Email <span className="text-[#9CA3AF] dark:text-[#6B7280] font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Optional — we'll email you a copy too"
                    className="border-[#E5E7EB] dark:border-[#2A2A2A] dark:bg-[#1A1A1A] dark:text-white dark:placeholder:text-[#6B7280] rounded-lg px-4 py-3 focus:border-[#0A0A0A] dark:focus:border-[#555] focus:ring-[#0A0A0A]/10"
                  />
                </div>

                <motion.button
                  onClick={handleGenerate}
                  disabled={!canSubmit}
                  whileHover={canSubmit ? { y: -1 } : {}}
                  whileTap={canSubmit ? { scale: 0.98 } : {}}
                  className="w-full py-3.5 bg-[#0A0A0A] dark:bg-white text-white dark:text-[#0A0A0A] rounded-lg font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1a1a1a] dark:hover:bg-[#E5E7EB]"
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generating...
                    </span>
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
                    className="w-72 h-96 rounded-lg overflow-hidden shadow-xl border border-[#E5E7EB] dark:border-[#2A2A2A]"
                  >
                    <img
                      src={`/previews/${previewCity}/${theme}.jpg`}
                      alt={`${theme} theme preview`}
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="status"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
            <StatusDisplay
              state={appState}
              city={city}
              stage={stage}
              email={email}
              posterUrl={posterUrl}
              errorMessage={errorMessage}
              jobId={jobId}
              onRetry={handleRetry}
              onReset={handleReset}
            />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Toast
        message={`Your poster of ${city} is ready!`}
        visible={toastVisible}
        onClose={() => setToastVisible(false)}
      />
    </section>
  );
}
