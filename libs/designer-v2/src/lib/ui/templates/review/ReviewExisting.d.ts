type ReviewExistingProps = {
    name: string;
    description?: string;
    resourceOverrides?: {
        workflowName?: string;
        workflowDescription?: string;
    };
};
export declare const ReviewExisting: ({ name, description, resourceOverrides }: ReviewExistingProps) => import("react/jsx-runtime").JSX.Element;
export {};
