import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { clientRequestSchema } from "./client-request";

const submissionSchema = clientRequestSchema.extend({
  techId: z.string().uuid(),
  requestId: z.string().uuid(),
  claimToken: z.string().regex(/^[0-9a-f]{64}$/),
});

export const submitClientRequest = createServerFn({ method: "POST" })
  .inputValidator((input: z.input<typeof submissionSchema>) => submissionSchema.parse(input))
  .handler(async ({ data }) => {
    const { submitClientRequestOnServer } = await import("./client-request.server");
    return submitClientRequestOnServer(data);
  });
