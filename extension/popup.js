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

function showCredentials(data) {
  extractedData = data;
  if (credentialsEl) credentialsEl.classList.remove("hidden");
  if (copyBtn) copyBtn.classList.remove("hidden");

  if (imeiValue) imeiValue.textContent = (data && data.imei) || "";
  const hasImei = !!(data && data.imei);
  if (imeiBadge) {
    if (hasImei) {
      const source = (data && data.imeiSource) ? `localStorage (${data.imeiSource})` : "localStorage";
      imeiBadge.textContent = source;
      imeiBadge.className = "cred-badge badge-success";
    } else {
      imeiBadge.textContent = "Chưa có";
      imeiBadge.className = "cred-badge badge-danger";
    }
  }

  if (uaValue) uaValue.textContent = (data && data.userAgent) || "";
  if (langValue) langValue.textContent = (data && data.language) || "vi";

  const cookies = (data && data.cookie) || [];
  if (cookieValue) cookieValue.textContent = JSON.stringify(cookies, null, 2);
  const count = Array.isArray(cookies) ? cookies.length : 0;
  if (cookieCount) {
    cookieCount.textContent = count + " CK";
    cookieCount.className = count > 0 ? "cred-badge badge-success" : "cred-badge badge-danger";
  }
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
    const pageData = pageRes && pageRes.success && pageRes.data ? pageRes.data : null;
    const userAgent = (pageData && pageData.userAgent) || navigator.userAgent;
    const language = (pageData && pageData.language) || navigator.language || "vi";
    const imei = pageData && pageData.imei ? String(pageData.imei) : "";
    const imeiSource = pageData && pageData.imeiSource ? String(pageData.imeiSource) : "";

    if (!imei) {
      showStatus("error", "Không tìm thấy IMEI. Hãy đăng nhập Zalo Web và thử lại.");
      return;
    }

    const data = { imei, imeiSource, cookie: cookies, userAgent, language };
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
  try {
    await navigator.clipboard.writeText(JSON.stringify(extractedData.cookie, null, 2));
    showStatus("success", "Đã sao chép cookie JSON vào clipboard!");
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
