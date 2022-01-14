export interface Event<T> {
    currentTarget: T;
}

export type EventHandler<T> = (event: T) => void;
