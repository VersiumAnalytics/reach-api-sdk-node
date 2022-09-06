import axios from "axios";

class ReachAPI {
    #apiKey;
    verbose;
    waitTime;

    /**
     * 
     * @param {string} apiKey
     * @param {boolean} [verbose=false] 
     * set to "true" to log extra debugging/error information
     * @param {number} [waitTime=3000] 
     * waitTime is the amount of milliseconds that the program execution will pause for before retrying
     * requests that had a 429 or 500 response. The program will not pause if there were none of these responses
     */
    constructor(apiKey, verbose = false, waitTime = 3000) {
        this.#apiKey = apiKey;
        this.verbose = verbose;
        this.waitTime = waitTime;
    }

    /**
     * This function should be used to effectively query Versium REACH APIs. See our API Documentation for more information
     * https://api-documentation.versium.com/reference/welcome
     *
     * @param  {string} dataTool
     * @param  {Record<string, any>[]}  inputData
     * inputData is an array of objects where the keys are the headers and the values are the values corresponding to each header
     * ex. inputData = [{first: "someFirstName", last: "someLastName", email: "someEmailAddress"}];
     * @param  {string[]}  [outputTypes=[]]
     * This array should contain a list of strings where each string is a desired output type. This parameter is optional if the API you are using does not require output types
     * ex. [] or ["email", "phone"]
     * @return {Promise<Record<string, any>[]>}
     * When the promise resolves, it will be an array of objects
     */
    async append(dataTool, inputData, outputTypes = []) {
        const start = Date.now();
        const axiosRequests = Array(inputData.length).fill("");
        const outputParams = outputTypes.length > 0 ? new URLSearchParams() : null;
        if (outputTypes.length > 0) {
            outputTypes.forEach(outputType => {
                outputParams.append("output[]", `${outputType}`);
            });
        }

        if (inputData.length > 0) {
            inputData.forEach((row, index) => {
                const inputParams = new URLSearchParams();
                if (outputParams) {
                    outputParams.forEach((value, key) => {
                        inputParams.append(key, value);
                    });  
                }
                const inputParamNames = Object.keys(row);
                const inputParamValues = Object.values(row);
               for (let i = 0; i < inputParamNames.length; i++) {
                inputParams.append(inputParamNames[i], inputParamValues[i]);
               }
                const options = {
                    url: `https://api.versium.com/v2/${dataTool}?`,
                    headers: {
                        "Accept": "application/json",
                        "x-versium-api-key": this.#apiKey,
                    },
                    params: inputParams
                };
                
                axiosRequests[index] = options;
            });
        } else {
            throw new Error("No input data was entered");
        }

        const batchSize = 3; //max batchSize to avoid running into the rate limit
        let [results, retryRequests] = await this.#sendHttpRequests({axiosRequests, batchSize, firstAttempt: true});
        if (retryRequests.length > 0) { //retry urls that failed with 429 or 500 status response on the first attempt
            await this.#shortSleep(this.waitTime);
            const retryResults = (await this.#sendHttpRequests({retryRequests, batchSize, firstAttempt: false})).results;
            results = results.concat(retryResults);
        }
        
        const end = Date.now();
        if (this.verbose) {
            console.log(JSON.stringify(results));
            console.log("Total Results Returned: " + results.length);
            console.log(`Time Taken to Execute: ${(end - start)/1000} seconds`); 
        }
        
        return results;
    }

    async #sendHttpRequests({axiosRequests, batchSize, firstAttempt}) {
    // async #sendHttpRequests(urls, options, batchSize, firstAttempt, retryUrls = null) {
        let curReq = 0;
        let httpErr429Count = 0;
        let httpErr500Count = 0;
        let results = [];
        let retryRequests = [];
        while (curReq < axiosRequests.length) {
            const end = axiosRequests.length < curReq + batchSize ? axiosRequests.length : curReq + batchSize;
            const concurrentReq = [];
            for (let index = curReq; index < end; index++) {
                try {
                concurrentReq.push(await axios(axiosRequests[curReq]));
                concurrentReq[concurrentReq.length - 1] = concurrentReq[concurrentReq.length - 1].data.versium.results;
                } catch (err) {
                    if (firstAttempt && (err.response.status == 429 || err.response.status == 500)) {
                        retryRequests.push(axiosRequests[curReq]);
                        if (err.response.status == 429) {
                            httpErr429Count++;
                        } else if (err.response.status == 500) {
                            httpErr500Count++;
                        }
                    }
                    if (this.verbose) {
                        console.log(err);
                    }
                }
                if (this.verbose) {
                    if (firstAttempt) {
                        console.log(`sending request ${curReq}...`);
                    } else {
                        console.log(`sending retry request ${curReq}...`);
                    }
                }
                curReq++;
            }
            const batchResp = await Promise.all(concurrentReq);
            results = [...results, ...batchResp];       
            if (this.verbose) {
                if (curReq == axiosRequests.length && (curReq % batchSize != 0)) { //happens at the end of the last batch
                    if (curReq < batchSize) {
                        console.log(`requests 0-${curReq - 1} done.`);
                    } else if ((curReq - 1) % batchSize == 0) {
                        console.log(`requests ${curReq - batchSize + 2}-${curReq - 1} done.`);
                    } else {
                        console.log(`requests ${curReq - batchSize + 1}-${curReq - 1} done.`);
                    }
                } else {
                    console.log(`requests ${curReq - batchSize}-${curReq - 1} done.`);
                }
            }
        }
        results = results.filter((result) => result != null);

        if (firstAttempt && this.verbose) {
            console.log("Successful Requests Made: " + results.length);
            if (httpErr429Count > 0) {
                console.log("There were " + httpErr429Count + " requests with a 429 http status code");
            } else if (httpErr500Count > 0) {
                console.log("There were " + httpErr500Count + " requests with a 500 http status code");
            }
        } else if (!firstAttempt && this.verbose) {
            console.log(`There were ${axiosRequests.length ? axiosRequests.length : 0} requests that were retried`);
            console.log(`There were ${results.length} requests that retried successfully`);
        }

        return [results, retryRequests];
    }

    //sleeps the function execution temporarily
    #shortSleep(milliseconds) {
        return new Promise(resolve => setTimeout(resolve, milliseconds)); 
    }
}

export default ReachAPI;