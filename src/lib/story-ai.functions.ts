import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireActiveAccount } from "./account-access";
import { plainText } from "./input-security";

const failure = (e: unknown) => {
  const status = (e as { statusCode?: number })?.statusCode;
  console.error("story AI failed", status);
  return status === 429 ? "יש עומס כרגע, נסי שוב בעוד רגע." : status === 402 ? "נגמרו קרדיטים לבינה המלאכותית." : "הבינה המלאכותית לא הצליחה כרגע, נסי שוב.";
};

export const storyTextAssist = createServerFn({ method: "POST" })
  .middleware([requireActiveAccount])
  .inputValidator((input: { text: string; mode: string }) => z.object({
    text: plainText(200).refine(v => v.trim().length > 0, "כתבי טקסט קודם"),
    mode: z.enum(["improve", "shorten", "nikud", "emoji"]),
  }).parse(input))
  .handler(async ({ data }) => {
    const { rewriteStoryText } = await import("./story-ai.server");
    try { return { text: await rewriteStoryText(data.text, data.mode), error: null as string | null }; }
    catch (e) { return { text: "", error: failure(e) }; }
  });

export const storyAltText = createServerFn({ method: "POST" })
  .middleware([requireActiveAccount])
  .inputValidator((input: { image: string }) => z.object({
    image: z.string().max(400_000).regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/),
  }).parse(input))
  .handler(async ({ data }) => {
    const { describeStoryImage } = await import("./story-ai.server");
    try { return { alt: await describeStoryImage(data.image), error: null as string | null }; }
    catch (e) { return { alt: "", error: failure(e) }; }
  });
