const codePattern = /^[a-z0-9-]{1,64}$/i;

type DownloadHit = {
  path: string;
  title: string;
  event: true;
};

const downloadHit: DownloadHit = {
  path: "download-pdf",
  title: "Download PDF",
  event: true,
};

declare global {
  interface Window {
    goatcounter?: {
      count: (hit: DownloadHit) => void;
    };
  }
}

/** Hosted GoatCounter endpoint for a site code, or null when the code is unusable. */
export function goatcounterEndpoint(code: string | undefined): string | null {
  if (!code || !codePattern.test(code)) return null;
  return `https://${code}.goatcounter.com/count`;
}

/** Count a visit when a site code is configured. Localhost is left out. */
export function installAnalytics(): void {
  const endpoint = goatcounterEndpoint(import.meta.env.VITE_GOATCOUNTER_CODE);
  if (!endpoint) return;
  const host = location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://gc.zgo.at/count.js";
  script.dataset.goatcounter = endpoint;
  document.head.appendChild(script);
}

/** Count one successful PDF download. Does nothing until the counter is ready. */
export function trackDownloadPdf(): void {
  const send = () => window.goatcounter?.count(downloadHit);
  if (window.goatcounter?.count) {
    send();
    return;
  }
  document
    .querySelector("script[data-goatcounter]")
    ?.addEventListener("load", send, { once: true });
}
