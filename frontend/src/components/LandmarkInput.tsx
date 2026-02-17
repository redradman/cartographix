import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import type { Landmark } from '@/lib/api';

const GOOGLE_MAPS_DATA_RE = /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/;
const GOOGLE_MAPS_RE = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/;
const GOOGLE_MAPS_LL_RE = /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
const OSM_RE = /openstreetmap\.org.*#map=\d+\/(-?\d+\.?\d*)\/([-]?\d+\.?\d*)/;

/** Try to extract a place name from a Google Maps URL path segment */
function parseNameFromUrl(input: string): string {
  // Google Maps place URLs: /maps/place/Place+Name/...
  const placeMatch = input.match(/\/place\/([^/]+)/);
  if (placeMatch) {
    return decodeURIComponent(placeMatch[1]).replace(/\+/g, ' ');
  }
  return '';
}

function parseUrlCoords(input: string): { lat: number; lon: number } | null {
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

interface LandmarkInputProps {
  landmarks: Landmark[];
  onChange: (landmarks: Landmark[]) => void;
  maxLandmarks?: number;
}

export default function LandmarkInput({ landmarks, onChange, maxLandmarks = 5 }: LandmarkInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const atLimit = landmarks.length >= maxLandmarks;

  const addFromUrl = (url: string) => {
    const coords = parseUrlCoords(url);
    if (!coords) {
      setError('Could not extract coordinates from this link');
      return;
    }
    const name = parseNameFromUrl(url);
    onChange([...landmarks, { name, lat: coords.lat, lon: coords.lon }]);
    setInputValue('');
    setError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setError('');

    // Auto-detect pasted URL
    if (val.includes('google.com/maps') || val.includes('openstreetmap.org') || val.includes('goo.gl/maps')) {
      addFromUrl(val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        addFromUrl(inputValue.trim());
      }
    }
  };

  const removeLandmark = (index: number) => {
    onChange(landmarks.filter((_, i) => i !== index));
    setError('');
  };

  const formatLandmarkLabel = (lm: Landmark) => {
    if (lm.name) return lm.name;
    return `Pin at ${lm.lat.toFixed(4)}, ${lm.lon.toFixed(4)}`;
  };

  return (
    <div className="space-y-3">
      <div>
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={atLimit}
          autoComplete="off"
          placeholder={atLimit ? 'Maximum 5 landmarks' : 'Paste a Google Maps or OpenStreetMap link'}
          className="border-[#E5E7EB] dark:border-[#2A2A2A] dark:bg-[#1A1A1A] dark:text-white dark:placeholder:text-[#6B7280] rounded-lg px-4 py-3 focus:border-[#0A0A0A] dark:focus:border-[#555] focus:ring-[#0A0A0A]/10"
        />
        {error && (
          <p className="text-xs text-red-500 mt-1.5">{error}</p>
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
