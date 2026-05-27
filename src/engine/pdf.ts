const IN_APP_BROWSER_REGEX = /MicroMessenger|FB_IAB|FBAN|FBAV|Instagram/i;

function isInAppBrowser(): boolean {
  return IN_APP_BROWSER_REGEX.test(navigator.userAgent);
}

async function loadHtml2Pdf(): Promise<((opts: unknown) => unknown) | null> {
  const w = window as unknown as { html2pdf?: unknown };
  if (w.html2pdf) return w.html2pdf as (opts: unknown) => unknown;
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js";
    script.integrity = "sha384-Yv5O+t3uE3hunW8uyrbpPW3iw6/5/Y7HitWJBLgqfMoA36NogMmy+8wWZMpn3HWc";
    script.crossOrigin = "anonymous";
    script.referrerPolicy = "no-referrer";
    script.onload = () => {
      const win = window as unknown as { html2pdf?: unknown };
      resolve((win.html2pdf as (opts: unknown) => unknown) ?? null);
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

/** filename: the .pdf name used by the in-app-browser fallback path. */
export async function downloadPdf(filename: string): Promise<void> {
  if (!isInAppBrowser()) {
    // Tier 1: native print dialog with "Save as PDF"
    window.print();
    return;
  }
  // Tier 2: in-app browser (WeChat/FB/IG) — use html2pdf.js
  const lib = await loadHtml2Pdf();
  const target = document.querySelector(".results") as HTMLElement | null;
  if (!lib || !target) {
    window.print();
    return;
  }
  const options = {
    margin: 10,
    filename,
    image: { type: "jpeg", quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
    jsPDF: { unit: "mm", format: "letter", orientation: "portrait" },
    pagebreak: { mode: ["css", "avoid-all"] },
  };
  type Chain = { from: (el: HTMLElement) => Chain; set: (o: unknown) => Chain; save: () => Promise<void> };
  const chain = (lib as unknown as () => Chain)();
  try {
    await chain.from(target).set(options).save();
  } catch {
    window.print();
  }
}
