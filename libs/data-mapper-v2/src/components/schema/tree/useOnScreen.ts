import { type RefObject, useEffect, useMemo, useState } from 'react';

const useOnScreen = (ref: RefObject<HTMLElement>) => {
  const [isIntersecting, setIntersecting] = useState<boolean>();

  const observer = useMemo(() => new IntersectionObserver(([entry]) => setIntersecting(entry.isIntersecting)), []);

  useEffect(() => {
    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, observer, ref.current]);

  return isIntersecting;
};

export default useOnScreen;
