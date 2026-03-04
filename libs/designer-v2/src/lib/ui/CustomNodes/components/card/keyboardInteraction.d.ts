/// <reference types="react" />
export declare const useContextMenu: () => {
    handle: import("react").MouseEventHandler<Element>;
    isShowing: boolean;
    setIsShowing: import("react").Dispatch<import("react").SetStateAction<boolean>>;
    location: {
        x: number;
        y: number;
    };
    setLocation: import("react").Dispatch<import("react").SetStateAction<{
        x: number;
        y: number;
    }>>;
};
export declare const useKeyboardInteraction: (onPrimaryClick?: () => void, onDeleteClick?: () => void, onCopyClick?: () => void) => {
    keyDown: import("react").KeyboardEventHandler<HTMLElement>;
    keyUp: import("react").KeyboardEventHandler<HTMLElement>;
};
