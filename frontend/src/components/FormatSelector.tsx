import { motion } from 'framer-motion';

interface FormatOption {
  id: string;
  name: string;
  width: number;
  height: number;
  pixels: string;
}

const FORMATS: FormatOption[] = [
  { id: 'instagram', name: 'Instagram Post', width: 1, height: 1, pixels: '1080×1080' },
  { id: 'mobile_wallpaper', name: 'Mobile Wallpaper', width: 9, height: 16, pixels: '1080×1920' },
  { id: 'hd_wallpaper', name: 'HD Wallpaper', width: 16, height: 9, pixels: '1920×1080' },
  { id: '4k_wallpaper', name: '4K Wallpaper', width: 16, height: 9, pixels: '3840×2160' },
  { id: 'a4_print', name: 'A4 Print', width: 8.3, height: 11.7, pixels: '2480×3508' },
];

interface FormatSelectorProps {
  selected: string;
  onSelect: (format: string) => void;
}

export default function FormatSelector({ selected, onSelect }: FormatSelectorProps) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {FORMATS.map((fmt) => {
        const isSelected = fmt.id === selected;
        const maxDim = 40;
        const ratio = fmt.width / fmt.height;
        const w = ratio >= 1 ? maxDim : Math.round(maxDim * ratio);
        const h = ratio >= 1 ? Math.round(maxDim / ratio) : maxDim;

        return (
          <motion.button
            key={fmt.id}
            onClick={() => onSelect(fmt.id)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            className={`group flex flex-col items-center gap-2 cursor-pointer transition-all duration-150 ${
              isSelected ? 'scale-[1.02]' : ''
            }`}
          >
            <div
              className={`w-16 h-14 rounded-lg border-2 transition-all duration-150 flex items-center justify-center ${
                isSelected
                  ? 'border-[#0A0A0A] dark:border-white shadow-md'
                  : 'border-[#E5E7EB] dark:border-[#2A2A2A] group-hover:shadow-md'
              }`}
            >
              <div
                className={`rounded-sm transition-colors ${
                  isSelected
                    ? 'bg-[#0A0A0A] dark:bg-white'
                    : 'bg-[#D1D5DB] dark:bg-[#4B5563]'
                }`}
                style={{ width: `${w}px`, height: `${h}px` }}
              />
            </div>
            <div className="flex flex-col items-center">
              <span
                className={`text-xs transition-colors ${
                  isSelected
                    ? 'text-[#0A0A0A] dark:text-white font-medium'
                    : 'text-[#6B7280] dark:text-[#9CA3AF]'
                }`}
              >
                {fmt.name}
              </span>
              <span
                className={`text-[10px] transition-colors ${
                  isSelected
                    ? 'text-[#6B7280] dark:text-[#9CA3AF]'
                    : 'text-[#9CA3AF] dark:text-[#6B7280]'
                }`}
              >
                {fmt.pixels}
              </span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
