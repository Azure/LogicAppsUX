export interface CollapseToggleProps {
    id: string;
    tabIndex?: number;
    disabled?: boolean;
    collapsed?: boolean;
    handleCollapse: () => void;
    isSmall?: boolean;
}
export declare const CollapseToggle: (props: CollapseToggleProps) => import("react/jsx-runtime").JSX.Element;
