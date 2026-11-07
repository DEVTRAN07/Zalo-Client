const extractBtn = document.getElementById("extractBtn");
const copyBtn = document.getElementById("copyBtn");
const statusEl = document.getElementById("status");
const statusText = document.getElementById("statusText");
const loadingEl = document.getElementById("loading");
const credentialsEl = document.getElementById("credentials");

const imeiValue = document.getElementById("imeiValue");
const imeiBadge = document.getElementById("imeiBadge");
const uaValue = document.getElementById("uaValue");
const langValue = document.getElementById("langValue");
const cookieValue = document.getElementById("cookieValue");
const cookieCount = document.getElementById("cookieCount");

let extractedData = null;

function showStatus(type, message) {
  statusEl.className = `status ${type}`;
  statusEl.classList.remove("hidden");
  statusText.textContent = message;
}

function hideStatus() {
  statusEl.classList.add("hidden");
}

function showLoading(show) {
  loadingEl.classList.toggle("hidden", !show);
  extractBtn.disabled = show;
}

function uuidv4() {
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  const b = new Uint8Array(16);
  (crypto.getRandomValues || ((a) => { for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256); }))(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}

// Minimal MD5 (hex) for browser; matches zalo-client's `${uuid}-${md5(userAgent)}`.
function md5(input) {
  function cmn(q, a, b, x, s, t) {
    a = (a + q + x + t) | 0;
    return (((a << s) | (a >>> (32 - s))) + b) | 0;
  }
  function ff(a, b, c, d, x, s, t) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
  function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
  function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | ~d), a, b, x, s, t); }
  function md5cycle(x, k) {
    let [a, b, c, d] = x;
    a = ff(a,b,c,d,k[0],7,-680876936); d=ff(d,a,b,c,k[1],12,-389564586); c=ff(c,d,a,b,k[2],17,606105819); b=ff(b,c,d,a,k[3],22,-1044525330);
    a=ff(a,b,c,d,k[4],7,-176418897); d=ff(d,a,b,c,k[5],12,1200080426); c=ff(c,d,a,b,k[6],17,-1473231341); b=ff(b,c,d,a,k[7],22,-45705983);
    a=ff(a,b,c,d,k[8],7,1770035416); d=ff(d,a,b,c,k[9],12,-1958414417); c=ff(c,d,a,b,k[10],17,-42063); b=ff(b,c,d,a,k[11],22,-1990404162);
    a=ff(a,b,c,d,k[12],7,1804603682); d=ff(d,a,b,c,k[13],12,-40341101); c=ff(c,d,a,b,k[14],17,-1502002290); b=ff(b,c,d,a,k[15],22,1236535329);
    a=gg(a,b,c,d,k[1],5,-165796510); d=gg(d,a,b,c,k[6],9,-1069501632); c=gg(c,d,a,b,k[11],14,643717713); b=gg(b,c,d,a,k[0],20,-373897302);
    a=gg(a,b,c,d,k[5],5,-701558691); d=gg(d,a,b,c,k[10],9,38016083); c=gg(c,d,a,b,k[15],14,-660478335); b=gg(b,c,d,a,k[4],20,-405537848);
    a=gg(a,b,c,d,k[9],5,568446438); d=gg(d,a,b,c,k[14],9,-1019803690); c=gg(c,d,a,b,k[3],14,-187363961); b=gg(b,c,d,a,k[8],20,1163531501);
    a=gg(a,b,c,d,k[13],5,-1444681467); d=gg(d,a,b,c,k[2],9,-51403784); c=gg(c,d,a,b,k[7],14,1735328473); b=gg(b,c,d,a,k[12],20,-1926607734);
    a=hh(a,b,c,d,k[5],4,-378558); d=hh(d,a,b,c,k[8],11,-2022574463); c=hh(c,d,a,b,k[11],16,1839030562); b=hh(b,c,d,a,k[14],23,-35309556);
    a=hh(a,b,c,d,k[1],4,-1530992060); d=hh(d,a,b,c,k[4],11,1272893353); c=hh(c,d,a,b,k[7],16,-155497632); b=hh(b,c,d,a,k[10],23,-1094730640);
    a=hh(a,b,c,d,k[13],4,681279174); d=hh(d,a,b,c,k[0],11,-358537222); c=hh(c,d,a,b,k[3],16,-722521979); b=hh(b,c,d,a,k[6],23,76029189);
    a=hh(a,b,c,d,k[9],4,-640364487); d=hh(d,a,b,c,k[12],11,-421815835); c=hh(c,d,a,b,k[15],16,530742520); b=hh(b,c,d,a,k[2],23,-995338651);
    a=ii(a,b,c,d,k[0],6,-198630844); d=ii(d,a,b,c,k[7],10,1126891415); c=ii(c,d,a,b,k[14],15,-1416354905); b=ii(b,c,d,a,k[5],21,-57434055);
    a=ii(a,b,c,d,k[12],6,1700485571); d=ii(d,a,b,c,k[3],10,-1894986606); c=ii(c,d,a,b,k[10],15,-1051523); b=ii(b,c,d,a,k[1],21,-2054922799);
    a=ii(a,b,c,d,k[8],6,1873313359); d=ii(d,a,b,c,k[15],10,-30611744); c=ii(c,d,a,b,k[6],15,-1560198380); b=ii(b,c,d,a,k[13],21,1309151649);
    a=ii(a,b,c,d,k[4],6,-145523070); d=ii(d,a,b,c,k[11],10,-1120210379); c=ii(c,d,a,b,k[2],15,718787259); b=ii(b,c,d,a,k[9],21,-343485551);
    x[0]=(x[0]+a)|0; x[1]=(x[1]+b)|0; x[2]=(x[2]+c)|0; x[3]=(x[3]+d)|0;
  }
  function md5blk(s) {
    const n = s.length;
    const words = [];
    for (let i = 0; i < 64; i += 4) {
      words[i >> 2] = s.charCodeAt(i) | (s.charCodeAt(i+1) << 8) | (s.charCodeAt(i+2) << 16) | (s.charCodeAt(i+3) << 24);
    }
    return words;
  }
  function md51(s) {
    const n = s.length;
    let state = [1732584193, -271733879, -1732584194, 271733878];
    let i;
    for (i = 64; i <= n; i += 64) md5cycle(state, md5blk(s.substring(i - 64, i)));
    const tail = new Array(16).fill(0);
    const rem = s.substring(i - 64);
    for (let j = 0; j < rem.length; j++) tail[j >> 2] |= rem.charCodeAt(j) << ((j % 4) * 8);
    tail[rem.length >> 2] |= 0x80 << ((rem.length % 4) * 8);
    if (rem.length > 55) { md5cycle(state, tail); tail.fill(0); }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return state;
  }
  function rhex(n) {
    const hex = "0123456789abcdef";
    let s = "";
    for (let j = 0; j < 4; j++) s += hex[(n >> (j * 8 + 4)) & 0x0f] + hex[(n >> (j * 8)) & 0x0f];
    return s;
  }
  const utf8 = unescape(encodeURIComponent(input));
  return md51(utf8).map(rhex).join("");
}

function generateIMEI(userAgent) {
  return `${uuidv4()}-${md5(userAgent)}`;
}

function showCredentials(data) {
  extractedData = data;
  credentialsEl.classList.remove("hidden");
  copyBtn.classList.remove("hidden");

  imeiValue.textContent = data.imei || "";
  const hasImei = !!data.imei;
  imeiBadge.textContent = hasImei ? "Đã tạo" : "Chưa có";
  imeiBadge.className = hasImei ? "cred-badge badge-success" : "cred-badge badge-danger";

  uaValue.textContent = data.userAgent || "";
  langValue.textContent = data.language || "vi";

  cookieValue.textContent = JSON.stringify(data.cookie || [], null, 2);
  const count = Array.isArray(data.cookie) ? data.cookie.length : 0;
  cookieCount.textContent = String(count);
  cookieCount.className = count > 0 ? "cred-badge badge-success" : "cred-badge badge-danger";
}

async function queryActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function getPageData(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, { type: "GET_PAGE_DATA" });
  } catch (_) {
    return null;
  }
}

async function extractCredentials() {
  hideStatus();
  showLoading(true);

  try {
    const tab = await queryActiveTab();
    if (!tab || !tab.url || !tab.url.includes("zalo.me")) {
      showStatus("error", "Vui lòng mở chat.zalo.me trước");
      return;
    }

    const cookiesRes = await chrome.runtime.sendMessage({ type: "GET_COOKIES" });
    if (!cookiesRes || !cookiesRes.success) {
      throw new Error((cookiesRes && cookiesRes.error) || "Không lấy được cookies");
    }
    const cookies = cookiesRes.cookies || [];
    if (cookies.length === 0) {
      showStatus("error", "Không tìm thấy cookie Zalo. Hãy đăng nhập Zalo Web trước.");
      return;
    }

    const pageRes = await getPageData(tab.id);
    const userAgent = (pageRes && pageRes.success && pageRes.data && pageRes.data.userAgent) || navigator.userAgent;
    const language = (pageRes && pageRes.success && pageRes.data && pageRes.data.language) || navigator.language || "vi";
    const imei = generateIMEI(userAgent);

    const data = { imei, cookie: cookies, userAgent, language };
    showStatus("success", "Trích xuất thành công!");
    showCredentials(data);
  } catch (error) {
    showStatus("error", `Lỗi: ${error && error.message ? error.message : String(error)}`);
  } finally {
    showLoading(false);
  }
}

async function copyToClipboard() {
  if (!extractedData) return;
  const output = {
    imei: extractedData.imei,
    cookie: extractedData.cookie,
    userAgent: extractedData.userAgent,
    language: extractedData.language,
  };
  try {
    await navigator.clipboard.writeText(JSON.stringify(output, null, 2));
    showStatus("success", "Đã sao chép JSON vào clipboard!");
    copyBtn.textContent = "Đã sao chép!";
    setTimeout(() => {
      copyBtn.innerHTML = `
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        Sao chép JSON
      `;
    }, 2000);
  } catch (_) {
    showStatus("error", "Không thể sao chép");
  }
}

extractBtn.addEventListener("click", extractCredentials);
copyBtn.addEventListener("click", copyToClipboard);

document.addEventListener("DOMContentLoaded", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url && tabs[0].url.includes("zalo.me")) {
      extractCredentials();
    } else {
      showStatus("warning", "Mở chat.zalo.me rồi bấm Trích xuất");
    }
  });
});
