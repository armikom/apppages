import { describe, it, expect } from "vitest";
import { slugSchema, appDataSchema, publicRequestSchema } from "./index.js";

describe("slugSchema", () => {
  it("accepts valid slugs", () => {
    expect(slugSchema.safeParse("my-app").success).toBe(true);
    expect(slugSchema.safeParse("abc").success).toBe(true);
    expect(slugSchema.safeParse("my-cool-app-123").success).toBe(true);
  });

  it("rejects invalid slugs", () => {
    expect(slugSchema.safeParse("ab").success).toBe(false); // too short
    expect(slugSchema.safeParse("My-App").success).toBe(false); // uppercase
    expect(slugSchema.safeParse("-my-app").success).toBe(false); // leading hyphen
    expect(slugSchema.safeParse("my-app-").success).toBe(false); // trailing hyphen
    expect(slugSchema.safeParse("my app").success).toBe(false); // space
    expect(slugSchema.safeParse("my_app").success).toBe(false); // underscore
  });

  it("rejects reserved slugs", () => {
    expect(slugSchema.safeParse("admin").success).toBe(false);
    expect(slugSchema.safeParse("api").success).toBe(false);
    expect(slugSchema.safeParse("login").success).toBe(false);
    expect(slugSchema.safeParse("dashboard").success).toBe(false);
  });
});

describe("publicRequestSchema", () => {
  it("accepts valid deletion request", () => {
    const result = publicRequestSchema.safeParse({
      email: "user@example.com",
      type: "deletion",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid support request with message", () => {
    const result = publicRequestSchema.safeParse({
      email: "user@example.com",
      type: "support",
      message: "I need help",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = publicRequestSchema.safeParse({
      email: "not-an-email",
      type: "deletion",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-empty honeypot (bot detection)", () => {
    const result = publicRequestSchema.safeParse({
      email: "user@example.com",
      type: "deletion",
      honeypot: "I am a bot",
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty honeypot", () => {
    const result = publicRequestSchema.safeParse({
      email: "user@example.com",
      type: "deletion",
      honeypot: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid type", () => {
    const result = publicRequestSchema.safeParse({
      email: "user@example.com",
      type: "invalid_type",
    });
    expect(result.success).toBe(false);
  });
});
