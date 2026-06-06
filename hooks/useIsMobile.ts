import { useEffect, useState } from "react";

export default function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const ua = navigator.userAgent || "";
    const uaMobile =
      /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(ua) ||
      (navigator as any).userAgentData?.mobile === true;

    return uaMobile || window.matchMedia("(max-width: 768px)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const onChange = () => {
      const ua = navigator.userAgent || "";
      const uaMobile =
        /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(ua) ||
        (navigator as any).userAgentData?.mobile === true;

      setIsMobile(uaMobile || mq.matches);
    };

    onChange();
    mq.addEventListener?.("change", onChange);
    window.addEventListener("resize", onChange);

    return () => {
      mq.removeEventListener?.("change", onChange);
      window.removeEventListener("resize", onChange);
    };
  }, []);

  return isMobile;
}
