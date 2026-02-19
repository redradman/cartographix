import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type AppState = 'default' | 'generating' | 'completed' | 'error' | 'rate_limited';

interface StatusDisplayProps {
  state: AppState;
  city: string;
  stage?: string;
  email?: string;
  posterUrl?: string | null;
  errorMessage?: string;
  estimatedSeconds?: number;
  onRetry: () => void;
  onReset: () => void;
}

const PREVIEW_CITIES = [
  'barcelona', 'beijing', 'berlin', 'dubai', 'london',
  'madrid', 'new_york', 'paris', 'singapore', 'sydney', 'tokyo',
];

const THEMES = [
  'default', 'classic', 'midnight', 'ocean', 'forest', 'sunset', 'neon',
  'pastel', 'monochrome', 'vintage', 'arctic', 'desert', 'cyberpunk',
  'watercolor', 'blueprint', 'autumn', 'minimal',
];

function formatCityName(slug: string): string {
  return slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatThemeName(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

interface PosterPreview {
  city: string;
  theme: string;
  src: string;
}

const ITEMS_PER_PAGE = 6;

// Build pages where each page has unique cities AND unique themes.
// Round-robin: rotate city and theme offsets so no repeats within a page.
const GALLERY_PAGES: PosterPreview[][] = (() => {
  const pages: PosterPreview[][] = [];
  const cityCount = PREVIEW_CITIES.length;
  const themeCount = THEMES.length;
  let cityOffset = 0;
  let themeOffset = 0;

  // We can generate many pages; cap at a reasonable number
  const maxPages = Math.floor((cityCount * themeCount) / ITEMS_PER_PAGE);
  const used = new Set<string>();

  for (let p = 0; p < maxPages; p++) {
    const page: PosterPreview[] = [];
    const pageCities = new Set<string>();
    const pageThemes = new Set<string>();

    for (let i = 0; i < ITEMS_PER_PAGE; i++) {
      // Find the next unused city+theme combo that doesn't clash with this page
      let found = false;
      for (let ct = 0; ct < cityCount * themeCount && !found; ct++) {
        const ci = (cityOffset + i + ct) % cityCount;
        const ti = (themeOffset + i + ct * 3) % themeCount; // stride of 3 for variety
        const city = PREVIEW_CITIES[ci];
        const theme = THEMES[ti];
        const key = `${city}-${theme}`;

        if (!used.has(key) && !pageCities.has(city) && !pageThemes.has(theme)) {
          page.push({ city, theme, src: `/previews/${city}/${theme}.jpg` });
          used.add(key);
          pageCities.add(city);
          pageThemes.add(theme);
          found = true;
        }
      }
    }

    if (page.length === ITEMS_PER_PAGE) {
      pages.push(page);
    }

    cityOffset = (cityOffset + 3) % cityCount;
    themeOffset = (themeOffset + 5) % themeCount;
  }

  return pages;
})();

const TOTAL_PAGES = GALLERY_PAGES.length;

const STAGE_ORDER = ['geocoding', 'fetching_streets', 'fetching_features', 'rendering', 'sending_email'];

function getStageProgress(stage: string | undefined): number {
  const idx = STAGE_ORDER.indexOf(stage || '');
  if (idx < 0) return 0.05;
  return Math.min((idx + 1) / STAGE_ORDER.length, 1);
}

function getStageMessage(stage: string | undefined, city: string): string {
  switch (stage) {
    case 'geocoding': return `Pinpointing ${city} on the globe...`;
    case 'fetching_streets': return `Tracing the streets of ${city}...`;
    case 'fetching_features': return 'Discovering rivers, parks & coastlines...';
    case 'rendering': return 'Composing your poster in fine detail...';
    case 'sending_email': return 'Delivering your creation...';
    case 'done': return 'Almost there...';
    default: return `Preparing your map of ${city}...`;
  }
}

function getWaitMessage(seconds: number): string {
  if (seconds <= 15) return 'Quick one — back in a flash';
  if (seconds <= 30) return 'Just a moment — stretching the canvas';
  if (seconds <= 60) return 'Sit tight — your map is taking shape';
  if (seconds <= 90) return 'Grab a coffee — this is a big map';
  return 'This one\'s a beast — maybe grab a snack too';
}

function Checkmark() {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className="w-16 h-16 bg-[#10B981] rounded-full flex items-center justify-center"
    >
      <motion.svg
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="w-8 h-8 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <motion.path
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3}
          d="M5 13l4 4L19 7"
        />
      </motion.svg>
    </motion.div>
  );
}

function PosterCard({ poster, onSelect }: { poster: PosterPreview; onSelect: (p: PosterPreview) => void }) {
  const [loaded, setLoaded] = useState(false);
  const onLoad = useCallback(() => setLoaded(true), []);

  return (
    <Card
      className="p-0 gap-0 overflow-hidden cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
      onClick={() => onSelect(poster)}
    >
      <div className="relative aspect-[3/4] bg-[#F3F4F6] dark:bg-[#1A1A1A]">
        {/* Skeleton shimmer */}
        {!loaded && (
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent animate-[shimmer_1.5s_infinite] -translate-x-full" />
          </div>
        )}
        <img
          src={poster.src}
          alt={`${formatCityName(poster.city)} — ${formatThemeName(poster.theme)}`}
          className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
          onLoad={onLoad}
        />
      </div>
      <div className="px-3 py-2">
        {!loaded ? (
          <div className="space-y-1.5 py-0.5">
            <div className="h-3 w-20 bg-[#E5E7EB] dark:bg-[#2A2A2A] rounded animate-pulse" />
            <div className="h-2.5 w-14 bg-[#F3F4F6] dark:bg-[#1A1A1A] rounded animate-pulse" />
          </div>
        ) : (
          <>
            <p className="text-xs font-medium text-[#374151] dark:text-[#D1D5DB] truncate">
              {formatCityName(poster.city)}
            </p>
            <p className="text-[10px] text-[#9CA3AF] dark:text-[#6B7280]">
              {formatThemeName(poster.theme)}
            </p>
          </>
        )}
      </div>
    </Card>
  );
}

function PosterGallery({ stage, city, estimatedSeconds = 60 }: { stage?: string; city: string; estimatedSeconds?: number }) {
  const [page, setPage] = useState(0);
  const [selectedPoster, setSelectedPoster] = useState<PosterPreview | null>(null);

  const progress = getStageProgress(stage);

  const currentItems = GALLERY_PAGES[page] || [];

  const prevPage = () => setPage(p => Math.max(0, p - 1));
  const nextPage = () => setPage(p => Math.min(TOTAL_PAGES - 1, p + 1));

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      {/* Progress section */}
      <div className="w-full max-w-md text-center space-y-3">
        {/* Spinner + message */}
        <div className="flex items-center justify-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
            className="w-5 h-5 border-2 border-[#E5E7EB] dark:border-[#2A2A2A] border-t-[#0A0A0A] dark:border-t-white rounded-full flex-shrink-0"
          />
          <p className="text-sm text-[#0A0A0A] dark:text-[#F9FAFB]">
            {getStageMessage(stage, city)}
          </p>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-[#E5E7EB] dark:bg-[#2A2A2A] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#0A0A0A] dark:bg-white rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>

        <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">
          {getWaitMessage(estimatedSeconds)}
        </p>
      </div>

      {/* Divider + gallery header */}
      <div className="w-full max-w-2xl">
        <div className="border-t border-[#E5E7EB] dark:border-[#2A2A2A] pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-[#0A0A0A] dark:text-[#F9FAFB]">
                Browse the poster library
              </h3>
              <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-0.5">
                Tap any poster to see it up close
              </p>
            </div>

            {/* Pagination controls */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={prevPage}
                disabled={page === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF] tabular-nums min-w-[3rem] text-center">
                {page + 1} / {TOTAL_PAGES}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={nextPage}
                disabled={page === TOTAL_PAGES - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Poster grid */}
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-2 sm:grid-cols-3 gap-3"
            >
              {currentItems.map((poster) => (
                <PosterCard
                  key={`${poster.city}-${poster.theme}`}
                  poster={poster}
                  onSelect={setSelectedPoster}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Lightbox dialog */}
      <Dialog open={!!selectedPoster} onOpenChange={(open) => { if (!open) setSelectedPoster(null); }}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-md p-0 overflow-hidden gap-0 bg-white dark:bg-[#111111] border-[#E5E7EB] dark:border-[#2A2A2A]"
        >
          {selectedPoster && (
            <>
              <div className="relative">
                <img
                  src={selectedPoster.src}
                  alt={`${formatCityName(selectedPoster.city)} — ${formatThemeName(selectedPoster.theme)}`}
                  className="w-full h-auto"
                />
                {/* Close button with solid background so it's visible on any poster */}
                <button
                  onClick={() => setSelectedPoster(null)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors backdrop-blur-sm"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="px-5 py-4">
                <DialogTitle className="text-[#0A0A0A] dark:text-[#F9FAFB]">
                  {formatCityName(selectedPoster.city)}
                </DialogTitle>
                <DialogDescription className="text-[#9CA3AF] dark:text-[#6B7280] mt-1">
                  {formatThemeName(selectedPoster.theme)} theme
                </DialogDescription>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function StatusDisplay({ state, city, stage, email, posterUrl, errorMessage, estimatedSeconds, onRetry, onReset }: StatusDisplayProps) {
  const handleDownload = () => {
    if (!posterUrl) return;
    const link = document.createElement('a');
    link.href = posterUrl;
    link.download = `${city.toLowerCase().replace(/\s+/g, '_')}_poster.png`;
    link.click();
  };

  return (
    <AnimatePresence mode="wait">
      {state === 'generating' && (
        <motion.div
          key="generating"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <PosterGallery stage={stage} city={city} estimatedSeconds={estimatedSeconds} />
        </motion.div>
      )}

      {state === 'completed' && (
        <motion.div
          key="completed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center justify-center py-16 gap-6"
        >
          <Checkmark />
          <div className="text-center">
            <p className="text-lg font-semibold text-[#0A0A0A] dark:text-[#F9FAFB]">
              Your poster of {city} is ready!
            </p>
            {email && <p className="text-[#6B7280] dark:text-[#9CA3AF] mt-2">We've also sent it to your email.</p>}
          </div>

          {posterUrl && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-4 w-full max-w-md"
            >
              <div className="rounded-lg overflow-hidden shadow-xl border border-[#E5E7EB] dark:border-[#2A2A2A]">
                <img
                  src={posterUrl}
                  alt={`Map poster of ${city}`}
                  className="w-full h-auto"
                />
              </div>
              <button
                onClick={handleDownload}
                className="mt-4 w-full py-3 border-2 border-[#0A0A0A] dark:border-white text-[#0A0A0A] dark:text-white rounded-lg font-medium hover:bg-[#0A0A0A] dark:hover:bg-white hover:text-white dark:hover:text-[#0A0A0A] transition-all hover:-translate-y-0.5 active:scale-[0.98]"
              >
                Download poster
              </button>

            </motion.div>
          )}

          <button
            onClick={onReset}
            className="mt-2 px-6 py-3 bg-[#0A0A0A] dark:bg-white text-white dark:text-[#0A0A0A] rounded-lg font-medium hover:bg-[#1a1a1a] dark:hover:bg-[#E5E7EB] transition-all hover:-translate-y-0.5 active:scale-[0.98]"
          >
            Create another
          </button>
        </motion.div>
      )}

      {state === 'error' && (
        <motion.div
          key="error"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center justify-center py-16 gap-4"
        >
          <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-red-600 dark:text-red-400 text-center">{errorMessage || 'Something went wrong'}</p>
          <button
            onClick={onRetry}
            className="mt-2 px-6 py-3 bg-[#0A0A0A] dark:bg-white text-white dark:text-[#0A0A0A] rounded-lg font-medium hover:bg-[#1a1a1a] dark:hover:bg-[#E5E7EB] transition-all hover:-translate-y-0.5 active:scale-[0.98]"
          >
            Try again
          </button>
        </motion.div>
      )}

      {state === 'rate_limited' && (
        <motion.div
          key="rate_limited"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center justify-center py-16 gap-4"
        >
          <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-[#6B7280] dark:text-[#9CA3AF] text-center">
            You've created 3 posters today — come back tomorrow!
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
