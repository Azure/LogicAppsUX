import * as React from 'react';

import DefaultIcon from '../recommendation/images/defaulticon.svg';

export interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = (props) => {
  const handleImageError = React.useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>): void => {
      e.currentTarget.setAttribute('src', props.fallback ?? DefaultIcon);
    },
    [props.fallback]
  );

  return <img {...props} onError={handleImageError} />;
};
