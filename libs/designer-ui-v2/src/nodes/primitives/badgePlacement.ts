import { nodeMetrics } from '../metrics';

/**
 * Left edge for vertical-axis status badges: just past the top-centred input handle, so badges never cover it.
 * Kept out of `nodes/metrics` because that module's published declarations must stay numeric-only.
 */
export const verticalBadgeLeft = `calc(50% + ${nodeMetrics.handle.size / 2 + nodeMetrics.badge.handleGap}px)`;
