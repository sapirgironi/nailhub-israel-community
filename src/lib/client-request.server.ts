import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { ClientRequestInput } from "./client-request";

export async function submitClientRequestOnServer(
  input: ClientRequestInput & { techId: string; requestId: string; claimToken: string },
) {
  const request = getRequest();
  const secret = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!secret) throw new Error("שירות הפניות אינו מוגדר כרגע");
  const address = process.env["VERCEL"] === "1"
    ? request.headers.get("x-vercel-forwarded-for")?.trim()
    : process.env["NODE_ENV"] === "development" ? "127.0.0.1" : undefined;
  if (!address || !isIP(address)) {
    console.error("Client request source address unavailable");
    throw new Error("לא ניתן לאמת את מקור הפנייה כרגע");
  }

  const authorization = request.headers.get("authorization");
  if (authorization) {
    const token = /^Bearer (.+)$/.exec(authorization)?.[1];
    if (!token) throw new Error("לא ניתן לאמת את החשבון");
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) throw new Error("לא ניתן לאמת את החשבון");
    const { data: banned, error: banError } = await supabaseAdmin.rpc("is_account_banned", {
      target_user: data.user.id,
    });
    if (banError || banned !== false) throw new Error("לא ניתן לשלוח פנייה מהחשבון הזה");
  }

  const hash = (value: string) => createHmac("sha256", secret).update(value).digest("hex");
  const sourceHash = hash(`client-request-source:${address}`);
  const fingerprint = hash(JSON.stringify([
    "client-request-duplicate",
    input.techId,
    input.phone.replace(/\D/g, ""),
    input.requestType,
    input.description.trim().replace(/\s+/g, " ").toLowerCase(),
  ]));
  const { data, error } = await supabaseAdmin.rpc("submit_client_request_guarded", {
    p_request_id: input.requestId,
    p_tech_id: input.techId,
    p_full_name: input.fullName,
    p_phone: input.phone,
    p_request_type: input.requestType,
    p_description: input.description,
    p_claim_token: input.claimToken,
    p_source_hash: sourceHash,
    p_fingerprint: fingerprint,
  });
  if (error) {
    console.error("Client request submission failed", { code: error.code });
    throw new Error("שליחת הפנייה נכשלה. נסי שוב.");
  }
  if (data !== "submitted" && data !== "duplicate" && data !== "rate_limited" && data !== "invalid_technician") {
    console.error("Client request submission returned an unexpected result");
    throw new Error("שליחת הפנייה נכשלה. נסי שוב.");
  }
  return data;
}
