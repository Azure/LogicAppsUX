import { createContext } from 'react';

/** React Flow mounts the junction and its edge label in different DOM branches. Match by source node ID. */
export const MergeHoverContext = createContext<string | undefined>(undefined);
