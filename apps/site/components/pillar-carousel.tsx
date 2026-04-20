"use client";

import { PointerEvent, useEffect, useRef, useState } from "react";

type PillarItem = {
  title: string;
  description: string;
};

type PillarCarouselProps = {
  items: readonly PillarItem[];
};

export function PillarCarousel({ items }: PillarCarouselProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const dragStateRef = useRef<{ pointerId: number; startX: number; startScrollLeft: number } | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const node = trackRef.current;

    if (!node) {
      return;
    }

    const updateCurrentIndex = () => {
      const scrollLeft = node.scrollLeft;
      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;

      cardRefs.current.forEach((card, index) => {
        if (!card) {
          return;
        }

        const distance = Math.abs(card.offsetLeft - scrollLeft);

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });

      setCurrentIndex(nearestIndex);
    };

    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        return;
      }

      const canScrollHorizontally = node.scrollWidth > node.clientWidth;

      if (!canScrollHorizontally) {
        return;
      }

      event.preventDefault();
      node.scrollLeft += event.deltaY;
    };

    updateCurrentIndex();
    node.addEventListener("scroll", updateCurrentIndex, { passive: true });
    node.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("resize", updateCurrentIndex);

    return () => {
      node.removeEventListener("scroll", updateCurrentIndex);
      node.removeEventListener("wheel", handleWheel);
      window.removeEventListener("resize", updateCurrentIndex);
    };
  }, []);

  const scrollToCard = (index: number) => {
    const node = trackRef.current;
    const targetCard = cardRefs.current[index];

    if (!node || !targetCard) {
      return;
    }

    node.scrollTo({
      left: targetCard.offsetLeft,
      behavior: "smooth"
    });
  };

  const handlePrev = () => {
    scrollToCard(Math.max(currentIndex - 1, 0));
  };

  const handleNext = () => {
    scrollToCard(Math.min(currentIndex + 1, items.length - 1));
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const node = trackRef.current;

    if (!node || event.pointerType === "touch") {
      return;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: node.scrollLeft
    };

    setIsDragging(true);
    node.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const node = trackRef.current;
    const dragState = dragStateRef.current;

    if (!node || !dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    node.scrollLeft = dragState.startScrollLeft - deltaX;
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const node = trackRef.current;
    const dragState = dragStateRef.current;

    if (!node || !dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    dragStateRef.current = null;
    setIsDragging(false);

    if (node.hasPointerCapture(event.pointerId)) {
      node.releasePointerCapture(event.pointerId);
    }

    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    cardRefs.current.forEach((card, index) => {
      if (!card) {
        return;
      }

      const distance = Math.abs(card.offsetLeft - node.scrollLeft);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    scrollToCard(nearestIndex);
  };

  return (
    <div className="marketing-pillars-carousel">
      <div className="marketing-pillars-controls" aria-label="Navegação do carrossel">
        <button
          type="button"
          className="marketing-pillars-control"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          aria-label="Ver cards anteriores"
        >
          <span aria-hidden="true">←</span>
        </button>
        <button
          type="button"
          className="marketing-pillars-control"
          onClick={handleNext}
          disabled={currentIndex === items.length - 1}
          aria-label="Ver próximos cards"
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>

      <div
        ref={trackRef}
        className={`marketing-pillars-grid${isDragging ? " is-dragging" : ""}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {items.map((pillar, index) => (
          <article
            key={pillar.title}
            ref={(node) => {
              cardRefs.current[index] = node;
            }}
            className="marketing-pillar-card"
          >
            <div className="marketing-pillar-media">
              <span className="marketing-pillar-index" />
              <div className="marketing-pillar-body">
                <strong>{pillar.title}</strong>
                <p>{pillar.description}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
