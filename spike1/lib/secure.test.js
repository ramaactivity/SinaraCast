import test from "node:test";
import assert from "node:assert/strict";
import { safeEqual } from "./secure.js";

test("safeEqual: cocok, beda, dan rahasia kosong selalu ditolak", () => {
  assert.equal(safeEqual("abc", "abc"), true);
  assert.equal(safeEqual("abd", "abc"), false);
  assert.equal(safeEqual("abc", ""), false);
  assert.equal(safeEqual("", ""), false);
  assert.equal(safeEqual(null, undefined), false);
});
