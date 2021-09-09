import * as Immutable from 'immutable';

/**
 * Returns an "onDragStart" event handler to use on Firefox when draggable is set to false.
 * @return {React.DragEventHandler<HTMLElement> | undefined}
 */
export function getDragStartHandlerWhenDisabled(): React.DragEventHandler<HTMLElement> | undefined {
  return isFirefox() ? handleDragStartWhenDisabled : undefined;
}

function handleDragStartWhenDisabled(e: React.DragEvent<HTMLElement>): void {
  e.preventDefault();
}

/**
 * Use this Immutable.js reviver to ignore DOM elements, event handlers, and ref functions when serializing into Immutable maps for shouldComponentUpdate comparisons.
 * @arg {any} _ - Unused
 * @arg {Immutable.Iterable<any, any>} value - See https://facebook.github.io/immutable-js/docs/#/fromJS for details.
 * @return {any}
 */
// tslint:disable-next-line: no-any
export function ignoreElementsAndFunctions(_: any, value: Iterable<any>): any {
  return Immutable.isKeyed(value) ? value.filter((v) => !(v instanceof Function) && !(v instanceof Element)) : value;
}

/**
 * @deprecated Use ignoreElementsAndFunctions instead.
 * @arg {any} _ - Unused
 * @arg {Immutable.Iterable<any, any>} value - See https://facebook.github.io/immutable-js/docs/#/fromJS for details.
 * @return {any}
 */
// tslint:disable-next-line: no-any
export function ignoreEventHandlers(_: any, value: Iterable<any>): any {
  return ignoreElementsAndFunctions(_, value);
}

export function isEdge(): boolean {
  return /Edge\/\d+/.test(navigator.userAgent);
}

export function isFirefox(): boolean {
  return /Firefox\/\d+/.test(navigator.userAgent);
}

export function isInternetExplorer(): boolean {
  return /(?:MSIE |Trident\/)/.test(navigator.userAgent);
}

/**
 * Use to implement shouldComponentUpdate for stateful components.
 * @arg {TProps} nextProps - A React Props object with new values.
 * @arg {TState} nextState - A React State object with new values.
 * @arg {TProps} prevProps - A React Props object with old values.
 * @arg {TState} prevState - A React State object with old values.
 * @arg {boolean} [debug=false] - True when we want to output diffs to the console.
 * @return {boolean}
 */
export function shouldStatefulComponentUpdate<TProps, TState>(
  nextProps: TProps,
  nextState: TState,
  prevProps: TProps,
  prevState: TState,
  debug = false
): boolean {
  const newProps = Immutable.fromJS(nextProps, ignoreEventHandlers);
  const oldProps = Immutable.fromJS(prevProps, ignoreEventHandlers);
  const propsDifferent = !Immutable.is(newProps, oldProps);

  const newState = Immutable.fromJS(nextState);
  const oldState = Immutable.fromJS(prevState);
  const stateDifferent = !Immutable.is(newState, oldState);

  if (debug) {
    if (propsDifferent) {
      for (const key of Object.keys(nextProps)) {
        const newStateValue = (nextProps as any)[key]; // tslint:disable-line: no-any
        const oldStateValue = (prevProps as any)[key]; // tslint:disable-line: no-any
        if (!Immutable.is(Immutable.fromJS(newStateValue, ignoreEventHandlers), Immutable.fromJS(oldStateValue, ignoreEventHandlers))) {
          console.log(`key = ${key}, old = ${JSON.stringify(oldStateValue, null, 2)}, new = ${JSON.stringify(newStateValue, null, 2)}`);
        }
      }
    }

    if (stateDifferent) {
      for (const key of Object.keys(nextState)) {
        const newStateValue = (nextState as any)[key]; // tslint:disable-line: no-any
        const oldStateValue = (prevState as any)[key]; // tslint:disable-line: no-any
        if (!Immutable.is(Immutable.fromJS(newStateValue, ignoreEventHandlers), Immutable.fromJS(oldStateValue, ignoreEventHandlers))) {
          console.log(`key = ${key}, old = ${JSON.stringify(oldStateValue, null, 2)}, new = ${JSON.stringify(newStateValue, null, 2)}`);
        }
      }
    }
  }

  return propsDifferent || stateDifferent;
}

/**
 * Use to implement shouldComponentUpdate for stateless components.
 * @arg {TProps} nextProps - A React Props object with new values.
 * @arg {TProps} prevProps - A React Props object with old values.
 * @arg {boolean} [debug=false] - True when we want to output diffs to the console.
 * @return {boolean}
 */
export function shouldStatelessComponentUpdate<TProps>(nextProps: TProps, prevProps: TProps, debug = false): boolean {
  const newProps = Immutable.fromJS(nextProps, ignoreEventHandlers);
  const oldProps = Immutable.fromJS(prevProps, ignoreEventHandlers);
  const propsDifferent = !Immutable.is(newProps, oldProps);

  if (debug) {
    if (propsDifferent) {
      for (const key of Object.keys(nextProps)) {
        const newStateValue = (nextProps as any)[key]; // tslint:disable-line: no-any
        const oldStateValue = (prevProps as any)[key]; // tslint:disable-line: no-any
        if (!Immutable.is(Immutable.fromJS(newStateValue, ignoreEventHandlers), Immutable.fromJS(oldStateValue, ignoreEventHandlers))) {
          console.log(`key = ${key}, old = ${JSON.stringify(oldStateValue, null, 2)}, new = ${JSON.stringify(newStateValue, null, 2)}`);
        }
      }
    }
  }

  return propsDifferent;
}
