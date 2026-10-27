import { createServerFn } from "@tanstack/react-start";
import { requireActiveAccount } from './account-access';
import { z } from 'zod';
import { plainText } from './input-security';

export const estimateMaterialCost = createServerFn({ method: "POST" })
  .middleware([requireActiveAccount])
  .inputValidator((input: { treatment: string; length: string; effects: string; materials: string }) => z.object({
    treatment: plainText(100), length: plainText(50), effects: plainText(500),
    materials: plainText(1000).refine(v => v.length >= 3, 'פרטי את החומרים'),
  }).parse(input))
  .handler(async ({ data }) => {
    const { estimateMaterials } = await import("./pricing-ai.server");
    try {
      const r = await estimateMaterials(`טיפול: ${data.treatment}\nאורך: ${data.length}\nקישוטים: ${data.effects || 'ללא'}\nחומרים: ${data.materials}`);
      return { ...r, error: null as string | null };
    } catch (e) {
      const status = (e as { statusCode?: number })?.statusCode;
      console.error("estimateMaterialCost failed", status);
      const error = status === 429 ? "יש עומס כרגע, נסי שוב בעוד רגע." : status === 402 ? "נגמרו קרדיטים לבינה המלאכותית." : "הערכת העלות נכשלה, נסי שוב.";
      return { cost: 0, note: "", error };
    }
  });
