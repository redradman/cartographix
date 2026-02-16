import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface DistanceSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export default function DistanceSlider({ value, onChange }: DistanceSliderProps) {
  const formatDistance = (m: number) => {
    if (m >= 1000) return `${(m / 1000).toFixed(m % 1000 === 0 ? 0 : 1)} km`;
    return `${m} m`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-[#0A0A0A] dark:text-[#F9FAFB]">Distance</Label>
        <span className="text-sm font-semibold text-[#0A0A0A] dark:text-[#F9FAFB] bg-[#F8F9FA] dark:bg-[#1A1A1A] px-3 py-1 rounded-full border border-[#E5E7EB] dark:border-[#2A2A2A]">
          {formatDistance(value)}
        </span>
      </div>
      <Slider
        min={1000}
        max={35000}
        step={1000}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-[#9CA3AF] dark:text-[#6B7280]">
        <span>1 km</span>
        <span>35 km</span>
      </div>
    </div>
  );
}
