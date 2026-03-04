/// <reference types="react" />
export interface CommentMenuItemProps {
    onClick: React.MouseEventHandler<HTMLDivElement>;
    hasComment: boolean;
}
export declare const CommentMenuItem: (props: CommentMenuItemProps) => import("react/jsx-runtime").JSX.Element;
