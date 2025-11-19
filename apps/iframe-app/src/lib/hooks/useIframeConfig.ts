import { useMemo } from 'react';
import { parseIframeConfig, type IframeConfig } from '../utils/config-parser';

/**
 * Custom hook to parse and manage iframe configuration
 * Parses URL parameters and data attributes to build the configuration
 */
export function useIframeConfig(): IframeConfig {
  return useMemo(() => parseIframeConfig(), []);
}
