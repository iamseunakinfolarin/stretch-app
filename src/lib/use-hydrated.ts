import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False on the server and until the page's JavaScript has taken over, then true.
 * Forms use it to stay disabled until they can handle a submit themselves. Without it, a tap
 * before the page is ready makes the browser submit the form natively, which would put the
 * typed values, including a password, into the web address.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
