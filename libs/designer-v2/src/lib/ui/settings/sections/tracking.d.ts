/// <reference types="react" />
import type { SectionProps, TextChangeHandler } from '..';
type DictionaryRecordChangeHandler = (newVal: Record<string, string>) => void;
export interface TrackingSectionProps extends SectionProps {
    onClientTrackingIdChange: TextChangeHandler;
    onTrackedPropertiesDictionaryValueChanged: DictionaryRecordChangeHandler;
    onTrackedPropertiesStringValueChange: TextChangeHandler;
}
export declare const Tracking: ({ nodeId, readOnly, expanded, correlation, trackedProperties, validationErrors, onHeaderClick, onClientTrackingIdChange, onTrackedPropertiesDictionaryValueChanged, onTrackedPropertiesStringValueChange, }: TrackingSectionProps) => JSX.Element | null;
export {};
