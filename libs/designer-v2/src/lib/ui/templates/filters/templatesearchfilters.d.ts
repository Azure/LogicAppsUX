import { type FilterObject } from '@microsoft/designer-ui';
import type { Template } from '@microsoft/logic-apps-shared';
type TemplateDetailFilterValue = {
    displayName: string;
    items: FilterObject[];
};
export type TemplateDetailFilterType = Partial<Record<Template.DetailsType, TemplateDetailFilterValue>>;
interface GalleryTab {
    displayName: string;
    name: string;
    filterKey?: string;
}
export interface TemplateSearchAndFilterProps {
    tabFilterKey?: string;
    tabDetails?: GalleryTab[];
    detailFilters: TemplateDetailFilterType;
    showFilters?: boolean;
    searchPlaceholder?: string;
    cssOverrides?: Record<string, string>;
}
export declare const useSortOptions: () => {
    key: string;
    text: string;
}[];
export declare const TemplateSearchAndFilters: ({ tabFilterKey, tabDetails, searchPlaceholder, showFilters, detailFilters, cssOverrides, }: TemplateSearchAndFilterProps) => import("react/jsx-runtime").JSX.Element;
export {};
