import { motion, AnimatePresence } from 'framer-motion';

type AppState = 'default' | 'generating' | 'completed' | 'error' | 'rate_limited';

interface StatusDisplayProps {
  state: AppState;
  city: string;
  stage?: string;
  email?: string;
  posterUrl?: string | null;
  errorMessage?: string;
  onRetry: () => void;
  onReset: () => void;
}

function Spinner() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      className="w-8 h-8 border-2 border-[#E5E7EB] dark:border-[#2A2A2A] border-t-[#0A0A0A] dark:border-t-white rounded-full"
    />
  );
}

function Checkmark() {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className="w-16 h-16 bg-[#10B981] rounded-full flex items-center justify-center"
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

function getStageMessage(stage: string | undefined, city: string): string {
  switch (stage) {
    case 'geocoding': return `Locating ${city} on the map...`;
    case 'fetching_streets': return 'Fetching street data...';
    case 'rendering': return 'Rendering your poster...';
    case 'sending_email': return 'Sending to your inbox...';
    case 'done': return 'Almost there...';
    default: return `Creating your poster of ${city}...`;
  }
}

export default function StatusDisplay({ state, city, stage, email, posterUrl, errorMessage, onRetry, onReset }: StatusDisplayProps) {
  const handleDownload = () => {
    if (!posterUrl) return;
    const link = document.createElement('a');
    link.href = posterUrl;
    link.download = `${city.toLowerCase().replace(/\s+/g, '_')}_poster.png`;
    link.click();
  };

  return (
    <AnimatePresence mode="wait">
      {state === 'generating' && (
        <motion.div
          key="generating"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center justify-center py-16 gap-6"
        >
          <Spinner />
          <p className="text-[#6B7280] dark:text-[#9CA3AF] text-center">
            {getStageMessage(stage, city)}
          </p>
          <p className="text-sm text-[#9CA3AF] dark:text-[#6B7280]">This usually takes about a minute</p>
        </motion.div>
      )}

      {state === 'completed' && (
        <motion.div
          key="completed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center justify-center py-16 gap-6"
        >
          <Checkmark />
          <div className="text-center">
            <p className="text-lg font-semibold text-[#0A0A0A] dark:text-[#F9FAFB]">
              Your poster of {city} is ready!
            </p>
            {email && <p className="text-[#6B7280] dark:text-[#9CA3AF] mt-2">We've also sent it to your email.</p>}
          </div>

          {posterUrl && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-4 w-full max-w-md"
            >
              <div className="rounded-lg overflow-hidden shadow-xl border border-[#E5E7EB] dark:border-[#2A2A2A]">
                <img
                  src={posterUrl}
                  alt={`Map poster of ${city}`}
                  className="w-full h-auto"
                />
              </div>
              <button
                onClick={handleDownload}
                className="mt-4 w-full py-3 border-2 border-[#0A0A0A] dark:border-white text-[#0A0A0A] dark:text-white rounded-lg font-medium hover:bg-[#0A0A0A] dark:hover:bg-white hover:text-white dark:hover:text-[#0A0A0A] transition-all hover:-translate-y-0.5 active:scale-[0.98]"
              >
                Download poster
              </button>
            </motion.div>
          )}

          <button
            onClick={onReset}
            className="mt-2 px-6 py-3 bg-[#0A0A0A] dark:bg-white text-white dark:text-[#0A0A0A] rounded-lg font-medium hover:bg-[#1a1a1a] dark:hover:bg-[#E5E7EB] transition-all hover:-translate-y-0.5 active:scale-[0.98]"
          >
            Create another
          </button>
        </motion.div>
      )}

      {state === 'error' && (
        <motion.div
          key="error"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center justify-center py-16 gap-4"
        >
          <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-red-600 dark:text-red-400 text-center">{errorMessage || 'Something went wrong'}</p>
          <button
            onClick={onRetry}
            className="mt-2 px-6 py-3 bg-[#0A0A0A] dark:bg-white text-white dark:text-[#0A0A0A] rounded-lg font-medium hover:bg-[#1a1a1a] dark:hover:bg-[#E5E7EB] transition-all hover:-translate-y-0.5 active:scale-[0.98]"
          >
            Try again
          </button>
        </motion.div>
      )}

      {state === 'rate_limited' && (
        <motion.div
          key="rate_limited"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center justify-center py-16 gap-4"
        >
          <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-[#6B7280] dark:text-[#9CA3AF] text-center">
            You've created 3 posters today — come back tomorrow!
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
