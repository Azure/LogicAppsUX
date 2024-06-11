import { type MutableRefObject, useEffect, useState, useMemo } from 'react';

const useIsInViewport = (ref: MutableRefObject<HTMLDivElement | null>) => {
  const [isIntersecting, setIsIntersecting] = useState(false);

  const observer = useMemo(() => new IntersectionObserver(([entry]) => setIsIntersecting(entry.isIntersecting)), []);

  useEffect(() => {
    if (ref?.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [ref, observer]);

  return isIntersecting;
};

export default useIsInViewport;
