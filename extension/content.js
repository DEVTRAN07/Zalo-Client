function extractFromPage() {
  const cookies = document.cookie.split("; ").reduce((acc, cookie) => {
    if (!cookie) return acc;
    const idx = cookie.indexOf("=");
    const name = idx === -1 ? cookie : cookie.slice(0, idx);
    const value = idx === -1 ? "" : cookie.slice(idx + 1);
    if (name.startsWith("zpw_")) acc[name] = value;
    return acc;
  }, {});

  return {
    cookies,
    userAgent: navigator.userAgent,
    language: navigator.language || "vi",
    url: window.location.href,
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
