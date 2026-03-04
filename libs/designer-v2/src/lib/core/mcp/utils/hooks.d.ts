export declare const useEditSnapshot: (operationId: string | null) => {
    hasSnapshot: boolean;
    restoreSnapshot: () => void;
    clearSnapshot: () => void;
};
