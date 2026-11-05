// Shows a short message at the bottom of the screen (see Toaster). Used for failed saves.
export function notify(text: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("qualty:toast", { detail: text }));
}

/** Runs a save and reports a failure instead of throwing. Returns undefined on failure. */
export async function run<T>(p: Promise<T>): Promise<T | undefined> {
  try {
    return await p;
  } catch (e) {
    notify(e instanceof Error ? e.message : "Something went wrong. Try again.");
    return undefined;
  }
}
