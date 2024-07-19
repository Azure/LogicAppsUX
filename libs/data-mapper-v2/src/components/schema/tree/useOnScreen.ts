import { type RefObject, useLayoutEffect, useMemo, useState } from 'react';

const useOnScreen = (ref: RefObject<HTMLElement>) => {
  const [isIntersecting, setIntersecting] = useState<boolean>();

  const observer = useMemo(() => new IntersectionObserver(([entry]) => setIntersecting(entry.isIntersecting)), []);

  useLayoutEffect(() => {
    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [ref, observer]);

  return isIntersecting;
};

export default useOnScreen;
