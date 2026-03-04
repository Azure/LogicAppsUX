export interface DropItem {
    id: string;
    dependencies?: string[];
    loopSources?: string[];
    graphId?: string;
    isScope?: boolean;
    isAgent?: boolean;
}
/**
 * Computes the set of nodes that depend on the given node (downstream dependencies)
 * @param nodeId - The node to find dependents for
 * @param allNodesDependencies - Map of all nodes and their dependencies
 * @returns Set of node IDs that depend on the given node
 */
export declare const getDownstreamDependencies: (nodeId: string, allNodesDependencies: Record<string, Set<string>>) => Set<string>;
export declare const canDropItem: (item: DropItem, upstreamNodes: Set<string>, upstreamNodesDependencies: Record<string, Set<string>>, upstreamScopes: Set<string>, childId: string | undefined, parentId: string | undefined, preventDropItemInA2A: boolean, isWithinAgenticLoop: boolean, allNodesDependencies?: Record<string, Set<string>>) => boolean;
