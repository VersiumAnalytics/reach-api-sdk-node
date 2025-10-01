import test from "node:test";
import assert from "node:assert/strict";
import ReachClient from "../dist/index.js";

const API_KEY = process.env.REACH_KEY;
const skipMessage = API_KEY
  ? false
  : "REACH_KEY env var not set; skipping integration tests";

const fakePersons = [
  {
    first: "Casey",
    last: "Example",
    email: "casey.example@example.com",
  },
  {
    first: "Jordan",
    last: "Example",
    email: "jordan.example@example.com",
  },
];

test(
  "append handles options with additionalParams against live API",
  {
    skip: skipMessage,
    timeout: 90_000,
  },
  async (t) => {
    const client = new ReachClient(API_KEY, {
      loggingFunction: (...msgs) =>
        t.diagnostic(
          msgs
            .map((msg) => (typeof msg === "string" ? msg : JSON.stringify(msg)))
            .join(" ")
        ),
      queriesPerSecond: 5,
    });

    const options = {
      outputTypes: ["phone_multiple"],
      additionalParams: {
        match_type: "indiv",
        cfg_maxrecs: "3",
      },
    };

    const responses = [];
    for await (const chunk of client.append("contact", fakePersons, options)) {
      responses.push(...chunk);
    }

    assert.equal(responses.length, fakePersons.length);
    for (let index = 0; index < responses.length; index += 1) {
      const response = responses[index];
      assert.equal(response.success, true);
      assert.ok(response.httpStatus >= 200 && response.httpStatus < 300);
      assert.deepEqual(response.inputs, fakePersons[index]);
      assert.equal(typeof response.matchFound, "boolean");
    }
  }
);

test(
  "listgen streams records against live API",
  {
    skip: skipMessage,
    timeout: 90_000,
  },
  async () => {
    const client = new ReachClient(API_KEY);
    const response = await client.listgen("abm", { domain: ["versium.com"] }, [
      "abm_email",
    ]);

    assert.ok(response.httpStatus >= 200 && response.httpStatus < 300);
    assert.equal(response.success, true);

    let records = 0;
    for await (const record of response.getRecords()) {
      assert.equal(typeof record, "object");
      assert.ok(record);
      records += 1;
    }

    assert.ok(records >= 0);
  }
);
