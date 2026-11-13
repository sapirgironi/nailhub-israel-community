import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function run(...args: string[]) {
  return spawnSync(
    process.execPath,
    [join(process.cwd(), "scripts", "staged-migrations.mjs"), ...args],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        NAILHUB_MIGRATION_DATABASE_URL: "postgresql://postgres:dummy@localhost/postgres",
      },
    },
  );
}

describe("staged migration safety checks", () => {
  it("requires an explicit target and stage", () => {
    const result = run("--check");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Specify --target=test|production and --stage=a|b");
  });

  it("requires explicit production confirmation and backup safeguards", () => {
    const noConfirmation = run("--target=production", "--stage=a");
    expect(noConfirmation.status).toBe(1);
    expect(noConfirmation.stderr).toContain("requires --confirm=production-a");
    const noBackup = run("--target=production", "--stage=a", "--confirm=production-a");
    expect(noBackup.status).toBe(1);
    expect(noBackup.stderr).toContain("explicit restore-risk acceptance");
    const noRiskAcceptance = run(
      "--target=production",
      "--stage=a",
      "--confirm=production-a",
      "--writes-paused",
      "--backup-integrity-verified",
    );
    expect(noRiskAcceptance.stderr).toContain("explicit restore-risk acceptance");
    const noIntegrity = run(
      "--target=production",
      "--stage=a",
      "--confirm=production-a",
      "--writes-paused",
      "--restore-risk-accepted",
    );
    expect(noIntegrity.stderr).toContain("verified backup integrity");
    const acceptedRisk = run(
      "--target=production",
      "--stage=a",
      "--confirm=production-a",
      "--writes-paused",
      "--backup-integrity-verified",
      "--restore-risk-accepted",
    );
    expect(acceptedRisk.stderr).toContain("backup restoration has not been verified");
    expect(acceptedRisk.stderr).toContain("does not match the explicitly selected project");
  });

  it("requires a verified code deployment before the late phase", () => {
    const result = run("--target=test", "--stage=b", "--confirm=test-b");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("requires --code-verified");
  });

  it("refuses a connection string that does not match the selected project", () => {
    const result = run("--target=production", "--stage=a", "--check");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("does not match the explicitly selected project");
  });
});
