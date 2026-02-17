import { motion, type Variants } from 'framer-motion';
import type { Theme } from '@/lib/api';
import ThemeCard from './ThemeCard';

interface ThemeSelectorProps {
  themes: Theme[];
  selected: string;
  onSelect: (id: string) => void;
}

const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.03 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

export default function ThemeSelector({ themes, selected, onSelect }: ThemeSelectorProps) {
  return (
    <motion.div
      className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {themes.map((theme) => (
        <motion.div key={theme.id} variants={item}>
          <ThemeCard
            name={theme.name}
            colors={theme.preview_colors}
            selected={selected === theme.id}
            onClick={() => onSelect(theme.id)}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
