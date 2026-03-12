import { describe, expect, it } from "vitest";
import { spawnSync } from "child_process";
import { readFileSync } from "fs";

const TOKEN_FILE = "/tmp/gws_token.txt";

function getToken(): string {
  try {
    const fromFile = readFileSync(TOKEN_FILE, "utf-8").trim();
    if (fromFile && fromFile.length > 20) return fromFile;
  } catch { /* fallback */ }
  return process.env.GOOGLE_WORKSPACE_CLI_TOKEN || "";
}

describe("Google Workspace CLI Token", () => {
  it("should have GOOGLE_WORKSPACE_CLI_TOKEN available", () => {
    const token = getToken();
    expect(token).toBeDefined();
    expect(token.length).toBeGreaterThan(10);
  });

  it("should successfully authenticate with Google Sheets API", () => {
    const token = getToken();
    const args = [
      "sheets", "spreadsheets", "get",
      "--params", JSON.stringify({
        spreadsheetId: "1K-Hh6SUo5OHbLbqCNwy9V04d97IfgnlnjeX8NanQVyw",
        fields: "properties.title",
      }),
    ];
    const env = { ...process.env, GOOGLE_WORKSPACE_CLI_TOKEN: token };
    const result = spawnSync("gws", args, {
      encoding: "utf-8",
      timeout: 30000,
      env,
    });

    expect(result.status).toBe(0);
    const data = JSON.parse(result.stdout);
    expect(data.properties).toBeDefined();
    expect(data.properties.title).toBeTruthy();
  });
});
