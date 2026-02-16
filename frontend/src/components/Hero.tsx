import { motion } from 'framer-motion';

export default function Hero() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-16">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-5xl md:text-6xl font-bold text-[#0A0A0A] text-center tracking-tight"
      >
        Turn any city into art.
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="mt-6 text-lg md:text-xl text-[#6B7280] text-center max-w-xl"
      >
        Generate beautiful, minimalist street-map posters of any city in the world.
        Choose a theme, pick a radius, and get it delivered to your inbox.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="mt-12 w-64 h-80 md:w-72 md:h-96 rounded-lg bg-[#F8F9FA] border border-[#E5E7EB] shadow-xl flex items-center justify-center"
      >
        <div className="w-48 h-64 md:w-56 md:h-72 rounded bg-gradient-to-b from-[#0A0A0A] to-[#374151] flex items-end p-4">
          <div className="text-white">
            <p className="text-xs tracking-widest uppercase opacity-60">Example</p>
            <p className="text-sm font-semibold mt-1">City Poster</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="mt-12"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="text-[#9CA3AF]"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </motion.div>
      </motion.div>
    </section>
  );
}
