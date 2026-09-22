/**
 * Vercel Serverless Function: /api/register
 * 
 * Proxies submission from Vercel to Google Apps Script Web App without browser CORS issues.
 */

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  try {
    const payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const scriptUrl =
      payload.scriptUrl ||
      process.env.VITE_GOOGLE_SCRIPT_URL ||
      process.env.GOOGLE_SCRIPT_URL ||
      "https://script.google.com/macros/s/AKfycbwxn8Q7W9DbAufsdZXx_57s7qf3hM2B4EeSugqDzWc13D62U28kvUkn9yZSwH2il5dBoQ/exec";

    // Forward to Google Apps Script
    const gasResponse = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "submitRegistration",
        ...payload
      })
    });

    const responseText = await gasResponse.text();
    try {
      const json = JSON.parse(responseText);
      res.status(200).json(json);
    } catch (e) {
      res.status(200).json({
        success: true,
        registrationId: payload.registrationId,
        message: responseText
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to proxy to Google Sheets"
    });
  }
}
