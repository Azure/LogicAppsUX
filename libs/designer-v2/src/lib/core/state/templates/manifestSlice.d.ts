import { type Template } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { FilterObject } from '@microsoft/designer-ui';
export declare const templatesCountPerPage = 25;
export interface TemplateData extends Template.TemplateManifest {
    publishState?: string;
}
export interface ManifestState {
    availableTemplateNames?: ManifestName[];
    githubTemplateNames?: ManifestName[];
    customTemplateNames?: ManifestName[];
    availableTemplates?: Record<ManifestName, TemplateData>;
    filters: {
        pageNum: number;
        keyword?: string;
        sortKey: string;
        connectors: FilterObject[] | undefined;
        subscriptions: FilterObject[] | undefined;
        status: FilterObject[] | undefined;
        detailFilters: Record<string, FilterObject[]>;
    };
}
type ManifestName = string;
export declare const initialManifestState: ManifestState;
export declare const loadGithubManifestNames: import("@reduxjs/toolkit").AsyncThunk<string[], void, {
    state?: unknown;
    dispatch?: import("@reduxjs/toolkit").Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const loadGithubManifests: import("@reduxjs/toolkit").AsyncThunk<Record<string, Template.TemplateManifest> | undefined, number, {
    state?: unknown;
    dispatch?: import("@reduxjs/toolkit").Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const lazyLoadGithubManifests: import("@reduxjs/toolkit").AsyncThunk<Record<string, Template.TemplateManifest> | undefined, number, {
    state?: unknown;
    dispatch?: import("@reduxjs/toolkit").Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const manifestSlice: import("@reduxjs/toolkit").Slice<ManifestState, {
    setavailableTemplatesNames: (state: import("immer/dist/internal").WritableDraft<ManifestState>, action: PayloadAction<ManifestName[] | undefined>) => void;
    setavailableTemplates: (state: import("immer/dist/internal").WritableDraft<ManifestState>, action: PayloadAction<Record<ManifestName, Template.TemplateManifest> | undefined>) => void;
    setPageNum: (state: import("immer/dist/internal").WritableDraft<ManifestState>, action: PayloadAction<number>) => void;
    setKeywordFilter: (state: import("immer/dist/internal").WritableDraft<ManifestState>, action: PayloadAction<string | undefined>) => void;
    setSortKey: (state: import("immer/dist/internal").WritableDraft<ManifestState>, action: PayloadAction<string>) => void;
    setConnectorsFilters: (state: import("immer/dist/internal").WritableDraft<ManifestState>, action: PayloadAction<FilterObject[] | undefined>) => void;
    setSubscriptionsFilters: (state: import("immer/dist/internal").WritableDraft<ManifestState>, action: PayloadAction<FilterObject[] | undefined>) => void;
    setStatusFilters: (state: import("immer/dist/internal").WritableDraft<ManifestState>, action: PayloadAction<FilterObject[] | undefined>) => void;
    setDetailsFilters: (state: import("immer/dist/internal").WritableDraft<ManifestState>, action: PayloadAction<{
        filterName: string;
        filters: FilterObject[] | undefined;
    }>) => void;
}, "manifest">;
export declare const setavailableTemplatesNames: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<string[] | undefined, "manifest/setavailableTemplatesNames">, setavailableTemplates: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<Record<string, Template.TemplateManifest> | undefined, "manifest/setavailableTemplates">, setPageNum: import("@reduxjs/toolkit").ActionCreatorWithPayload<number, "manifest/setPageNum">, setKeywordFilter: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<string | undefined, "manifest/setKeywordFilter">, setSortKey: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "manifest/setSortKey">, setConnectorsFilters: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<FilterObject[] | undefined, "manifest/setConnectorsFilters">, setDetailsFilters: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    filterName: string;
    filters: FilterObject[] | undefined;
}, "manifest/setDetailsFilters">, setSubscriptionsFilters: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<FilterObject[] | undefined, "manifest/setSubscriptionsFilters">, setStatusFilters: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<FilterObject[] | undefined, "manifest/setStatusFilters">;
declare const _default: import("@reduxjs/toolkit").Reducer<ManifestState, import("@reduxjs/toolkit").AnyAction>;
export default _default;
