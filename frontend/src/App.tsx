import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Generator from './components/Generator';
import HowItWorks from './components/HowItWorks';
import Footer from './components/Footer';

export default function App() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
      <Navbar />
      <Hero />
      <Generator />
      <HowItWorks />
      <Footer />
    </div>
  );
}
