import { describe, expect, it } from "vitest";
import { parseTelegramLink } from "./telegramLink";

describe("parseTelegramLink", () => {
  it("parses t.me/+HASH", () => {
    expect(parseTelegramLink("https://t.me/+AbCdEf123")).toEqual({
      kind: "invite",
      hash: "AbCdEf123",
    });
  });
  it("parses t.me/joinchat/HASH", () => {
    expect(parseTelegramLink("https://t.me/joinchat/AbCdEf123")).toEqual({
      kind: "invite",
      hash: "AbCdEf123",
    });
  });
  it("parses telegram.me/joinchat/HASH", () => {
    expect(parseTelegramLink("https://telegram.me/joinchat/AbCdEf123")).toEqual({
      kind: "invite",
      hash: "AbCdEf123",
    });
  });
  it("parses t.me/username", () => {
    expect(parseTelegramLink("https://t.me/mychannel")).toEqual({
      kind: "username",
      username: "mychannel",
    });
  });
  it("parses @username", () => {
    expect(parseTelegramLink("@mychannel")).toEqual({
      kind: "username",
      username: "mychannel",
    });
  });
  it("treats plain text as a search query", () => {
    expect(parseTelegramLink("cats")).toEqual({ kind: "query", query: "cats" });
  });
});
