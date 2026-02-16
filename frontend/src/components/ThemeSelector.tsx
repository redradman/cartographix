import type { Theme } from '@/lib/api';
import ThemeCard from './ThemeCard';

interface ThemeSelectorProps {
  themes: Theme[];
  selected: string;
  onSelect: (id: string) => void;
}

export default function ThemeSelector({ themes, selected, onSelect }: ThemeSelectorProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
      {themes.map((theme) => (
        <ThemeCard
          key={theme.id}
          name={theme.name}
          colors={theme.preview_colors}
          selected={selected === theme.id}
          onClick={() => onSelect(theme.id)}
        />
      ))}
    </div>
  );
}
