# Working on the SDK Itself

## Getting Started
1. Clone the repo
2. Run `npm install`

## Building
During development, you can run `npm start` to start the TypeScript compiler in watch mode.

## Testing
There is currently no formal testing framework in place. We simply run a regular JS file with Node that contains assertions using the [built-in Node.js assert library](https://nodejs.org/api/assert.html).
You'll need to provide an API key as an environment variable named `REACH_KEY` in order to run the tests:

```shell
REACH_KEY="your-api-key" npm test
```