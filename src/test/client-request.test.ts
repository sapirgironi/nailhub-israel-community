import { describe, expect, it } from "vitest";
import { clientRequestSchema, newClientRequestClaimToken } from "../lib/client-request";

describe("client request validation", () => {
  it("accepts a complete request with a normalized plain-text name", () => {
    expect(
      clientRequestSchema.safeParse({
        fullName: "  דנה ישראלי  ",
        phone: "050-1234567",
        requestType: "reschedule",
        description: "אשמח לשנות את מועד התור",
      }),
    ).toMatchObject({
      success: true,
      data: { fullName: "דנה ישראלי" },
    });
  });

  it("rejects malformed phones, unsupported request types, and executable markup", () => {
    for (const invalid of [
      {
        fullName: "דנה",
        phone: "not a phone",
        requestType: "reschedule",
        description: "שינוי תור",
      },
      { fullName: "דנה", phone: "0501234567", requestType: "payment", description: "שינוי תור" },
      {
        fullName: "דנה",
        phone: "0501234567",
        requestType: "other",
        description: "<script>alert(1)</script>",
      },
    ]) {
      expect(clientRequestSchema.safeParse(invalid).success).toBe(false);
    }
  });

  it("creates a 256-bit lowercase hexadecimal claim token", () => {
    const token = newClientRequestClaimToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(newClientRequestClaimToken()).not.toBe(token);
  });
});
