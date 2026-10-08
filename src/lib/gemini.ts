import "server-only";

// Tried in order: if the first model is unavailable or rate-limited, fall back to the next
const MODELS = [process.env.GEMINI_MODEL || "gemini-3.5-flash", "gemini-3.5-flash-lite"];

const CAPTION_COUNT = 4;

export function buildCaptionPrompt(vibeInstructions: string, theme: string) {
  return [
    "You write funny captions for photos posted to a humor site for Columbia University students living in New York City.",
    `Write exactly ${CAPTION_COUNT} different captions for this photo.`,
    `Style: ${vibeInstructions}`,
    `Today's theme is "${theme}". Lean into it if it fits the photo, but never force it.`,
    "Rules:",
    "- Each caption must be about what is actually in the photo.",
    "- Under 140 characters each. No hashtags. No quotation marks around the caption.",
    "- Keep it clever, not mean: no jokes about anyone's appearance, race, gender, religion, or body.",
    "- Make each caption a different kind of joke.",
  ].join("\n");
}

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
};

export async function generateCaptions(image: { data: string; mimeType: string }, prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set.");
  }

  let lastError = "Caption generation failed.";

  for (const model of MODELS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: image.mimeType, data: image.data } },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            temperature: 1.1,
            responseMimeType: "application/json",
            responseSchema: {
              type: "ARRAY",
              items: { type: "STRING" },
            },
          },
        }),
      }
    );

    const body = (await res.json().catch(() => ({}))) as GeminiResponse;

    if (!res.ok) {
      lastError = body.error?.message ?? `Gemini returned ${res.status}.`;
      // 404: model not available to this key; 429/5xx: try a lighter model
      if (res.status === 404 || res.status === 429 || res.status >= 500) continue;
      throw new Error(lastError);
    }

    if (body.promptFeedback?.blockReason) {
      throw new Error("That photo couldn't be captioned. Try a different one.");
    }

    const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      lastError = "The AI returned something unreadable. Try again.";
      continue;
    }

    const captions = (Array.isArray(parsed) ? parsed : [])
      .filter((c): c is string => typeof c === "string")
      .map((c) => c.trim().replace(/^["“]|["”]$/g, ""))
      .filter((c) => c.length > 0 && c.length <= 300)
      .slice(0, CAPTION_COUNT);

    if (captions.length === 0) {
      lastError = "The AI didn't come up with any captions. Try again.";
      continue;
    }

    return { captions, model };
  }

  throw new Error(lastError);
}
