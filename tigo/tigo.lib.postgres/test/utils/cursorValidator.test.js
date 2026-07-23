import { describe, expect, it } from "vitest";
import { isSafeCursorName } from "../../src/utils/cursorValidator.js";

describe("isSafeCursorName", () => {
  it("accepts alphanumeric cursor names and underscores", () => {
    expect(isSafeCursorName("cursor_1")).toBe(true);
    expect(isSafeCursorName("REFCURSOR")).toBe(true);
  });

  it("rejects cursor names with SQL punctuation or whitespace", () => {
    expect(isSafeCursorName("cursor-name")).toBe(false);
    expect(isSafeCursorName("cursor;DROP_TABLE")).toBe(false);
    expect(isSafeCursorName("cursor name")).toBe(false);
  });
});
