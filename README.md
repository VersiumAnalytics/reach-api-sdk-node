# Versium REACH API Software Development Kit (SDK) for Node.js

A simplified TypeScript-based interface for accessing [Versium Reach APIs](https://api-documentation.versium.com/docs/start-building-with-versium) via Node.js

> [!NOTE]
> This SDK does not yet support the Versium [Bulk APIs](https://api-documentation.versium.com/page/bulk-api). If you are interested in using the SDK for operating the Bulk APIs, please reach out to [api-support@versium.com](mailto:api-support@versium.com)

## Installation

```shell
npm install @versium/reach-api-sdk-node
```

Supports Node.js v16+.

> [!NOTE]
> This package is an ESM-only module - you are not able to import it with `require()`. See the [Node.js documentation](https://nodejs.org/api/esm.html#introduction) for more information on using ES modules.

## Usage

### 1. Import the ReachClient class:

```js
import ReachClient from "@versium/reach-api-sdk-node";
```

### 2. Create a new client instance:

```js
const client = new ReachClient("your-api-key");
```

### Appending Data

For adding data to a set of inputs, use the `append` method. Check the [API documentation](https://api-documentation.versium.com/docs/the-versium-api-landscape) for which data tools and output types are available.

> [!IMPORTANT]
> This method returns an [`AsyncGenerator`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncGenerator) that yields arrays containing API responses, you must iterate over the generator to get the response arrays, then iterate over the response arrays to get the results.

```js
const inputs = [
  {
    first: "john",
    last: "doe",
    address: "123 Trinity St",
    city: "Redmond",
    state: "WA",
    zip: "98052",
  },
];

// iterate over the AsyncGenerator to get the response arrays, note the 'for await' syntax here
for await (const results of client.append("contact", inputs, {
  outputTypes: ["email", "phone"],
  additionalParams: {
    // any request-level params supported by Versium APIs
    cfg_max_emails: 3,
  },
})) {
  // filter out failed queries for processing later
  const failedResults = results.filter((result) => !result.success);

  // iterate over the response array to get the results
  results.forEach((result, idx) => {
    if (result.success && result.matchFound) {
      // merge successful matches with inputs
      inputs[idx].appendResults = result.body.versium.results;
    }
  });
}
```

#### Legacy (deprecated): pass an array of output types

Prior to v1.1.0 the third argument was an array of output types. This form still works for backward compatibility but is deprecated—please migrate to the options object shown above.

```js
for await (const results of client.append("contact", inputs, [
  "email",
  "phone",
])) {
  // ...
}
```

> [!NOTE]
> You can also include parameters inside individual input records when you need per-record settings, e.g. `const inputs = [{ first: "john", last: "doe", cfg_max_emails: 1 }, { first: "jane", last: "doe", cfg_max_emails: 5 }]`. If a parameter exists both in an input record and in `additionalParams`, the value from the input record takes precedence.

### List Generation

For retrieving a list of records, use the `listgen` method. This function returns a promise that resolves to a response object with a `getRecords` function on it which returns an [`AsyncGenerator`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncGenerator) for iterating over records from the response stream. The `listgen` method will return as soon as data begins streaming in, and `getRecords` can be used to drain the stream until you have extracted all records from the response. Check the [API documentation](https://api-documentation.versium.com/docs/the-versium-api-landscape) for which data tools and output types are available.

```js
const response = await client.listgen("abm", { domain: ["versium.com"] }, [
  "abm_email",
  "abm_online_audience",
]);

if (response.success) {
  // getRecords returns an AsyncGenerator, so here we use the 'for await' syntax to iterate over the results
  for await (const record of response.getRecords()) {
    console.log({ record });
  }
}
```

## Things to keep in mind

- The default rate limit is 20 queries per second
- You must have a provisioned API key for this function to work. If you are unsure where to find your API key, look at our [API key documentation](https://api-documentation.versium.com/docs/find-your-api-key)

## Contributing

For information on building and testing the library, see [CONTRIBUTING.md](CONTRIBUTING.md)
