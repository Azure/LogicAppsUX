import { getId } from '@fluentui/utilities/lib/getId';
import * as React from 'react';

export function useId(prefix?: string, providedId?: string): string {
  // getId should only be called once since it updates the global constant for the next ID value.
  // (While an extra update isn't likely to cause problems in practice, it's better to avoid it.)
  const ref = React.useRef<string | undefined>(providedId);
  if (!ref.current) {
    ref.current = getId(prefix);
  }
  return ref.current;
}
