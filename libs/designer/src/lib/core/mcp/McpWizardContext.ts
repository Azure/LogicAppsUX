import { createContext } from 'react';
import type { ServiceOptions } from '../state/mcp/mcpOptions/mcpOptionsInterface';

export const McpWrappedContext = createContext<ServiceOptions | null>(null);
