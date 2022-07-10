import type { ConnectionsJSON } from './connectionReferences';

export type Workflow<T> = {
  definition: T;
  connectionReferences: ConnectionsJSON | null;
};
