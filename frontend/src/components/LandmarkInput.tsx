import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { fetchGeocode } from '@/lib/api';
import type { GeocodeSuggestion } from '@/lib/api';
import type { Landmark } from '@/lib/api';

const GOOGLE_MAPS_DATA_RE = /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/;
const GOOGLE_MAPS_RE = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/;
const GOOGLE_MAPS_LL_RE = /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
const OSM_RE = /openstreetmap\.org.*#map=\d+\/(-?\d+\.?\d*)\/([-]?\d+\.?\d*)/;

function parseUrlCoords(input: string): { lat: number; lon: number } | null {
  // For Google Maps place URLs, prefer !3d/!4d (exact place coords) over @lat,lon (viewport center)
  let match = input.match(GOOGLE_MAPS_DATA_RE);
  if (match) return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };

  match = input.match(GOOGLE_MAPS_RE);
  if (match) return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };

  match = input.match(GOOGLE_MAPS_LL_RE);
  if (match) return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };

  match = input.match(OSM_RE);
  if (match) return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };

  return null;
}

function isUrl(input: string): boolean {
  return /^https?:\/\//.test(input.trim()) || input.includes('google.com/maps') || input.includes('openstreetmap.org');
}

interface LandmarkInputProps {
  landmarks: Landmark[];
  onChange: (landmarks: Landmark[]) => void;
  maxLandmarks?: number;
}

export default function LandmarkInput({ landmarks, onChange, maxLandmarks = 5 }: LandmarkInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const atLimit = landmarks.length >= maxLandmarks;

  const fetchSuggestions = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2 || isUrl(query)) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const results = await fetchGeocode(query);
      setSuggestions(results);
      setIsOpen(results.length > 0);
      setActiveIndex(-1);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addLandmark = (landmark: Landmark) => {
    if (atLimit) return;
    onChange([...landmarks, landmark]);
    setInputValue('');
    setSuggestions([]);
    setIsOpen(false);
  };

  const removeLandmark = (index: number) => {
    onChange(landmarks.filter((_, i) => i !== index));
  };

  const handleSelect = (suggestion: GeocodeSuggestion) => {
    addLandmark({
      name: suggestion.city || suggestion.display_name,
      lat: suggestion.lat,
      lon: suggestion.lon,
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    // Check if it's a URL with coordinates
    if (isUrl(val)) {
      const coords = parseUrlCoords(val);
      if (coords) {
        addLandmark({ name: '', lat: coords.lat, lon: coords.lon });
        return;
      }
    }

    fetchSuggestions(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const formatLandmarkLabel = (lm: Landmark) => {
    if (lm.name) return lm.name;
    return `Pin at ${lm.lat.toFixed(4)}, ${lm.lon.toFixed(4)}`;
  };

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="relative">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={atLimit}
          autoComplete="off"
          placeholder={atLimit ? 'Maximum 5 landmarks' : 'Search place or paste Google Maps / OSM link'}
          className="border-[#E5E7EB] dark:border-[#2A2A2A] dark:bg-[#1A1A1A] dark:text-white dark:placeholder:text-[#6B7280] rounded-lg px-4 py-3 focus:border-[#0A0A0A] dark:focus:border-[#555] focus:ring-[#0A0A0A]/10"
        />
        {isOpen && suggestions.length > 0 && (
          <ul className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-[#1A1A1A] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-lg shadow-lg overflow-hidden">
            {suggestions.map((s, i) => (
              <li
                key={`${s.lat}-${s.lon}`}
                onMouseDown={() => handleSelect(s)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`px-4 py-2.5 cursor-pointer text-sm transition-colors ${
                  i === activeIndex ? 'bg-[#F3F4F6] dark:bg-[#2A2A2A]' : 'bg-white dark:bg-[#1A1A1A]'
                }`}
              >
                <span className="font-medium text-[#0A0A0A] dark:text-[#F9FAFB]">
                  {s.city || s.display_name}
                </span>
                {s.country && (
                  <span className="text-[#6B7280] dark:text-[#9CA3AF] ml-1.5">{s.country}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <AnimatePresence>
        {landmarks.map((lm, index) => (
          <motion.div
            key={`${lm.lat}-${lm.lon}-${index}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2"
          >
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-[#F3F4F6] dark:bg-[#1A1A1A] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-lg">
              <svg className="w-3.5 h-3.5 text-[#6B7280] dark:text-[#9CA3AF] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-[#0A0A0A] dark:text-[#F9FAFB] truncate">
                {formatLandmarkLabel(lm)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => removeLandmark(index)}
              className="p-1.5 text-[#9CA3AF] hover:text-[#0A0A0A] dark:hover:text-white transition-colors rounded"
              aria-label="Remove landmark"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
