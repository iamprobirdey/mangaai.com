import { test } from "node:test";
import assert from "node:assert/strict";
import { computeStreak } from "../src/lib/streak";
import { accessFor, type SubscriptionRow } from "../src/lib/entitlement";
import { earnedBadges } from "../src/lib/badges";
import { bandsUpTo } from "../src/lib/constants";

const day = 86_400_000;
const now = new Date("2026-11-04T10:00:00Z");
const sub = (over: Partial<SubscriptionRow>): SubscriptionRow => ({
  id: "s", parent_id: "p", razorpay_subscription_id: "sub_1", plan: "monthly", status: "active",
  trial_end: null, current_start: null, current_end: null, first_charged_at: null,
  cancel_at_cycle_end: false, cancelled_at: null, short_url: null, created_at: now.toISOString(), ...over,
});
const iso = (offsetDays: number) => new Date(now.getTime() + offsetDays * day).toISOString();

test("streak: consecutive days", () => {
  assert.equal(computeStreak(["2026-11-02", "2026-11-03", "2026-11-04"], "2026-11-04"), 3);
});
test("streak: one missed day does not break it", () => {
  assert.equal(computeStreak(["2026-10-31", "2026-11-02", "2026-11-04"], "2026-11-04"), 3);
});
test("streak: two missed days break it", () => {
  assert.equal(computeStreak(["2026-10-30", "2026-11-02", "2026-11-04"], "2026-11-04"), 2);
});
test("streak: still alive if last read was 2 days ago, dead after 3", () => {
  assert.equal(computeStreak(["2026-11-01", "2026-11-02"], "2026-11-04"), 2);
  assert.equal(computeStreak(["2026-11-01"], "2026-11-04"), 0);
  assert.equal(computeStreak([], "2026-11-04"), 0);
});

test("access: no subscription", () => {
  assert.deepEqual([accessFor(null, 3, now).active, accessFor(null, 3, now).state], [false, "none"]);
  assert.equal(accessFor(sub({ status: "created" }), 3, now).active, false);
});
test("access: authenticated with future trial end is a trial", () => {
  const a = accessFor(sub({ status: "authenticated", trial_end: iso(5) }), 3, now);
  assert.equal(a.active, true);
  assert.equal(a.state, "trial");
});
test("access: pending (renewal retrying) keeps reading open", () => {
  assert.equal(accessFor(sub({ status: "pending", current_end: iso(-1) }), 3, now).state, "past_due");
});
test("access: halted gets a grace period after the paid-through date", () => {
  assert.equal(accessFor(sub({ status: "halted", current_end: iso(-2) }), 3, now).state, "grace");
  const ended = accessFor(sub({ status: "halted", current_end: iso(-4) }), 3, now);
  assert.equal(ended.active, false);
});
test("access: cancelled keeps access until the period ends", () => {
  assert.equal(accessFor(sub({ status: "cancelled", current_end: iso(10) }), 3, now).active, true);
  assert.equal(accessFor(sub({ status: "cancelled", current_end: iso(-1) }), 3, now).active, false);
});

test("badges", () => {
  assert.deepEqual(earnedBadges({ chaptersCompleted: 0, streak: 0, finishedSeries: false, genresCompleted: 0 }), []);
  assert.deepEqual(
    earnedBadges({ chaptersCompleted: 5, streak: 7, finishedSeries: true, genresCompleted: 3 }).sort(),
    ["chapters_5", "explorer", "first_chapter", "series_finisher", "streak_3", "streak_7"].sort(),
  );
});

test("age bands include younger bands only", () => {
  assert.deepEqual(bandsUpTo("7-9"), ["4-6", "7-9"]);
  assert.deepEqual(bandsUpTo("4-6"), ["4-6"]);
});
