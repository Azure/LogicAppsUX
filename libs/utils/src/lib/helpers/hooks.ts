import { useCallback, useEffect, useRef, useState } from 'react';

export const useThrottledEffect = (effect: () => void, deps: any[], delay: number) => {
  const timestamp = useRef(Date.now());

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const callback = useCallback(effect, deps); // Our trace was making this loop infinitely if we depend on the effect

  useEffect(() => {
    const timeoutFunc = () => {
      if (Date.now() - timestamp.current >= delay) {
        callback();
        timestamp.current = Date.now();
      }
    };
    const handler = setTimeout(timeoutFunc, delay - (Date.now() - timestamp.current));
    return () => clearTimeout(handler);
  }, [callback, delay]);
};

function getWindowDimensions() {
  const { innerWidth: width, innerHeight: height } = window;
  return { width, height };
}

export const useWindowDimensions = () => {
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());

  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowDimensions;
};

export const useConsoleLog = (value: any) => useEffect(() => console.log(value), [value]);
