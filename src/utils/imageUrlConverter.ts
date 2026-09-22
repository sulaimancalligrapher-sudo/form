/**
 * Flexible Image URL Converter
 * Supports:
 * - Google Drive share/view links (https://drive.google.com/file/d/ID/view, open?id=ID, uc?id=ID)
 * - Dropbox share links (transforms dl=0 to raw=1)
 * - OneDrive links
 * - Direct image links (PNG, JPG, SVG, WebP, animated GIF)
 * - Base64 Data URLs (data:image/...)
 */

export function extractGoogleDriveFileId(url: string): string | null {
  if (!url || typeof url !== "string") return null;

  // Format 1: /file/d/{ID}/...
  const matchFileD = url.match(/\/file\/d\/([a-zA-Z0-9_-]{15,})/);
  if (matchFileD && matchFileD[1]) return matchFileD[1];

  // Format 2: id={ID}
  const matchIdParam = url.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
  if (matchIdParam && matchIdParam[1]) return matchIdParam[1];

  // Format 3: /d/{ID}
  const matchD = url.match(/\/d\/([a-zA-Z0-9_-]{15,})/);
  if (matchD && matchD[1]) return matchD[1];

  return null;
}

/**
 * Normalizes any image URL into a format directly renderable by <img src="...">
 */
export function normalizeImageUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  const trimmed = rawUrl.trim();

  // 1. Data URLs (e.g. uploaded base64 images or GIFs)
  if (trimmed.startsWith("data:image/")) {
    return trimmed;
  }

  // 2. Google Drive links
  const driveId = extractGoogleDriveFileId(trimmed);
  if (driveId) {
    // lh3.googleusercontent.com is the fastest and most reliable direct CDN link for Google Drive images and GIFs
    return `https://lh3.googleusercontent.com/d/${driveId}`;
  }

  // 3. Dropbox links
  if (trimmed.includes("dropbox.com/s/")) {
    return trimmed.replace("?dl=0", "?raw=1").replace("&dl=0", "&raw=1");
  }

  // 4. Regular HTTP / HTTPS URLs
  return trimmed;
}

/**
 * Alternative fallback URL for Google Drive images if the primary CDN is blocked or restricted
 */
export function getAlternativeDriveImageUrl(rawUrl: string): string | null {
  const driveId = extractGoogleDriveFileId(rawUrl);
  if (!driveId) return null;
  // Google Drive thumbnail endpoint supports high resolution
  return `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`;
}
