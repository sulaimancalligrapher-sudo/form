import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const {
      studentId = "",
      studentName = "",
      totalScore = 0,
      answers = [],
      combinedAnswers = "",
      goal = "",
      criteria = [],
      customInstructions = ""
    } = body || {};

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        success: false,
        fallback: true,
        error: "GEMINI_API_KEY not configured on server"
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });

    const formattedAnswers = Array.isArray(answers) && answers.length > 0
      ? answers
          .filter((a: any) => a && a.answer)
          .map((a: any, idx: number) => {
            const rawAns = String(a.answer || "").trim();
            const cleanAns =
              rawAns.startsWith("data:") || rawAns.includes("base64,")
                ? "[تم إرفاق صورة كتابة المشترك]"
                : rawAns;
            return `${idx + 1}. السؤال: ${a.question}\n   الإجابة: ${cleanAns}${
              a.score !== undefined ? ` (النقاط: ${a.score})` : ""
            }`;
          })
          .join("\n")
      : (combinedAnswers || "").replace(/data:[^|]+/g, "[صورة مرفقة]") || "لا توجد إجابات نصية مفصلة";

    const criteriaList = Array.isArray(criteria) && criteria.length > 0
      ? criteria.map((c: string, i: number) => `${i + 1}. ${c}`).join("\n")
      : "";

    const prompt = `أنت خبير تربوي ومحلل متخصص في برامج تعليم الخط العربي.
قم بقراءة وتحليل إجابات المشترك التالي بدقة وموضوعية باللغة العربية:

بيانات المشترك:
- رقم المشترك (Student ID): ${studentId}
- اسم المشترك (Student Name): ${studentName}
- مجموع النقاط المحسوب: ${totalScore}

الهدف من التحليل:
${goal}

المعطيات والعناصر المطلوب تحليلها (يرجى الإجابة عن كل عنصر بوضوح مع وضع نسبة مئوية تقديرية % لكل عنصر مهاري أو سلوكي من واقع إجابات المشترك):
${criteriaList}

${customInstructions ? `تعليمات إضافية:\n${customInstructions}\n` : ""}
إجابات المشترك في الاستبيان:
${formattedAnswers}

المطلوب:
كتابة تقرير تحليلي منظم ومختصر باللغة العربية للإدارة فقط، يتضمن كل عنصر من العناصر المذكورة أعلاه مع النسبة المئوية والتفسير المستنتج من إجاباته، ثم خلاصة وتوصية عملية للمعلم في نهاية التقرير.`;

    let analysisText = "";
    const models = ["gemini-3-flash-preview", "gemini-2.5-flash"];
    for (const model of models) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt
        });
        if (response.text?.trim()) {
          analysisText = response.text.trim();
          break;
        }
      } catch (mErr) {}
    }

    if (!analysisText) {
      return res.status(200).json({
        success: false,
        fallback: true,
        error: "Empty AI response"
      });
    }

    return res.status(200).json({
      success: true,
      analysis: analysisText
    });
  } catch (error: any) {
    console.error("Error in /api/analyze:", error);
    return res.status(200).json({
      success: false,
      fallback: true,
      error: error?.message || "Analysis error"
    });
  }
}
