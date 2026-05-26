import { streamText } from "ai";
import {
  subconsciousThinkingModel,
  requireSubconsciousApiKey,
} from "@/lib/subconscious";

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
  thinking?: string;
  durationMs: number;
  usage: { inputTokens: number; outputTokens: number };
  model: string;
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

  const base64Data = imageDataUrl.split(",")[1];

  const result = streamText({
    model: subconsciousThinkingModel,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", image: base64Data },
          { type: "text", text: ASSESSMENT_PROMPT },
        ],
      },
    ],
  });

  return result.toTextStreamResponse();
}
