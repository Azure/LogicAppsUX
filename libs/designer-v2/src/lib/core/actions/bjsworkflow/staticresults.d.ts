export declare const StaticResultOption: {
    readonly ENABLED: "Enabled";
    readonly DISABLED: "Disabled";
};
export type StaticResultOption = (typeof StaticResultOption)[keyof typeof StaticResultOption];
export interface NodeStaticResults {
    name: string;
    staticResultOptions: StaticResultOption;
}
