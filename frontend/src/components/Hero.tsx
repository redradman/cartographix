import { motion } from 'framer-motion';

const ROW_1 = [
  { city: 'Tokyo', slug: 'tokyo', theme: 'Midnight', themeId: 'midnight' },
  { city: 'Paris', slug: 'paris', theme: 'Classic', themeId: 'classic' },
  { city: 'New York', slug: 'new_york', theme: 'Blueprint', themeId: 'blueprint' },
  { city: 'London', slug: 'london', theme: 'Monochrome', themeId: 'monochrome' },
  { city: 'Barcelona', slug: 'barcelona', theme: 'Sunset', themeId: 'sunset' },
  { city: 'Berlin', slug: 'berlin', theme: 'Cyberpunk', themeId: 'cyberpunk' },
];

const ROW_2 = [
  { city: 'Dubai', slug: 'dubai', theme: 'Desert', themeId: 'desert' },
  { city: 'Sydney', slug: 'sydney', theme: 'Ocean', themeId: 'ocean' },
  { city: 'Singapore', slug: 'singapore', theme: 'Neon', themeId: 'neon' },
  { city: 'Madrid', slug: 'madrid', theme: 'Vintage', themeId: 'vintage' },
  { city: 'Beijing', slug: 'beijing', theme: 'Arctic', themeId: 'arctic' },
  { city: 'Tokyo', slug: 'tokyo', theme: 'Watercolor', themeId: 'watercolor' },
];

export default function Hero() {
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

      {/* Infinite marquee */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="mt-12 w-full max-w-5xl relative overflow-hidden"
      >
        {/* Left fade */}
        <div className="absolute left-0 top-0 bottom-0 w-24 md:w-32 z-10 pointer-events-none bg-gradient-to-r from-white dark:from-[#0A0A0A] to-transparent" />
        {/* Right fade */}
        <div className="absolute right-0 top-0 bottom-0 w-24 md:w-32 z-10 pointer-events-none bg-gradient-to-l from-white dark:from-[#0A0A0A] to-transparent" />

        {/* Row 1 — scrolls left */}
        <div className="flex gap-6 hover:[animation-play-state:paused] [animation:marquee_35s_linear_infinite] w-max">
          {[...ROW_1, ...ROW_1].map((poster, i) => (
            <div key={i} className="flex-shrink-0 flex flex-col items-center">
              <div className="w-44 h-60 rounded-lg overflow-hidden border border-[#E5E7EB] dark:border-[#2A2A2A] shadow-lg bg-[#F8F9FA] dark:bg-[#111111]">
                <img
                  src={`/previews/${poster.slug}/${poster.themeId}.jpg`}
                  alt={`${poster.city} ${poster.theme} poster`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <p className="mt-2 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
                <span className="font-medium text-[#0A0A0A] dark:text-[#F9FAFB]">{poster.city}</span>
                {' '}
                <span className="text-[#9CA3AF] dark:text-[#6B7280]">/</span>
                {' '}
                {poster.theme}
              </p>
            </div>
          ))}
        </div>

        {/* Row 2 — scrolls right */}
        <div className="flex gap-6 mt-6 hover:[animation-play-state:paused] [animation:marquee-reverse_35s_linear_infinite] w-max">
          {[...ROW_2, ...ROW_2].map((poster, i) => (
            <div key={i} className="flex-shrink-0 flex flex-col items-center">
              <div className="w-44 h-60 rounded-lg overflow-hidden border border-[#E5E7EB] dark:border-[#2A2A2A] shadow-lg bg-[#F8F9FA] dark:bg-[#111111]">
                <img
                  src={`/previews/${poster.slug}/${poster.themeId}.jpg`}
                  alt={`${poster.city} ${poster.theme} poster`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <p className="mt-2 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
                <span className="font-medium text-[#0A0A0A] dark:text-[#F9FAFB]">{poster.city}</span>
                {' '}
                <span className="text-[#9CA3AF] dark:text-[#6B7280]">/</span>
                {' '}
                {poster.theme}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

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
