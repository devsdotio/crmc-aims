export const WEIGHTED_TEXT_STORAGE_KEY = "aims-weighted-text";
export const WEIGHTED_TEXT_EVENT = "aims-weighted-text-change";

/** Runs before paint so the heavier weights do not flash in after load. */
export const weightedTextBootScript = `try{if(localStorage.getItem(${JSON.stringify(WEIGHTED_TEXT_STORAGE_KEY)})==="on"){document.documentElement.setAttribute("data-weighted-text","on")}}catch(e){}`;

export function readWeightedTextEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(WEIGHTED_TEXT_STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

export function subscribeWeightedText(onStoreChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === WEIGHTED_TEXT_STORAGE_KEY || event.key === null) {
      onStoreChange();
    }
  };
  window.addEventListener(WEIGHTED_TEXT_EVENT, onStoreChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(WEIGHTED_TEXT_EVENT, onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function writeWeightedText(enabled: boolean): void {
  try {
    if (enabled) {
      window.localStorage.setItem(WEIGHTED_TEXT_STORAGE_KEY, "on");
    } else {
      window.localStorage.removeItem(WEIGHTED_TEXT_STORAGE_KEY);
    }
  } catch {
    // Storage can throw in private mode. The attribute still updates for this visit.
  }
  window.dispatchEvent(new Event(WEIGHTED_TEXT_EVENT));
}

export function applyWeightedText(enabled: boolean): void {
  const root = document.documentElement;
  if (enabled) root.setAttribute("data-weighted-text", "on");
  else root.removeAttribute("data-weighted-text");
}
