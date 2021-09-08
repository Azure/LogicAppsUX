export enum UserAction {
    click = 'click',
    focus = 'focus',
    drag = 'drag',
    drop = 'drop'
}

export interface PageActionTelemetryData {
    controlId: string;
    action: UserAction;
    actionContext?: Record<string, any>;    // tslint:disable-line: no-any
}
