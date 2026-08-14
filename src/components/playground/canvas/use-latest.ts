"use client";

import * as React from "react";

/**
 * A ref that always holds the most recently COMMITTED value.
 *
 * The canvas registers long-lived listeners (wheel, keydown, pointer capture)
 * in effects, and those closures must see current nodes and selection without
 * being torn down and rebuilt on every state change — re-registering a
 * non-passive wheel listener sixty times a second is its own performance
 * problem.
 *
 * The assignment lives in an effect rather than in the render body. Writing
 * `ref.current = value` during render is unsafe under concurrent rendering:
 * React may render a component and then discard that render, which would leave
 * the ref describing a state that was never committed. `react-hooks/refs` flags
 * exactly this.
 */
export function useLatest<T>(value: T): React.RefObject<T> {
  const ref = React.useRef(value);
  React.useEffect(() => {
    ref.current = value;
  });
  return ref;
}
