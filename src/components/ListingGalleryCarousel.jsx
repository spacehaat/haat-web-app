import { useMemo, useRef, useState } from 'react';

const MAX_DOTS = 4;

function visibleDotCount(total) {
  if (total <= 1) return 0;
  return Math.min(total, MAX_DOTS);
}

function activeDotIndex(currentIndex, total, dots) {
  if (total <= dots) return currentIndex;
  if (total <= 1) return 0;
  return Math.round((currentIndex / (total - 1)) * (dots - 1));
}

export default function ListingGalleryCarousel({ photos, onOpenGallery }) {
  const trackRef = useRef(null);
  const [index, setIndex] = useState(0);

  const items = useMemo(() => photos?.filter((ph) => ph?.src) || [], [photos]);
  const dotCount = visibleDotCount(items.length);
  const activeDot = activeDotIndex(index, items.length, dotCount);

  if (!items.length) return null;

  const openAt = (i) => onOpenGallery?.(i);

  const onScroll = () => {
    const track = trackRef.current;
    if (!track || !track.clientWidth) return;
    const next = Math.round(track.scrollLeft / track.clientWidth);
    setIndex(Math.max(0, Math.min(next, items.length - 1)));
  };

  return (
    <div className="listing-gal-carousel">
      <div
        ref={trackRef}
        className="listing-gal-track"
        onScroll={onScroll}
      >
        {items.map((ph, i) => (
          <button
            type="button"
            key={`${ph.src}-${i}`}
            className="listing-gal-slide"
            onClick={() => openAt(i)}
            aria-label={`View photo ${i + 1} of ${items.length}`}
          >
            <img src={ph.src} alt={ph.label || `Photo ${i + 1}`} loading={i === 0 ? 'eager' : 'lazy'} />
          </button>
        ))}
      </div>

      <button type="button" className="listing-gal-count" onClick={() => openAt(index)}>
        {index + 1}/{items.length}
      </button>

      {dotCount > 1 ? (
        <div className="listing-gal-dots" aria-hidden="true">
          {Array.from({ length: dotCount }, (_, i) => (
            <span key={i} className={`listing-gal-dot ${i === activeDot ? 'on' : ''}`} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
