import type { ConnectionsJSON } from './connectionReferences';

export type Workflow<T> = {
  // danielle do we need generic here
  definition: T;
  connectionReferences: ConnectionsJSON | null;
};
