export default function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-[#E5E7EB] dark:border-[#2A2A2A] transition-colors">
      <div className="max-w-6xl mx-auto text-center text-sm text-[#9CA3AF] dark:text-[#6B7280]">
        <p>
          Open source{' '}
          <span className="mx-1">&middot;</span>{' '}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#0A0A0A] dark:hover:text-white transition-colors"
          >
            GitHub
          </a>{' '}
          <span className="mx-1">&middot;</span>{' '}
          Built by Radman
        </p>
      </div>
    </footer>
  );
}
