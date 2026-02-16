export default function ThemeSkeleton() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
      {Array.from({ length: 17 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <div className="w-20 h-14 rounded-lg bg-[#E5E7EB] dark:bg-[#1A1A1A] animate-pulse" />
          <div className="w-12 h-3 rounded bg-[#E5E7EB] dark:bg-[#1A1A1A] animate-pulse" />
        </div>
      ))}
    </div>
  );
}
