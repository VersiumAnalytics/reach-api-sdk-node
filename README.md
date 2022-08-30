# Using Versium REACH with NodeJS   
1. Clone the repo
2. Do `npm install axios` in order to have access to the axios library for API calls
3. Add `"type": "module"` to the nearest parent package.json file
4. Add  `import Reach from './Versium_REACH.js';`
5. Create a new instance of the `Reach` class with your API Key
6. Call the `append` function using the newly created instance of `Reach`
7. Don't forget to `await` the response from the `append` function
   
Make sure to check the comments in Versium_REACH.js for more information on the parameters of the `append` function   
   
## Things to keep in mind
- The default rate limit is 20 queries per second
- You must have a provisioned API key for this function to work. If you are unsure where to find your API key, look at our [API key documentation](https://api-documentation.versium.com/docs/find-your-api-key)   