# Working on the SDK Itself

## Getting Started

1. Clone the repo
2. Run `npm install`

## Building

During development, you can run `npm start` to start the TypeScript compiler in watch mode.

## Testing

We use Node's built-in test runner ([node:test](https://nodejs.org/api/test.html)) with the Node assert library.

- Unit tests run without network access or credentials.
- Integration tests exercise the live Versium REACH API and require an API key.

How to run tests:

- Run all tests (builds TS first):

  ```sh
  npm test
  ```

  - If `REACH_KEY` is not set, integration tests are automatically skipped.
  - To include integration tests, provide your API key:
    ```sh
    REACH_KEY="your-api-key" npm test
    ```

- Run a single test file (optional):
  ```sh
  npm run build && node --test test/reachClient.unit.test.js
  # or
  npm run build && node --test test/reachClient.integration.test.js
  ```

Notes:

- The test script compiles TypeScript to `dist/` before running tests because tests import the built output.
- You'll need Node.js 18+ (or newer) to use the built-in test runner.
