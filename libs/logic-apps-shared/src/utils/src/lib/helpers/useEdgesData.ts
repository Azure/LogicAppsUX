import { useCallback } from 'react';
import type { EdgeBase } from '@xyflow/system';
import { type Edge, useStore } from '@xyflow/react';

// Riley's note - This is modeled after the 'useEdgesData' hook from the @xyflow/react package

/**
 * Hook for receiving data of one or multiple edges
 *
 * @public
 * @param edgeId - The id (or ids) of the edge to get the data from
 * @param guard - Optional guard function to narrow down the edge type
 * @returns An object (or array of object) with {id, type, data} representing each edge
 */
export function useEdgesData<EdgeType extends Edge = Edge>(edgeId: string): Pick<EdgeType, 'id' | 'type' | 'data'> | null;
export function useEdgesData<EdgeType extends Edge = Edge>(edgeIds: string[]): Pick<EdgeType, 'id' | 'type' | 'data'>[];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useEdgesData(edgeIds: any): any {
  const edgesData = useStore(
    useCallback(
      (s) => {
        const data = [];
        const isArrayOfIds = Array.isArray(edgeIds);
        const _edgeIds = isArrayOfIds ? edgeIds : [edgeIds];

        for (const edgeId of _edgeIds) {
          const edge = s.edgeLookup.get(edgeId);
          if (edge) {
            data.push({
              id: edge.id,
              type: edge.type,
              data: edge.data,
            });
          }
        }

        return isArrayOfIds ? data : data[0] ?? null;
      },
      [edgeIds]
    ),
    shallowEdgeData
  );

  return edgesData;
}

type EdgeData = Pick<EdgeBase, 'id' | 'type' | 'data'>;

function shallowEdgeData(a: EdgeData | EdgeData[] | null, b: EdgeData | EdgeData[] | null) {
  if (a === null || b === null) {
    return false;
  }

  const _a = Array.isArray(a) ? a : [a];
  const _b = Array.isArray(b) ? b : [b];

  if (_a.length !== _b.length) {
    return false;
  }

  for (let i = 0; i < _a.length; i++) {
    if (_a[i].id !== _b[i].id || _a[i].type !== _b[i].type || !Object.is(_a[i].data, _b[i].data)) {
      return false;
    }
  }

  return true;
}
