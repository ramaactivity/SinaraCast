import { test } from "node:test";
import assert from "node:assert/strict";
import { checkStudioPost } from "./studioApi.js";

const img = (n = 1) => Array.from({ length: n }, () => ({ url: "https://cdn.example/a.jpg", format: "jpg" }));
const now = new Date("2026-11-04T10:00:00Z");

test("feed carousel draft ok", () => {
  assert.equal(checkStudioPost({ post_type: "feed", status: "draft", media: img(5) }, now), null);
});
test("feed rejects png, >10 slides, video", () => {
  assert.match(checkStudioPost({ post_type: "feed", status: "draft", media: [{ url: "https://x/a.png", format: "png" }] }, now), /JPG/);
  assert.match(checkStudioPost({ post_type: "feed", status: "draft", media: img(11) }, now), /10/);
  assert.match(checkStudioPost({ post_type: "feed", status: "draft", media: [{ url: "https://x/a.mp4", format: "mp4" }] }, now), /reels/);
});
test("scheduled needs a future time", () => {
  assert.match(checkStudioPost({ post_type: "feed", status: "scheduled", media: img(2) }, now), /wajib/);
  assert.match(checkStudioPost({ post_type: "feed", status: "scheduled", media: img(2), scheduled_at: "2026-11-04T10:00:30Z" }, now), /2 menit/);
  assert.equal(checkStudioPost({ post_type: "feed", status: "scheduled", media: img(2), scheduled_at: "2026-11-04T12:00:00Z" }, now), null);
});
test("story and reels shapes", () => {
  assert.match(checkStudioPost({ post_type: "story", status: "draft", media: img(2) }, now), /Story/);
  assert.equal(checkStudioPost({ post_type: "reels", status: "draft", media: [{ url: "https://x/v.mp4", format: "mp4" }] }, now), null);
  assert.match(checkStudioPost({ post_type: "reels", status: "draft", media: img(1) }, now), /video/);
});
test("rejects non-https media and unknown type", () => {
  assert.match(checkStudioPost({ post_type: "feed", status: "draft", media: [{ url: "http://x/a.jpg", format: "jpg" }] }, now), /URL/);
  assert.match(checkStudioPost({ post_type: "tiktok", status: "draft", media: img(1) }, now), /Jenis/);
});
test("caption max 30 hashtags", () => {
  const tags = (n) => Array.from({ length: n }, (_, i) => `#tag${i}`).join(" ");
  assert.equal(checkStudioPost({ post_type: "feed", status: "draft", media: img(1), caption: tags(30) }, now), null);
  assert.match(checkStudioPost({ post_type: "feed", status: "draft", media: img(1), caption: tags(31) }, now), /Hashtag 31/);
});
