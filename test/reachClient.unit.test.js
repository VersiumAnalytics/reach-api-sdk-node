import test from "node:test";
import assert from "node:assert/strict";
import { Headers } from "node-fetch";
import ReachClient from "../dist/index.js";

class TestReachClient extends ReachClient {
  constructor() {
    super("fake-key");
  }

  capturedConfigs = [];

  async processAppendRequests(config) {
    this.capturedConfigs.push(config);
    return config.inputChunk.map((inputs) => ({
      success: true,
      httpStatus: 200,
      headers: new Headers(),
      body: undefined,
      bodyRaw: "",
      matchFound: false,
      inputs,
    }));
  }
}

test("append forwards additionalParams with object options", async () => {
  const client = new TestReachClient();
  const inputs = [
    {
      email: "test.person@example.com",
      first: "Testy",
      last: "Person",
    },
  ];
  const options = {
    outputTypes: ["phone_multiple"],
    additionalParams: {
      match_type: "indiv",
      cfg_maxrecs: "3",
      rcfg_max_time: "4.5",
    },
  };

  const responses = [];
  for await (const chunk of client.append("contact", inputs, options)) {
    responses.push(...chunk);
  }

  assert.equal(responses.length, inputs.length);
  assert.equal(client.capturedConfigs.length, 1);

  const config = client.capturedConfigs[0];
  assert.equal(config.dataTool, "contact");
  assert.deepEqual(config.inputChunk, inputs);
  assert.deepEqual(config.outputTypes, options.outputTypes);
  assert.deepEqual(config.additionalParams, options.additionalParams);
});

test("append accepts legacy array of output types", async () => {
  const client = new TestReachClient();
  const inputs = [
    {
      email: "legacy.person@example.com",
      first: "Legacy",
      last: "Person",
    },
  ];
  const outputTypes = ["email"];

  const responses = [];
  for await (const chunk of client.append("contact", inputs, outputTypes)) {
    responses.push(...chunk);
  }

  assert.equal(responses.length, inputs.length);
  assert.equal(client.capturedConfigs.length, 1);

  const config = client.capturedConfigs[0];
  assert.deepEqual(config.outputTypes, outputTypes);
  assert.deepEqual(config.additionalParams, {});
});

test("constructAPIURL includes additional params and array inputs", () => {
  const client = new ReachClient("fake-key");
  const url = client.constructAPIURL("contact", ["email"], {
    email: "person@example.com",
    match_type: "hhld",
    rcfg_exclude_domains: ["aol.com", "yahoo.com"],
  });

  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get("email"), "person@example.com");
  assert.equal(parsed.searchParams.get("match_type"), "hhld");
  assert.deepEqual(parsed.searchParams.getAll("rcfg_exclude_domains[]"), [
    "aol.com",
    "yahoo.com",
  ]);
  assert.deepEqual(parsed.searchParams.getAll("output[]"), ["email"]);
});
