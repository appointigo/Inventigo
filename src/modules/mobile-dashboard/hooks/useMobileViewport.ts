"use client";

import { useEffect, useState } from "react";

const MOBILE_QUERY = "(max-width: 991px)";

export function useMobileViewport() {
  const [isMobile, setIsMobile] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_QUERY);
    const update = () => {
      setIsMobile(mediaQuery.matches);
      setIsReady(true);
    };

    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return { isMobile, isReady };
}
