import { keyframes, mergeStyleSets } from '@fluentui/react';
import type { IStyle } from '@fluentui/react';

function getBorderGlintStyle(options: {
  glintA: string;
  glintB: string;
  glintC: string;
  speedMilliseconds: number;
  delayMilliseconds?: number;
  borderSize?: string;
  glintWidth?: string;
}): IStyle {
  const { glintA, glintB, glintC, speedMilliseconds, delayMilliseconds = 0, borderSize = '2px', glintWidth = '225px' } = options;

  const borderMotion: string = keyframes({
    '0%': {
      // off-screen left
      backgroundPosition: `calc(-1 * ${glintWidth} + 1px) 0`,
    },
    '100%': {
      // off-screen right
      backgroundPosition: `calc(100% + ${glintWidth} + 1px) 0`,
    },
  });

  return {
    position: 'relative',
    '::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      zIndex: 2,
      borderRadius: 4,
      backgroundImage: `linear-gradient(130deg, ${glintA} 0%, ${glintB} 15%, ${glintC} 50%, ${glintB} 85%, ${glintA} 100%)`,
      backgroundPosition: `calc(-1 * ${glintWidth} + 1px) 0`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: `${glintWidth} 100%`,
      clipPath: `polygon(0% 100%, ${borderSize} 100%, ${borderSize} ${borderSize}, calc(100% - ${borderSize}) ${borderSize}, calc(100% - ${borderSize}) calc(100% - ${borderSize}), ${borderSize} calc(100% - ${borderSize}), ${borderSize} 100%, 100% 100%, 100% 0%, 0% 0%)`,
      animationName: borderMotion,
      animationDuration: `${speedMilliseconds}ms`,
      animationTimingFunction: 'linear',
      animationFillMode: 'both',
      animationDelay: `${delayMilliseconds}ms`,
      '@media (prefers-reduced-motion)': {
        display: 'none',
      },
    },
  };
}

export function getTextGlintStyle(options: {
  textGlowA: string;
  textGlowB: string;
  speedMilliseconds: number;
  delayMilliseconds?: number;
}): IStyle {
  const { textGlowA, textGlowB, speedMilliseconds, delayMilliseconds = 0 } = options;

  const textMotion: string = keyframes({
    '0%': {
      backgroundPosition: '-80% 0',
    },
    '60%': {
      backgroundPosition: '300% 0',
    },
    '100%': {
      backgroundPosition: '300% 0',
    },
  });

  return {
    position: 'relative',
    '::after': {
      display: 'block',
      position: 'absolute',
      inset: 0,
      zIndex: 0,
      content: 'attr(data-animation-text)',
      pointerEvents: 'none',
      color: 'transparent',
      backgroundImage: `linear-gradient(130deg, ${textGlowA} 5%, ${textGlowB} 30%, ${textGlowA} 55%)`,
      backgroundSize: '150px 100%',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: '-120% 0',
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      animationName: textMotion,
      animationDuration: `${speedMilliseconds}ms`,
      animationTimingFunction: 'ease',
      animationFillMode: 'both',
      animationDelay: `${delayMilliseconds}ms`,
      '@media (prefers-reduced-motion)': {
        display: 'none',
      },
    },
  };
}
const fadeIn = keyframes({
  from: {
    opacity: 0,
    pointerEvents: 'none',
  },
  to: {
    opacity: 1,
    pointerEvents: 'auto',
  },
});

const scaleFromLeft = keyframes({
  from: {
    transform: 'scale(0.9) translate3d(-20px, 10px, 10px)',
  },
  to: {
    transform: 'scale(1)',
  },
});

const scaleFromRight = keyframes({
  from: {
    transform: 'scale(0.9) translate3d(20px, 10px, 10px)',
  },
  to: {
    transform: 'scale(1)',
  },
});

const slideFromBottom = keyframes({
  from: {
    transform: 'translate3d(0px, 10px, 10px)',
  },
  to: {
    transform: 'translate3d(0, 0, 0)',
  },
});

const enterDuration = 500;
const enterDurationInSecond = (enterDuration / 1000).toFixed(1) + 's';
const messageTimingFunction = 'cubic-bezier(0.55,0.55,0,1)';
const glintSpeed = 1000;

export const animations = mergeStyleSets({
  assistantMessageEnter: {
    animationDuration: enterDurationInSecond,
    animationTimingFunction: messageTimingFunction,
    animationName: `${fadeIn}, ${scaleFromLeft}`,
  },
  userMessageEnter: {
    animationDuration: enterDurationInSecond,
    animationTimingFunction: messageTimingFunction,
    animationName: `${fadeIn}, ${scaleFromRight}`,
  },
  progressCardEnter: {
    animationDuration: enterDurationInSecond,
    animationTimingFunction: 'ease-in',
    animationName: `${fadeIn}, ${slideFromBottom}`,
  },
  messageBorderGlint: getBorderGlintStyle({
    glintA: 'rgba(164, 94, 208, 0.5)',
    glintB: 'rgba(0, 102, 255, 0.7)',
    glintC: 'rgba(164, 94, 208, 0.7)',
    speedMilliseconds: glintSpeed,
    delayMilliseconds: enterDuration,
    glintWidth: '308px',
  }),
});
