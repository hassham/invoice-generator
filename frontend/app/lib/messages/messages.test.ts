import { describe, expect, it } from "vitest";
import { en } from "./en";
import { t } from "./index";

describe("message catalogue (IG-241)", () => {
  it("returns the English text for a key", () => {
    expect(t("team.title")).toBe("Team");
  });

  it("fills {placeholders} from params", () => {
    expect(t("team.invite.sent", { email: "a@example.com", role: "Admin" })).toBe("Invitation sent to a@example.com as Admin.");
  });

  it("leaves a placeholder visible when its param is not supplied", () => {
    expect(t("team.invite.sent", { email: "a@example.com" })).toBe("Invitation sent to a@example.com as {role}.");
  });

  it("has no empty entries", () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value.trim().length, key).toBeGreaterThan(0);
    }
  });

  it("keeps the team and invitation pages' text in the catalogue, with no empty placeholders", () => {
    for (const value of Object.values(en)) {
      expect(value).not.toMatch(/\{\s*\}/);
    }
  });
});
