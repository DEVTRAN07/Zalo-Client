function extractIMEIFromStorage() {
  try {
    if (typeof localStorage === "undefined" || localStorage === null) {
      return { imei: "", imeiSource: "" };
    }
    const zUuid = localStorage.getItem("z_uuid");
    if (zUuid) return { imei: String(zUuid), imeiSource: "z_uuid" };
    const shZUuid = localStorage.getItem("sh_z_uuid");
    if (shZUuid) return { imei: String(shZUuid), imeiSource: "sh_z_uuid" };
  } catch (_) {}
  return { imei: "", imeiSource: "" };
}

function extractFromPage() {
  const cookies = document.cookie.split("; ").reduce((acc, cookie) => {
    if (!cookie) return acc;
    const idx = cookie.indexOf("=");
    const name = idx === -1 ? cookie : cookie.slice(0, idx);
    const value = idx === -1 ? "" : cookie.slice(idx + 1);
    if (name.startsWith("zpw_")) acc[name] = value;
    return acc;
  }, {});

  const imeiData = extractIMEIFromStorage();

  return {
    cookies,
    userAgent: navigator.userAgent,
    language: navigator.language || "vi",
    url: window.location.href,
    imei: imeiData.imei,
    imeiSource: imeiData.imeiSource,
  };
}

function injectExtractionScript() {
  try {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("injected.js");
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  } catch (_) {}
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message && message.type === "GET_PAGE_DATA") {
    sendResponse({ success: true, data: extractFromPage() });
  }
  if (message && message.type === "INJECT_SCRIPT") {
    injectExtractionScript();
    sendResponse({ success: true });
  }
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", injectExtractionScript);
} else {
  injectExtractionScript();
}

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data && event.data.type === "ZALO_CREDENTIALS_READY") {
    chrome.runtime.sendMessage({ type: "CREDENTIALS_EXTRACTED", data: event.data.payload });
  }
});
