import type { SchemaNodeExtended } from '@microsoft/logic-apps-shared';

export interface ViewportCoords {
  startX: number;
  endX: number;
  startY: number;
  endY: number;
}

export type SchemaNodeReactFlowDataProps = SchemaNodeExtended & {
  isLeftDirection: boolean;
  id: string;
};
