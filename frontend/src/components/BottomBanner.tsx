export default function BottomBanner() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md border-t border-[#E5E7EB] dark:border-[#1F1F1F] transition-colors">
      <div className="max-w-6xl mx-auto px-6 py-2.5 flex items-center justify-center text-xs text-[#9CA3AF] dark:text-[#6B7280]">
        <span>
          Based on{' '}
          <a
            href="https://github.com/originalankur/maptoposter"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#0A0A0A] dark:hover:text-white transition-colors underline underline-offset-2"
          >
            MapToPoster
          </a>
          {' '}by Ankur Kumar
          <span className="mx-2">&middot;</span>
          Made by{' '}
          <a
            href="https://radman.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#0A0A0A] dark:hover:text-white transition-colors underline underline-offset-2"
          >
            Radman Rakhshandehroo
          </a>
        </span>
      </div>
    </div>
  );
}
