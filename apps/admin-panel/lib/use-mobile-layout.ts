import { useEffect, useState } from "react";

const MOBILE_LAYOUT_MEDIA_QUERY = "(max-width: 1024px)";

export function useIsMobileLayout(): boolean {
  const [isMobileLayout, setIsMobileLayout] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }

    return window.matchMedia(MOBILE_LAYOUT_MEDIA_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(MOBILE_LAYOUT_MEDIA_QUERY);
    const syncLayout = () => {
      setIsMobileLayout(mediaQuery.matches);
    };

    syncLayout();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncLayout);
      return () => {
        mediaQuery.removeEventListener("change", syncLayout);
      };
    }

    mediaQuery.addListener(syncLayout);
    return () => {
      mediaQuery.removeListener(syncLayout);
    };
  }, []);

  return isMobileLayout;
}
