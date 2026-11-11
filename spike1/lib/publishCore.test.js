import { test } from "node:test";
import assert from "node:assert/strict";
import { isTransientIg } from "./publishCore.js";

test("IG media-fetch failure is retried, real errors are not", () => {
  assert.equal(isTransientIg({ message: "Only photo or video can be accepted as media type." }), true);
  assert.equal(isTransientIg({ message: "An unknown error occurred" }), true);
  assert.equal(isTransientIg({ message: "The aspect ratio is not supported." }), false);
});
