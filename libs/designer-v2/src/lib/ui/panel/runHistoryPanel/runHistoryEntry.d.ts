declare const RunHistoryEntry: (props: {
    runId: string;
    isSelected: boolean;
    onRunSelected: (id: string) => void;
    addFilterCallback: (filter: any) => void;
    size?: "small" | "medium" | undefined;
}) => import("react/jsx-runtime").JSX.Element | null;
export default RunHistoryEntry;
