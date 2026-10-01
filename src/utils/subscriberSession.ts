/**
 * Subscriber Session Manager
 * Handles auto-detection of subscriber (Name and Registration ID only)
 * from URL parameters, localStorage, cookies, and quick QR code scanning.
 * NO login, NO password, NO phone/email required on the identity card.
 */

export interface SubscriberData {
  id: string;
  name: string;
  source: "url" | "storage" | "cookie" | "manual" | "qr";
}

const STORAGE_KEY_ID = "thnoon_subscriber_id";
const STORAGE_KEY_NAME = "thnoon_subscriber_name";
const STORAGE_KEY_AUTH = "thnoon_subscriber_auth";

/**
 * Helper to get a cookie value by name
 */
function getCookieValue(name: string): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp("(^|;\\s*)(" + name + ")=([^;]*)"));
  return match ? decodeURIComponent(match[3]) : "";
}

/**
 * Reads subscriber data from URL, localStorage, or cookies.
 * Priority:
 * 1. URL Query Parameters (?subscriber_id=...&name=...)
 * 2. localStorage (thnoon_subscriber_id / thnoon_subscriber_name)
 * 3. Cookies (thnoon_sub_id / thnoon_sub_name)
 */
export function detectSubscriberSession(): SubscriberData | null {
  if (typeof window === "undefined") return null;

  // 1. Check URL query parameters
  try {
    const params = new URLSearchParams(window.location.search);
    const urlId =
      params.get("subscriber_id") ||
      params.get("sub_id") ||
      params.get("id") ||
      params.get("user") ||
      params.get("subid") ||
      "";
    const urlName =
      params.get("name") ||
      params.get("subscriber_name") ||
      params.get("user_name") ||
      params.get("username") ||
      "";

    if (urlId.trim()) {
      const cleanId = urlId.trim();
      const cleanName = urlName.trim();
      saveSubscriberSession(cleanId, cleanName, "url");
      return {
        id: cleanId,
        name: cleanName,
        source: "url"
      };
    }
  } catch (e) {
    console.warn("Error parsing URL parameters for subscriber:", e);
  }

  // 2. Check localStorage
  try {
    const storedId = localStorage.getItem(STORAGE_KEY_ID);
    const storedName = localStorage.getItem(STORAGE_KEY_NAME) || "";

    if (storedId && storedId.trim()) {
      return {
        id: storedId.trim(),
        name: storedName.trim(),
        source: "storage"
      };
    }

    const authJson = localStorage.getItem(STORAGE_KEY_AUTH);
    if (authJson) {
      try {
        const parsed = JSON.parse(authJson);
        const authId = parsed?.id || parsed?.subscriber_id || parsed?.sub_id || "";
        const authName = parsed?.name || parsed?.subscriber_name || parsed?.fullName || "";
        if (authId) {
          saveSubscriberSession(String(authId).trim(), String(authName).trim(), "storage");
          return {
            id: String(authId).trim(),
            name: String(authName).trim(),
            source: "storage"
          };
        }
      } catch (err) {}
    }
  } catch (e) {}

  // 3. Check Cookies
  try {
    const cookieId = getCookieValue("thnoon_sub_id") || getCookieValue("subscriber_id");
    const cookieName = getCookieValue("thnoon_sub_name") || getCookieValue("subscriber_name");
    if (cookieId && cookieId.trim()) {
      saveSubscriberSession(cookieId.trim(), cookieName.trim(), "cookie");
      return {
        id: cookieId.trim(),
        name: cookieName.trim(),
        source: "cookie"
      };
    }
  } catch (e) {}

  return null;
}

/**
 * Saves subscriber data (ID and Name only) to localStorage and cookies
 */
export function saveSubscriberSession(
  id: string,
  name: string,
  source: SubscriberData["source"] = "manual"
): SubscriberData {
  const cleanId = id.trim();
  const cleanName = name.trim();

  try {
    localStorage.setItem(STORAGE_KEY_ID, cleanId);
    if (cleanName) {
      localStorage.setItem(STORAGE_KEY_NAME, cleanName);
    }
    // Remove obsolete phone/email/arabic keys from past system
    localStorage.removeItem("thnoon_subscriber_phone");
    localStorage.removeItem("thnoon_subscriber_email");
    localStorage.removeItem("thnoon_subscriber_name_arabic");

    localStorage.setItem(
      STORAGE_KEY_AUTH,
      JSON.stringify({
        id: cleanId,
        subscriber_id: cleanId,
        name: cleanName,
        savedAt: new Date().toISOString()
      })
    );

    // Save lightweight cookie (30 days)
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `thnoon_sub_id=${encodeURIComponent(cleanId)}; expires=${expires}; path=/; SameSite=Lax`;
    if (cleanName) {
      document.cookie = `thnoon_sub_name=${encodeURIComponent(cleanName)}; expires=${expires}; path=/; SameSite=Lax`;
    }
  } catch (e) {}

  return {
    id: cleanId,
    name: cleanName,
    source
  };
}

/**
 * Clears subscriber session
 */
export function clearSubscriberSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_ID);
    localStorage.removeItem(STORAGE_KEY_NAME);
    localStorage.removeItem(STORAGE_KEY_AUTH);
    localStorage.removeItem("thnoon_subscriber_phone");
    localStorage.removeItem("thnoon_subscriber_email");
    localStorage.removeItem("thnoon_subscriber_name_arabic");
    document.cookie = "thnoon_sub_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "thnoon_sub_name=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "thnoon_sub_phone=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "thnoon_sub_email=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  } catch (e) {}
}
