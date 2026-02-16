import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Generator from './components/Generator';
import HowItWorks from './components/HowItWorks';
import Footer from './components/Footer';
import { useDarkMode } from './hooks/useDarkMode';

export default function App() {
  const { isDark, toggle } = useDarkMode();

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A] transition-colors" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
      <Navbar isDark={isDark} onToggleDark={toggle} />
      <Hero />
      <Generator />
      <HowItWorks />
      <Footer />
    </div>
  );
}
