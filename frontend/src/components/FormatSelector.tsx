import { motion } from 'framer-motion';

interface FormatOption {
  id: string;
  name: string;
  width: number;
  height: number;
}

const FORMATS: FormatOption[] = [
  { id: 'square', name: 'Square', width: 1, height: 1 },
  { id: 'landscape', name: 'Landscape', width: 16, height: 9 },
  { id: 'portrait', name: 'Portrait', width: 2, height: 3 },
  { id: 'phone', name: 'Phone', width: 6, height: 13 },
  { id: 'story', name: 'Story', width: 9, height: 16 },
];

interface FormatSelectorProps {
  selected: string;
  onSelect: (format: string) => void;
}

export default function FormatSelector({ selected, onSelect }: FormatSelectorProps) {
  return (
    <div className="flex flex-wrap gap-3">
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
            <span
              className={`text-xs transition-colors ${
                isSelected
                  ? 'text-[#0A0A0A] dark:text-white font-medium'
                  : 'text-[#6B7280] dark:text-[#9CA3AF]'
              }`}
            >
              {fmt.name}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
