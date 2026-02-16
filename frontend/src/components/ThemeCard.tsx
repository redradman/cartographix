import { motion } from 'framer-motion';

interface ThemeCardProps {
  name: string;
  colors: string[];
  selected: boolean;
  onClick: () => void;
}

export default function ThemeCard({ name, colors, selected, onClick }: ThemeCardProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      className={`group flex flex-col items-center gap-2 cursor-pointer transition-all duration-150 ${
        selected ? 'scale-[1.02]' : ''
      }`}
    >
      <div
        className={`w-20 h-14 rounded-lg overflow-hidden border-2 transition-all duration-150 relative ${
          selected
            ? 'border-[#0A0A0A] shadow-md'
            : 'border-[#E5E7EB] group-hover:shadow-md'
        }`}
      >
        {colors.map((color, i) => (
          <div
            key={i}
            className="w-full"
            style={{ height: '14px', backgroundColor: color }}
          />
        ))}
        {selected && (
          <div className="absolute top-1 right-1 w-4 h-4 bg-[#0A0A0A] rounded-full flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
      <span className={`text-xs transition-colors ${selected ? 'text-[#0A0A0A] font-medium' : 'text-[#6B7280]'}`}>
        {name}
      </span>
    </motion.button>
  );
}
