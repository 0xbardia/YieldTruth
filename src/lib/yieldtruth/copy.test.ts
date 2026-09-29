import assert from "node:assert/strict";
import test from "node:test";
import { assessedWhen, componentList, flagList } from "./copy.ts";

// The narrative pages used to print raw contract enums ("LENDING_INTEREST") in the
// middle of otherwise plain sentences. These pin the plain-language rendering.
test("component lists read as language, not contract codes", () => {
  assert.equal(componentList(["LENDING_INTEREST"]), "Borrower interest");
  assert.equal(componentList(["TOKEN_SUBSIDY", "LENDING_INTEREST"]), "Token incentives, Borrower interest");
  assert.equal(componentList([]), "none recorded");
});

test("risk flags read as language and every contract flag is covered", () => {
  assert.equal(flagList(["SINGLE_SOURCE"]), "Only one source could be read");
  assert.equal(flagList(["THIN_EVIDENCE", "POINTS_ONLY"]), "The evidence is thin, Mostly an unissued points programme");
  assert.equal(flagList([]), "none");
  // An unmapped flag degrades to the raw value rather than rendering "undefined".
  assert.equal(flagList(["SOMETHING_NEW"]), "SOMETHING_NEW");
});

test("the assessment time is human readable and falls back safely", () => {
  assert.equal(assessedWhen("2026-09-26T08:39:40Z"), "2026-09-26 at 08:39 UTC");
  assert.equal(assessedWhen(""), "");
  assert.equal(assessedWhen("not-a-date"), "not-a-date");
});
