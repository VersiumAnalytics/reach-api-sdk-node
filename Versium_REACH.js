import axios from "axios";

class Reach {
    #apiKey;
    verbose;
    waitTime;

    /**
     * 
     * @param string apiKey 
     * @param boolean verbose 
     * set to "true" to log extra debugging/error information
     * @param int waitTime 
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
     * @param  string dataTool
     * @param  array  $inputData
     * inputData is an array of objects where the keys are the headers and the values are the values corresponding to each header
     * ex. inputData = [{first: "someFirstName", last: "someLastName", email: "someEmailAddress"}];
     * @param  array  outputTypes
     * This array should contain a list of strings where each string is a desired output type. This parameter is optional if the API you are using does not require output types
     * ex. [] or ["email", "phone"]
     * @return Promise
     * When the promise resolves, it will be an array of objects
     */
    async append(dataTool, inputData, outputTypes = []) {
        const start = new Date();
        let baseURL = `https://api.versium.com/v2/${dataTool}?`;
        const urls = Array(inputData.length).fill("");
        if (outputTypes.length > 0) {
            outputTypes.forEach(outputType => {
                baseURL += `output[]=${outputType}&`;
            });
        }
        const options = {
            headers: {
                "Accept": "application/json",
                "x-versium-api-key": this.#apiKey,
            }
        };
        if (inputData.length > 0) {
            inputData.forEach((row, index) => {
                const inputParams = new URLSearchParams(row).toString();
                urls[index] = baseURL + inputParams;
            });
        } else {
            throw Error("No input data was entered");
        }

        const retryUrls = { retry: [] };
        const batchSize = 3; //max batchSize to avoid running into the rate limit
        let results = await this.#sendHttpRequests(urls, options, batchSize, true, retryUrls)
        if (retryUrls.retry.length > 0) { //retry urls that failed with 429 or 500 status response on the first attempt
            await this.#shortSleep(this.waitTime);
            results = results.concat(await this.#sendHttpRequests(retryUrls.retry, options, batchSize, false));
        }
        
        const end = new Date();
        if (this.verbose) {
            console.log(JSON.stringify(results));
            console.log("Total Results Returned: " + results.length);
            console.log(`Time Taken to Execute: ${(end - start)/1000} seconds`); 
        }
        
        return results;
    }

    async #sendHttpRequests(urls, options, batchSize, firstAttempt, retryUrls = null) {
        let curReq = 0;
        let httpErr429Count = 0;
        let httpErr500Count = 0;
        let results = [];
        while (curReq < urls.length) {
            const end = urls.length < curReq + batchSize ? urls.length : curReq + batchSize;
            const concurrentReq = new Array();
            for (let index = curReq; index < end; index++) {
                concurrentReq.push(axios.get(urls[curReq], options)
                .then((response) => response.data.versium.results)
                .catch((err) => {
                    if (firstAttempt && (err.response.status == 429 || err.response.status == 500)) {
                        retryUrls.retry.push(urls[curReq]);
                        if (err.response.status == 429) {
                            httpErr429Count++;
                        } else if (err.response.status == 500) {
                            httpErr500Count++;
                        }
                    }
                    if (this.verbose) {
                        console.log(err);
                    }
                }));
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
            batchResp.forEach((resp) => {
                results = [...results, resp];
            });       
            if (this.verbose) {
                if (curReq == urls.length && (curReq % batchSize != 0)) { //happens at the end of the last batch
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
            console.log(`There were ${urls.length ? urls.length : 0} requests that were retried`);
            console.log(`There were ${results.length} requests that retried successfully`);
        }

        return results;
    }

    //sleeps the function execution temporarily
    #shortSleep(milliseconds) {
        return new Promise(resolve => setTimeout(resolve, milliseconds)); 
    }
}

export default Reach;