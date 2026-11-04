import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import { getNodeGlyph } from '@microsoft/designer-ui-v2';
import type { NodeRunStatus } from '@microsoft/designer-ui-v2';

export const statuses = [
  'pending',
  'running',
  'succeeded',
  'skipped',
  'failed',
  'error',
  'warning',
  'cancelled',
  'mock',
] as const satisfies readonly NodeRunStatus[];
export const statusControl = { control: 'select' as const, options: [undefined, ...statuses] };
export const axisControl = { control: 'inline-radio' as const, options: ['horizontal', 'vertical'] };
export const categoryControl = { control: 'select' as const, options: ['trigger', 'action', 'control', 'agent'] };
const glyph = getNodeGlyph('http');
export const requestIcon = <glyph.regular />;
export const selectedRequestIcon = <glyph.filled />;

export function Example({ label, children }: PropsWithChildren<{ label: string }>) {
  return (
    <figure className="sb-example">
      <figcaption className="sb-caption">{label}</figcaption>
      {children}
    </figure>
  );
}

export function Slot({ label }: { label: string }) {
  return <span className="sb-slot" title={`${label} — illustrative DOM slot, not a graph port`} />;
}

export function BrowserPreferences() {
  const [preferences, setPreferences] = useState({ reducedMotion: false, forcedColors: false });
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const colors = window.matchMedia('(forced-colors: active)');
    const update = () => setPreferences({ reducedMotion: motion.matches, forcedColors: colors.matches });
    update();
    motion.addEventListener('change', update);
    colors.addEventListener('change', update);
    return () => {
      motion.removeEventListener('change', update);
      colors.removeEventListener('change', update);
    };
  }, []);
  return (
    <output className="sb-note" data-testid="browser-preferences">
      Actual browser preferences: reduced motion {preferences.reducedMotion ? 'reduce' : 'no-preference'}; forced colors{' '}
      {preferences.forcedColors ? 'active' : 'none'}. Change OS/browser emulation, not a CSS-only toolbar.
    </output>
  );
}
