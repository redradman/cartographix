import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToastProps {
  message: string;
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, visible, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [visible, onClose, duration]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, x: 0 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed bottom-6 right-6 z-50 bg-[#0A0A0A] text-white px-5 py-3.5 rounded-xl shadow-2xl text-sm font-medium max-w-sm"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
