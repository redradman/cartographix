import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fetchGallery } from '@/lib/api';
import type { GalleryItem } from '@/lib/api';

function SkeletonCard() {
  return (
    <div className="rounded-xl overflow-hidden bg-[#F3F4F6] dark:bg-[#1A1A1A] animate-pulse">
      <div className="aspect-[3/4]" />
    </div>
  );
}

export default function Gallery() {
  const [posters, setPosters] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    fetchGallery(12, 0)
      .then(data => {
        setPosters(data.posters);
        setTotal(data.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const data = await fetchGallery(12, posters.length);
      setPosters(prev => [...prev, ...data.posters]);
      setTotal(data.total);
    } catch {
      // silently fail
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <section className="py-24 px-6 transition-colors">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-[#0A0A0A] dark:text-[#F9FAFB]">
            Community gallery
          </h2>
          <p className="mt-3 text-[#6B7280] dark:text-[#9CA3AF]">
            Posters shared by the community
          </p>
        </div>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {!loading && posters.length === 0 && (
          <p className="text-center text-[#9CA3AF] dark:text-[#6B7280] py-12">
            No posters shared yet. Be the first!
          </p>
        )}

        {!loading && posters.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {posters.map((poster, i) => (
                <motion.div
                  key={poster.share_id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: (i % 6) * 0.1 }}
                  className="group relative rounded-xl overflow-hidden shadow-sm border border-[#E5E7EB] dark:border-[#2A2A2A] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                >
                  <div className="aspect-[3/4] bg-[#F3F4F6] dark:bg-[#1A1A1A]">
                    <img
                      src={`/api/share/${poster.share_id}`}
                      alt={`Map poster of ${poster.city}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <p className="text-white font-semibold text-sm">{poster.city}</p>
                    <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-white/20 text-white/90 backdrop-blur-sm">
                      {poster.theme}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            {total > posters.length && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-3 border-2 border-[#0A0A0A] dark:border-white text-[#0A0A0A] dark:text-white rounded-lg font-medium hover:bg-[#0A0A0A] dark:hover:bg-white hover:text-white dark:hover:text-[#0A0A0A] transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50"
                >
                  {loadingMore ? 'Loading...' : 'View more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
