const ZALO_DOMAIN = "chat.zalo.me";
const COOKIE_NAMES = new Set([
  "zpw_sek", "zpw_enk", "zpw_uid", "zpw_uat", "zpw_act", "zpw_ref",
  "zpw_did", "zpw_didv2", "zpw_xtk", "zpw_xuk", "zpw_xtk_v2", "zpw_xuk_v2",
  "zpw_sec", "zpw_enq", "zpw_iv", "zpw_dev", "zpw_pl", "zpw_vn", "zpw_cc",
  "zpw_lg", "zpw_tz", "zpw_os", "zpw_br", "zpw_bv", "zpw_dv", "zpw_nt",
  "zpw_cn", "zpw_fl", "zpw_pv", "zpw_sv", "zpw_mv", "zpw_ov", "zpw_av",
  "zpw_dn", "zpw_ip", "zpw_ct", "zpw_rt", "zpw_st", "zpw_lt", "zpw_ut",
]);

function getZaloCookies() {
  return new Promise((resolve) => {
    chrome.cookies.getAll({ domain: ZALO_DOMAIN }, (cookies) => {
      const filtered = (cookies || []).filter((c) => COOKIE_NAMES.has(c.name));
      resolve(filtered);
    });
  });
}

function formatCookiesForExport(cookies) {
  return cookies.map((cookie) => ({
    domain: cookie.domain,
    expirationDate: cookie.expirationDate,
    hostOnly: cookie.hostOnly,
    httpOnly: cookie.httpOnly,
    name: cookie.name,
    path: cookie.path,
    sameSite: cookie.sameSite,
    secure: cookie.secure,
    session: cookie.session,
    storeId: cookie.storeId,
    value: cookie.value,
  }));
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message && message.type === "GET_COOKIES") {
    getZaloCookies().then((cookies) => {
      sendResponse({ success: true, cookies: formatCookiesForExport(cookies) });
    }).catch((error) => {
      sendResponse({ success: false, error: error && error.message ? error.message : String(error) });
    });
    return true;
  }
});
