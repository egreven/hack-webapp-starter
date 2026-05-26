import { generateText } from "ai";
import { subconsciousModel, requireSubconsciousApiKey } from "@/lib/subconscious";

export const maxDuration = 60;

const ASSESSMENT_PROMPT = `You are a furniture damage assessor for Wayfair customer service. Analyze the image carefully and return ONLY a valid JSON object — no markdown, no explanation outside the JSON.

Return this exact shape:
{
  "damageType": "severe_damage" | "missing_parts" | "scratch",
  "severity": "high" | "medium" | "low",
  "resolution": "full_refund" | "full_replacement" | "partial_replacement" | "coupon",
  "explanation": "<one sentence describing what you see and why>"
}

Classification rules:
- Destroyed packaging, crushed/shattered structure, broken pieces, major physical damage → damageType: "severe_damage" → resolution: "full_refund" or "full_replacement"
- Missing legs, missing hardware, incomplete item, structural component absent → damageType: "missing_parts" → resolution: "partial_replacement"
- Surface scratches, scuffs, minor marks on an otherwise intact item → damageType: "scratch" → resolution: "coupon"

Pick the resolution that best fits the damage type per the rules above.`;

export interface AssessmentResult {
  damageType: "severe_damage" | "missing_parts" | "scratch";
  severity: "high" | "medium" | "low";
  resolution: "full_refund" | "full_replacement" | "partial_replacement" | "coupon";
  explanation: string;
}

export async function POST(request: Request) {
  try {
    requireSubconsciousApiKey();
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Missing API key" },
      { status: 500 },
    );
  }

  const body = await request.json();
  const imageDataUrl: string = body.imageDataUrl;

  if (!imageDataUrl) {
    return Response.json({ error: "imageDataUrl is required" }, { status: 400 });
  }

  const mediaType = imageDataUrl.startsWith("data:image/png")
    ? "image/png"
    : imageDataUrl.startsWith("data:image/webp")
      ? "image/webp"
      : "image/jpeg";

  const base64Data = imageDataUrl.split(",")[1];

  try {
    const { text } = await generateText({
      model: subconsciousModel,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              image: base64Data,
              mimeType: mediaType,
            },
            {
              type: "text",
              text: ASSESSMENT_PROMPT,
            },
          ],
        },
      ],
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: "Model did not return valid JSON", raw: text }, { status: 500 });
    }

    const result: AssessmentResult = JSON.parse(jsonMatch[0]);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Assessment failed" },
      { status: 500 },
    );
  }
}
