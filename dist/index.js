import { AbortError, Headers } from "node-fetch";
import { chunkArray, fetchWithTimeout, invariant, streamChunksToLines, UnauthorizedError, waitTimer, } from "./lib.js";
export default class ReachClient {
    constructor(apiKey, { loggingFunction, queriesPerSecond = 20 } = {}) {
        this.lastAppendChunkStartTime = 0;
        this.version = 2; // API version
        this.maxRetries = 3;
        this.rateLimitPadTime = 100; // time to pad the rate limit timer, in milliseconds
        this.timeout = 10000; // timeout for append queries, in milliseconds (set to Infinity for no timeout)
        this.streamTimeout = 300000; // timeout for listgen queries, in milliseconds (set to Infinity for no timeout)
        this.waitTime = 2000; // time to wait to retry failed requests, in milliseconds
        this.verbose = false;
        this.apiKey = apiKey;
        this.logger = loggingFunction;
        this.queriesPerSecond = queriesPerSecond;
    }
    /**
     * Method to query Versium REACH Append APIs.
     * See API docs for more info: https://api-documentation.versium.com/reference/welcome
     * @param dataTool
     * @param inputData
     * @param outputTypes
     */
    async *append(dataTool, inputData, outputTypes = []) {
        if (!inputData?.length) {
            this.log("ReachClient.append: No input data was given.");
            yield [];
            return;
        }
        const inputChunks = chunkArray(inputData, this.queriesPerSecond);
        const timeSinceLastAppendChunkStart = Date.now() - this.lastAppendChunkStartTime;
        if (timeSinceLastAppendChunkStart < 1000 + this.rateLimitPadTime) {
            const waitTime = 1000 + this.rateLimitPadTime - timeSinceLastAppendChunkStart;
            this.verboseLog(`Time since last append complete: ${timeSinceLastAppendChunkStart}ms\n`, `Waiting ${waitTime}ms before starting...`);
            await waitTimer(waitTime);
        }
        for (let i = 0; i < inputChunks.length; i += 1) {
            const inputChunk = inputChunks[i];
            let startTime = 0;
            if (this.verbose) {
                startTime = Date.now();
            }
            this.verboseLog(`Processing chunk ${i + 1} of ${inputChunks.length}...`);
            this.lastAppendChunkStartTime = Date.now();
            yield await this.processAppendRequests({
                inputChunk,
                dataTool,
                outputTypes,
                noTimer: i === inputChunks.length - 1,
            });
            if (this.verbose) {
                const elapsed = Date.now() - startTime;
                this.verboseLog(`Chunk ${i + 1} of ${inputChunks.length} processed in ${elapsed}ms`);
            }
        }
    }
    /**
     * Method to query Versium REACH Listgen APIs.
     * See API docs for more info: https://api-documentation.versium.com/reference/account-based-list-abm
     * @param dataTool
     * @param inputs
     * @param outputTypes
     */
    async listgen(dataTool, inputs, outputTypes) {
        const url = this.constructAPIURL(dataTool, outputTypes, inputs);
        const response = await fetchWithTimeout(url, {
            headers: {
                "x-versium-api-key": this.apiKey,
            },
            timeout: this.streamTimeout,
        });
        return {
            success: response.ok,
            httpStatus: response.status,
            headers: response.headers,
            inputs,
            async *getRecords() {
                if (!response.body) {
                    return null;
                }
                for await (const line of streamChunksToLines(response.body)) {
                    yield JSON.parse(line);
                }
            },
        };
    }
    log(...msgs) {
        if (this.logger) {
            this.logger(...msgs);
        }
    }
    verboseLog(...msgs) {
        if (this.verbose) {
            this.log(...msgs);
        }
    }
    async processAppendRequests({ inputChunk, dataTool, outputTypes = [], noTimer = false, }) {
        const headers = {
            Accept: "application/json",
            "x-versium-api-key": this.apiKey,
        };
        const requests = inputChunk.map((inputs) => (async () => {
            let tries = 0;
            let response;
            while (tries < this.maxRetries) {
                const lastTry = tries === this.maxRetries - 1;
                try {
                    response = await fetchWithTimeout(this.constructAPIURL(dataTool, outputTypes, {
                        ...inputs,
                        ...(this.timeout === Infinity
                            ? {}
                            : {
                                // Signal to the API that we want the request to complete before our timeout setting.
                                // The API expects this value in seconds, not milliseconds.
                                rcfg_max_time: Math.max((this.timeout - 200) / 1000, 0.1),
                            }),
                    }), {
                        headers,
                        timeout: this.timeout,
                    });
                    if (response.status === 401) {
                        throw new UnauthorizedError("ReachClient received 401 unauthorized from the server. Check your API key.");
                    }
                    if (response.ok) {
                        return this.parseAppendResponse(response, inputs);
                    }
                    this.log(lastTry
                        ? `Request failed (${response.status}), no retries remaining.`
                        : `Request failed (${response.status}), retrying after ${this.waitTime}ms...`);
                }
                catch (e) {
                    if (e instanceof UnauthorizedError) {
                        throw e;
                    }
                    else if (e instanceof AbortError) {
                        if (lastTry) {
                            this.log("Request timed out, no retries remaining.");
                            return {
                                success: false,
                                error: e,
                                httpStatus: 0,
                                headers: new Headers(),
                                body: {},
                                bodyRaw: "",
                                matchFound: false,
                                inputs,
                            };
                        }
                        this.log(`Request timed out, retrying after ${this.waitTime}ms...`);
                    }
                    else {
                        if (lastTry) {
                            this.log(`Request error:\n`, e, `\nNo retries remaining.`);
                            return {
                                success: false,
                                error: e,
                                httpStatus: 0,
                                headers: new Headers(),
                                body: {},
                                bodyRaw: "",
                                matchFound: false,
                                inputs,
                            };
                        }
                        this.log(`Request error:\n`, e, `\nRetrying in ${this.waitTime}ms...`);
                    }
                }
                tries += 1;
                await waitTimer(this.waitTime);
            }
            invariant(response);
            return this.parseAppendResponse(response, inputs);
        })());
        if (noTimer) {
            return Promise.all(requests);
        }
        const [_waitTimer, ...results] = await Promise.all([
            waitTimer(1000 + this.rateLimitPadTime),
            ...requests,
        ]);
        return results;
    }
    async parseAppendResponse(response, inputs) {
        const bodyRaw = await response.text();
        let body;
        try {
            body = JSON.parse(bodyRaw);
        }
        catch (e) { }
        return {
            success: response.ok,
            httpStatus: response.status,
            headers: response.headers,
            body,
            bodyRaw,
            matchFound: Boolean(body?.versium?.num_matches),
            inputs,
        };
    }
    constructAPIURL(dataTool, outputTypes, inputs) {
        const url = new URL(`https://api.versium.com/v${this.version}/${encodeURIComponent(dataTool)}`);
        Object.entries(inputs).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                key = key + "[]";
            }
            url.searchParams.append(key, value);
        });
        outputTypes.forEach((output) => url.searchParams.append("output[]", output));
        return url.toString();
    }
}
