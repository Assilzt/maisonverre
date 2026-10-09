type PixelFunction = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[][];
  push?: (...args: unknown[]) => void;
  loaded?: boolean;
  version?: string;
};

type PendingPixelEvent = {
  name: string;
  parameters: Record<string, unknown>;
  dedupeKey?: string;
};

declare global {
  interface Window {
    fbq?: PixelFunction;
    _fbq?: PixelFunction;
  }
}

const pendingEvents: PendingPixelEvent[] = [];
const pendingDedupeKeys = new Set<string>();
let initialized = false;
let disabled = false;
let configuredPixelId = "";
let initialization: Promise<void> | null = null;
const pageViewSentForPixelIds = new Set<string>();

const sendPageViewOnce = (pixelId: string) => {
  const storageKey = `atlasio:meta-pixel:${pixelId}:page-view`;
  try {
    if (window.sessionStorage.getItem(storageKey)) {
      pageViewSentForPixelIds.add(pixelId);
      return;
    }
    window.sessionStorage.setItem(storageKey, "1");
  } catch {
    // Fall back to an in-memory guard if browser storage is unavailable.
  }

  if (pageViewSentForPixelIds.has(pixelId)) return;
  pageViewSentForPixelIds.add(pixelId);
  window.fbq?.("track", "PageView");
};

const ensurePixelScript = () => {
  const scriptSrc = "https://connect.facebook.net/en_US/fbevents.js";
  if (document.querySelector(`script[src="${scriptSrc}"]`)) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = scriptSrc;
  const firstScript = document.getElementsByTagName("script")[0];
  if (firstScript?.parentNode) firstScript.parentNode.insertBefore(script, firstScript);
  else document.head.appendChild(script);
};

const installPixelStub = () => {
  if (!window.fbq) {
    const fbq = ((...args: unknown[]) => {
      if (fbq.callMethod) fbq.callMethod(...args);
      else (fbq.queue ||= []).push(args);
    }) as PixelFunction;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    window.fbq = fbq;
    window._fbq = window._fbq || fbq;
  }

  // A pre-existing stub may have queued events without loading Meta's library.
  // Always ensure the real script is present, but never add it twice.
  ensurePixelScript();
};

const sendEvent = (event: PendingPixelEvent) => {
  if (!window.fbq) return;
  if (event.dedupeKey) {
    const storageKey = `atlasio:meta-pixel:${configuredPixelId}:${event.dedupeKey}`;
    try {
      if (window.sessionStorage.getItem(storageKey)) return;
      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      // Pixel storage is optional and must never block the event or the order flow.
    }
  }
  window.fbq("track", event.name, event.parameters);
};

export const initializeMetaPixel = (): Promise<void> => {
  if (initialization) return initialization;
  if (initialized || disabled) return Promise.resolve();

  initialization = (async () => {
    try {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 1500));
      const response = await fetch("/api/orders?resource=pixel-config", { cache: "no-store" });
      if (!response.ok) throw new Error("Pixel configuration request failed");
      const data = (await response.json()) as { pixelId?: unknown };
      const pixelId = String(data.pixelId || "").trim();
      if (!pixelId || !/^\d{8,20}$/.test(pixelId)) {
        disabled = true;
        pendingEvents.length = 0;
        pendingDedupeKeys.clear();
        return;
      }

      configuredPixelId = pixelId;
      installPixelStub();
      window.fbq?.("init", pixelId);
      sendPageViewOnce(pixelId);
      initialized = true;
      for (const event of pendingEvents.splice(0)) sendEvent(event);
      pendingDedupeKeys.clear();
    } catch {
      // Tracking must never block storefront rendering or the order flow.
      initialization = null;
    }
  })();

  return initialization;
};

export const trackMetaPixelEvent = (
  eventName: string,
  parameters: Record<string, unknown> = {},
) => {
  if (initialized) {
    sendEvent({ name: eventName, parameters });
    return;
  }
  if (disabled) return;
  pendingEvents.push({ name: eventName, parameters });
  void initializeMetaPixel();
};

export const trackMetaPixelEventOnce = (
  dedupeKey: string,
  eventName: string,
  parameters: Record<string, unknown> = {},
) => {
  if (initialized) {
    sendEvent({ name: eventName, parameters, dedupeKey });
    return;
  }
  if (disabled || pendingDedupeKeys.has(dedupeKey)) return;
  pendingDedupeKeys.add(dedupeKey);
  pendingEvents.push({ name: eventName, parameters, dedupeKey });
  void initializeMetaPixel();
};
