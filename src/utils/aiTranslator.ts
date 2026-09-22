/**
 * Utility to request AI translation from server-side Gemini endpoint
 */
export async function translateWithAi(
  text: string,
  targetLang: "en" | "th",
  context?: string
): Promise<string> {
  if (!text || !text.trim()) {
    return "";
  }

  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: text.trim(),
        targetLang,
        context
      })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.success && typeof data.translation === "string") {
      return data.translation.trim();
    }
    throw new Error(data.error || "Invalid response from translation API");
  } catch (err: any) {
    console.error("AI Translation failed:", err);
    throw err;
  }
}
