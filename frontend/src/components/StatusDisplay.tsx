import { motion, AnimatePresence } from 'framer-motion';

type AppState = 'default' | 'generating' | 'completed' | 'error' | 'rate_limited';

interface StatusDisplayProps {
  state: AppState;
  city: string;
  errorMessage?: string;
  onRetry: () => void;
  onReset: () => void;
}

function Spinner() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      className="w-8 h-8 border-2 border-[#E5E7EB] border-t-[#0A0A0A] rounded-full"
    />
  );
}

function Checkmark() {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className="w-16 h-16 bg-[#0A0A0A] rounded-full flex items-center justify-center"
    >
      <motion.svg
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="w-8 h-8 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <motion.path
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3}
          d="M5 13l4 4L19 7"
        />
      </motion.svg>
    </motion.div>
  );
}

export default function StatusDisplay({ state, city, errorMessage, onRetry, onReset }: StatusDisplayProps) {
  return (
    <AnimatePresence mode="wait">
      {state === 'generating' && (
        <motion.div
          key="generating"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center justify-center py-16 gap-6"
        >
          <Spinner />
          <p className="text-[#6B7280] text-center">
            Creating your poster of <span className="font-semibold text-[#0A0A0A]">{city}</span>...
          </p>
          <p className="text-sm text-[#9CA3AF]">This usually takes about a minute</p>
        </motion.div>
      )}

      {state === 'completed' && (
        <motion.div
          key="completed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center justify-center py-16 gap-6"
        >
          <Checkmark />
          <div className="text-center">
            <p className="text-lg font-semibold text-[#0A0A0A]">
              Your poster of {city} is on its way!
            </p>
            <p className="text-[#6B7280] mt-2">Check your email.</p>
          </div>
          <button
            onClick={onReset}
            className="mt-4 px-6 py-3 bg-[#0A0A0A] text-white rounded-lg font-medium hover:bg-[#1a1a1a] transition-all hover:-translate-y-0.5 active:scale-[0.98]"
          >
            Create another
          </button>
        </motion.div>
      )}

      {state === 'error' && (
        <motion.div
          key="error"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center justify-center py-16 gap-4"
        >
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-red-600 text-center">{errorMessage || 'Something went wrong'}</p>
          <button
            onClick={onRetry}
            className="mt-2 px-6 py-3 bg-[#0A0A0A] text-white rounded-lg font-medium hover:bg-[#1a1a1a] transition-all hover:-translate-y-0.5 active:scale-[0.98]"
          >
            Try again
          </button>
        </motion.div>
      )}

      {state === 'rate_limited' && (
        <motion.div
          key="rate_limited"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center justify-center py-16 gap-4"
        >
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-[#6B7280] text-center">
            You've created 3 posters today — come back tomorrow!
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
