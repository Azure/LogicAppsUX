/// <reference types="react" />
export interface CopyTooltipProps {
    targetRef?: React.RefObject<HTMLElement>;
    location?: {
        x: number;
        y: number;
    };
    hideTooltip: () => void;
    id: string;
}
export declare const CopyTooltip: ({ targetRef: ref, location, hideTooltip, id }: CopyTooltipProps) => import("react/jsx-runtime").JSX.Element;
