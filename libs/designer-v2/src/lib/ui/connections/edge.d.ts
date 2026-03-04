import type React from 'react';
import type { ElkExtendedEdge } from 'elkjs/lib/elk-api';
import { type EdgeProps } from '@xyflow/react';
export interface LogicAppsEdgeProps {
    id: string;
    source: string;
    target: string;
    elkEdge?: ElkExtendedEdge;
    style?: React.CSSProperties;
}
declare const _default: React.NamedExoticComponent<EdgeProps<LogicAppsEdgeProps>>;
export default _default;
