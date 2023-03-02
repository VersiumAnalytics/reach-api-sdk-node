import assert from "node:assert";
import ReachClient from "../dist/index.js";
import { waitTimer } from "../dist/lib.js";

const API_KEY = process.env.REACH_KEY;

(async function tests() {
  const client = new ReachClient(API_KEY, {
    loggingFunction: (...msgs) => console.log("CLIENT LOG:", ...msgs),
  });

  await appends(client);
  await listgen(client);
})();

async function appends(client) {
  const tests = [
    {
      dataTool: "c2b",
      inputs: Array(135).fill({
        first: "John",
        last: "Doe",
        email: "doejohn@hotmail.com",
      }),
    },
    {
      dataTool: "iptodomain",
      inputs: Array(97).fill({ ip: "152.44.212.248" }),
    },
    {
      dataTool: "contact",
      outputTypes: ["address", "phone"],
      inputs: Array(111).fill({ email: "doejohn@hotmail.com" }),
    },
    {
      dataTool: "demographic",
      outputTypes: ["lifestyle", "political"],
      inputs: Array(88).fill({ email: "doejohn@hotmail.com" }),
    },
    {
      dataTool: "b2cOnlineAudience",
      inputs: Array(95).fill({
        first: "John",
        last: "Doe",
        email: "jdoe@versium.com",
      }),
    },
    {
      dataTool: "b2bOnlineAudience",
      inputs: Array(147).fill({
        first: "John",
        last: "Doe",
        email: "jdoe@versium.com",
      }),
    },
    {
      dataTool: "firmographic",
      inputs: Array(5).fill({ email: "jdoe@versium.com" }),
    },
    {
      dataTool: "hemtobusinessdomain",
      inputs: Array(7).fill({ email: "ba593b9e33bae27a032c79ac24ab38e4" }),
    },
  ];

  for (const test of tests) {
    const allResponses = [];
    const start = Date.now();
    for await (const responses of client.append(
      test.dataTool,
      test.inputs,
      test.outputTypes
    )) {
      allResponses.push(...responses);
    }
    const end = Date.now();

    assert(allResponses.length === test.inputs.length);
    assert.deepEqual(allResponses[0].inputs, test.inputs[0]);
    assert(allResponses.every((resp) => resp.httpStatus === 200));

    console.log(
      `Test '${test.dataTool}' successful! ${test.inputs.length} queries in ${
        end - start
      }ms`
    );

    // console.log(allResponses[0]);

    await waitTimer(1000); // wait between tests to avoid hitting the rate limit
  }
}

async function listgen(client) {
  const start = Date.now();
  const response = await client.listgen("abm", { domain: ["versium.com"] }, [
    "abm_email",
  ]);

  if (!response.success) {
    console.log({ response });
    assert.fail("Response not 200 ok");
  }

  let recCount = 0;
  for await (const record of response.getRecords()) {
    assert.ok(record);
    assert.ok(record.contact_fields);
    recCount += 1;
  }

  console.log(
    `Test 'abm' successful! ${recCount} records in ${Date.now() - start}ms`
  );
}
