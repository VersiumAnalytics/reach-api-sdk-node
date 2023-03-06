# Versium REACH API Software Development Kit (SDK) for Node.js

A simplified TypeScript-based interface for accessing [Versium Reach APIs](https://api-documentation.versium.com/docs/start-building-with-versium) via Node.js

## Installation
```shell
npm install @versium/reach-api-sdk-node
```

Supports Node.js v16+.

NOTE: This package is an ESM-only module - you are not able to import it with `require()`. See the [Node.js documentation](https://nodejs.org/api/esm.html#introduction) for more information on using ES modules.

## Usage
1. Import the ReachClient class:
    ```js
    import ReachClient from '@versium/reach-api-sdk-node';
    ```
2. Create a new client instance:
    ```js
    const client = new ReachClient('your-api-key');
    ```
3. For adding data to a set of inputs, use the `append` method. This method returns an `AsyncGenerator` that yields arrays containing API responses. Check the [API documentation](https://api-documentation.versium.com/docs/the-versium-api-landscape) for which data tools and output types are available.
    ```js
    const inputs = [
      {
        first: 'john',
        last: 'doe',
        address: '123 Trinity St',
        city: 'Redmond',
        state: 'WA',
        zip: '98052'
      }  
    ];
    
    for await (const results of client.append('contact', inputs, ['email', 'phone'])) {
      // filter out failed queries for processing later
      const failedResults = results.filter(result => !result.success);
      
      // merge successful matches with inputs
      results.forEach((result, idx) => {
        if (result.success && result.matchFound) {
          inputs[idx].appendResults = result.body.versium.results;
        }
      })
    }
    ```
4. For retrieving a list of records, use the `listgen` method. This function returns a promise that resolves to a response object with a `getRecords` function on it which returns an `AsyncGenerator` for iterating over records from the response stream. The `listgen` method will return as soon as data begins streaming in, and `getRecords` can be used to drain the stream until you have extracted all records from the response. Check the [API documentation](https://api-documentation.versium.com/docs/the-versium-api-landscape) for which data tools and output types are available.
   ```js
   const response = await client.listgen('abm', {domain: ['versium.com']}, ['abm_email', 'abm_online_audience']);
   
   if (response.success) {
       for await (const record of response.getRecords()) {
           console.log({record});
       }
   }
   ```

## Things to keep in mind
- The default rate limit is 20 queries per second
- You must have a provisioned API key for this function to work. If you are unsure where to find your API key, look at our [API key documentation](https://api-documentation.versium.com/docs/find-your-api-key)

## Contributing
For information on building and testing the library, see [CONTRIBUTING.md](CONTRIBUTING.md)