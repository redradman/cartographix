import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const HERO_POSTERS = [
  { city: 'Tokyo', slug: 'tokyo', theme: 'Midnight', themeId: 'midnight' },
  { city: 'Paris', slug: 'paris', theme: 'Classic', themeId: 'classic' },
  { city: 'New York', slug: 'new_york', theme: 'Blueprint', themeId: 'blueprint' },
  { city: 'London', slug: 'london', theme: 'Monochrome', themeId: 'monochrome' },
  { city: 'Barcelona', slug: 'barcelona', theme: 'Sunset', themeId: 'sunset' },
];

export default function Hero() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % HERO_POSTERS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const current = HERO_POSTERS[index];

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-16">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-5xl md:text-6xl font-bold text-[#0A0A0A] dark:text-[#F9FAFB] text-center tracking-tight"
      >
        Turn any city into art.
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="mt-6 text-lg md:text-xl text-[#6B7280] dark:text-[#9CA3AF] text-center max-w-xl"
      >
        Generate beautiful, minimalist street-map posters of any city in the world.
        Choose a theme, pick a radius, and get it delivered to your inbox.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="mt-12 w-64 h-80 md:w-72 md:h-96 rounded-lg bg-[#F8F9FA] dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#2A2A2A] shadow-xl p-3 flex flex-col"
      >
        <div className="flex-1 rounded overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0"
            >
              <img
                src={`/previews/${current.slug}/${current.themeId}.jpg`}
                alt={`${current.city} ${current.theme} poster`}
                className="w-full h-full object-cover"
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* City + theme caption */}
      <div className="mt-4 h-10 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.4 }}
            className="text-center"
          >
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
              <span className="font-medium text-[#0A0A0A] dark:text-[#F9FAFB]">{current.city}</span>
              {' '}
              <span className="text-[#9CA3AF] dark:text-[#6B7280]">/</span>
              {' '}
              {current.theme}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="mt-8"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="text-[#9CA3AF] dark:text-[#6B7280]"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </motion.div>
      </motion.div>
    </section>
  );
}
