import { AbortError, Headers, Response } from "node-fetch";
import {
  chunkArray,
  fetchWithTimeout,
  invariant,
  streamChunksToLines,
  UnauthorizedError,
  waitTimer,
} from "./lib.js";

type AppendTool =
  | "contact"
  | "demographic"
  | "b2cOnlineAudience"
  | "b2bOnlineAudience"
  | "firmographic"
  | "c2b"
  | "iptodomain"
  | "hemtobusinessdomain";

type ListgenTool = "abm";

type ListgenOutputTypes = Array<"abm_email" | "abm_online_audience">;

type DefaultAPIInput = Record<string, string | number>;

type ReachAppendResponse<
  TOutput = Record<string, string>,
  TInput = DefaultAPIInput,
> = {
  versium: {
    version: "2.0";
    match_counts: number[];
    num_matches: number;
    num_results: number;
    query_id: string;
    query_time: number;
    results: TOutput[];
    input_query: TInput;
  };
};

type ReachListgenResponseRecord = {
  contact_fields: Record<string, string>;
};

type BaseAPIResponse<TInput = DefaultAPIInput> = {
  success: boolean;
  httpStatus: number;
  headers: Headers;
  inputs: TInput;
};

type AppendAPIResponse<
  TInput = DefaultAPIInput,
  TOutput = Record<string, string>,
> = BaseAPIResponse<TInput> & {
  body: ReachAppendResponse<TInput, TOutput>;
  bodyRaw: string;
  matchFound: boolean;
};

type AppendAPIErrorResponse = AppendAPIResponse & {
  body: undefined;
  requestError: Error;
};

type ListgenAPIResponse<
  TInput = Record<string, string | string[]>,
  TOutput = ReachListgenResponseRecord,
> = BaseAPIResponse<TInput> & {
  getRecords: () => AsyncGenerator<TOutput>;
};

type ReachClientOptions = {
  loggingFunction?: (...msgs: any[]) => void;
  queriesPerSecond?: number;
};

export default class ReachClient {
  private readonly apiKey: string;
  private readonly logger: undefined | ((...msgs: any[]) => void);
  private lastAppendChunkStartTime: number = 0;

  public version = 2; // API version
  public maxRetries = 3;
  public queriesPerSecond: number;
  public rateLimitPadTime: number = 100; // time to pad the rate limit timer, in milliseconds
  public timeout = 10000; // timeout for append queries, in milliseconds (set to Infinity for no timeout)
  public streamTimeout = 300000; // timeout for listgen queries, in milliseconds (set to Infinity for no timeout)
  public waitTime = 2000; // time to wait to retry failed requests, in milliseconds
  public verbose = false;

  constructor(
    apiKey: string,
    { loggingFunction, queriesPerSecond = 20 }: ReachClientOptions = {},
  ) {
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
  public async *append(
    dataTool: AppendTool,
    inputData: Array<Record<string, any>>,
    outputTypes: string[] = [],
  ) {
    if (!inputData?.length) {
      this.log("ReachClient.append: No input data was given.");
      yield [];
      return;
    }

    const inputChunks = chunkArray(inputData, this.queriesPerSecond);

    const timeSinceLastAppendChunkStart =
      Date.now() - this.lastAppendChunkStartTime;
    if (timeSinceLastAppendChunkStart < 1000 + this.rateLimitPadTime) {
      const waitTime =
        1000 + this.rateLimitPadTime - timeSinceLastAppendChunkStart;
      this.verboseLog(
        `Time since last append complete: ${timeSinceLastAppendChunkStart}ms\n`,
        `Waiting ${waitTime}ms before starting...`,
      );
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
        this.verboseLog(
          `Chunk ${i + 1} of ${inputChunks.length} processed in ${elapsed}ms`,
        );
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
  public async listgen(
    dataTool: ListgenTool,
    inputs: Record<string, string | string[]>,
    outputTypes: ListgenOutputTypes,
  ): Promise<ListgenAPIResponse> {
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
    } as ListgenAPIResponse;
  }

  protected log(...msgs: any[]) {
    if (this.logger) {
      this.logger(...msgs);
    }
  }

  protected verboseLog(...msgs: any[]) {
    if (this.verbose) {
      this.log(...msgs);
    }
  }

  private async processAppendRequests({
    inputChunk,
    dataTool,
    outputTypes = [],
    noTimer = false,
  }: {
    inputChunk: Record<string, any>[];
    dataTool: AppendTool;
    outputTypes?: string[];
    noTimer?: boolean;
  }): Promise<Array<AppendAPIResponse | AppendAPIErrorResponse>> {
    const headers = {
      Accept: "application/json",
      "x-versium-api-key": this.apiKey,
    };

    const requests = inputChunk.map((inputs) =>
      (async () => {
        let tries = 0;
        let response: Response;
        while (tries < this.maxRetries) {
          const lastTry = tries === this.maxRetries - 1;
          try {
            response = await fetchWithTimeout(
              this.constructAPIURL(dataTool, outputTypes, {
                ...inputs,
                ...(this.timeout === Infinity
                  ? {}
                  : {
                      // Signal to the API that we want the request to complete before our timeout setting.
                      // The API expects this value in seconds, not milliseconds.
                      rcfg_max_time: Math.max((this.timeout - 200) / 1000, 0.1),
                    }),
              }),
              {
                headers,
                timeout: this.timeout,
              },
            );

            if (response.status === 401) {
              throw new UnauthorizedError(
                "ReachClient received 401 unauthorized from the server. Check your API key.",
              );
            }

            if (response.ok) {
              return this.parseAppendResponse(response, inputs);
            }
            this.log(
              lastTry
                ? `Request failed (${response.status}), no retries remaining.`
                : `Request failed (${response.status}), retrying after ${this.waitTime}ms...`,
            );
          } catch (e) {
            if (e instanceof UnauthorizedError) {
              throw e;
            } else if (e instanceof AbortError) {
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
                } as AppendAPIErrorResponse;
              }
              this.log(
                `Request timed out, retrying after ${this.waitTime}ms...`,
              );
            } else {
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
                } as AppendAPIErrorResponse;
              }
              this.log(
                `Request error:\n`,
                e,
                `\nRetrying in ${this.waitTime}ms...`,
              );
            }
          }

          tries += 1;
          await waitTimer(this.waitTime);
        }

        invariant(response!);
        return this.parseAppendResponse(response, inputs);
      })(),
    );

    if (noTimer) {
      return Promise.all(requests);
    }

    const [_waitTimer, ...results] = await Promise.all([
      waitTimer(1000 + this.rateLimitPadTime),
      ...requests,
    ]);

    return results;
  }

  private async parseAppendResponse(
    response: Response,
    inputs: Record<string, any>,
  ): Promise<AppendAPIResponse> {
    const bodyRaw = await response.text();
    let body;
    try {
      body = JSON.parse(bodyRaw);
    } catch (e) {}

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

  private constructAPIURL(
    dataTool: string,
    outputTypes: string[],
    inputs: Record<string, any>,
  ) {
    const url = new URL(
      `https://api.versium.com/v${this.version}/${encodeURIComponent(
        dataTool,
      )}`,
    );

    Object.entries(inputs).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        key = key + "[]";
      }
      url.searchParams.append(key, value);
    });

    outputTypes.forEach((output) =>
      url.searchParams.append("output[]", output),
    );

    return url.toString();
  }
}
