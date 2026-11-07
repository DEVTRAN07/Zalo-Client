(function () {
  function pickZpwCookies() {
    return document.cookie.split("; ").reduce((acc, cookie) => {
      if (!cookie) return acc;
      const idx = cookie.indexOf("=");
      const name = idx === -1 ? cookie : cookie.slice(0, idx);
      const value = idx === -1 ? "" : cookie.slice(idx + 1);
      if (name.startsWith("zpw_")) acc[name] = value;
      return acc;
    }, {});
  }

  function pickZpwStorage(storage) {
    const data = {};
    try {
      if (!storage) return data;
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith("zpw_")) data[key] = storage.getItem(key) || "";
      }
    } catch (_) {}
    return data;
  }

  function extractIMEIFromStorage() {
    try {
      if (typeof localStorage !== "undefined" && localStorage !== null) {
        const zUuid = localStorage.getItem("z_uuid");
        if (zUuid) return { imei: String(zUuid), imeiSource: "z_uuid" };
        const shZUuid = localStorage.getItem("sh_z_uuid");
        if (shZUuid) return { imei: String(shZUuid), imeiSource: "sh_z_uuid" };
      }
    } catch (_) {}
    return { imei: "", imeiSource: "" };
  }

  const cookies = pickZpwCookies();
  const localStorageData = pickZpwStorage(localStorage);
  const sessionStorageData = pickZpwStorage(sessionStorage);
  const zpw_sek = cookies.zpw_sek || localStorageData.zpw_sek || sessionStorageData.zpw_sek;
  const zpw_enk = cookies.zpw_enk || localStorageData.zpw_enk || sessionStorageData.zpw_enk;
  const zpw_uid = cookies.zpw_uid || localStorageData.zpw_uid || sessionStorageData.zpw_uid;
  const imeiData = extractIMEIFromStorage();

  window.postMessage({
    type: "ZALO_CREDENTIALS_READY",
    payload: {
      cookies,
      localStorage: localStorageData,
      sessionStorage: sessionStorageData,
      userAgent: navigator.userAgent,
      language: navigator.language || "vi",
      url: window.location.href,
      timestamp: Date.now(),
      hasAuth: !!(zpw_sek && zpw_enk && zpw_uid),
      keyCookies: { zpw_sek, zpw_enk, zpw_uid },
      imei: imeiData.imei,
      imeiSource: imeiData.imeiSource,
    },
  }, "*");
})();
