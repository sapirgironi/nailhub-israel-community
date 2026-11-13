import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireActiveAccount } from "./account-access";

const deletionSchema = z.object({
  kind: z.enum(["post", "story", "comment", "sticker"]),
  id: z.string().uuid(),
});

export const deleteContent = createServerFn({ method: "POST" })
  .middleware([requireActiveAccount])
  .inputValidator((input: z.input<typeof deletionSchema>) => deletionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { deleteContentOnServer } = await import("./content-deletion.server");
    await deleteContentOnServer(data, context);
  });

export const discardStickerUpload = createServerFn({ method: "POST" })
  .middleware([requireActiveAccount])
  .inputValidator((input: { path: string }) => z.object({
    path: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.png$/i),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { discardStickerUploadOnServer } = await import("./content-deletion.server");
    await discardStickerUploadOnServer(data.path, context);
  });
