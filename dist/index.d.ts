import { Headers } from "node-fetch";
type AppendTool = "contact" | "demographic" | "b2cOnlineAudience" | "b2bOnlineAudience" | "firmographic" | "c2b" | "iptodomain" | "hemtobusinessdomain";
type ListgenTool = "abm";
type ListgenOutputTypes = Array<"abm_email" | "abm_online_audience">;
type DefaultAPIInput = Record<string, string | number>;
type ReachAppendResponse<TOutput = Record<string, string>, TInput = DefaultAPIInput> = {
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
type AppendAPIResponse<TInput = DefaultAPIInput, TOutput = Record<string, string>> = BaseAPIResponse<TInput> & {
    body: ReachAppendResponse<TInput, TOutput>;
    bodyRaw: string;
    matchFound: boolean;
};
type ListgenAPIResponse<TInput = Record<string, string | string[]>, TOutput = ReachListgenResponseRecord> = BaseAPIResponse<TInput> & {
    getRecords: () => AsyncGenerator<TOutput>;
};
type ReachClientOptions = {
    loggingFunction?: (...msgs: any[]) => void;
    queriesPerSecond?: number;
};
export default class ReachClient {
    private readonly apiKey;
    private readonly logger;
    version: number;
    maxRetries: number;
    queriesPerSecond: number;
    timeout: number;
    streamTimeout: number;
    waitTime: number;
    constructor(apiKey: string, { loggingFunction, queriesPerSecond }?: ReachClientOptions);
    /**
     * Method to query Versium REACH Append APIs.
     * See API docs for more info: https://api-documentation.versium.com/reference/welcome
     * @param dataTool
     * @param inputData
     * @param outputTypes
     */
    append(dataTool: AppendTool, inputData: Array<Record<string, any>>, outputTypes?: string[]): AsyncGenerator<AppendAPIResponse<DefaultAPIInput, Record<string, string>>[], void, unknown>;
    /**
     * Method to query Versium REACH Listgen APIs.
     * See API docs for more info: https://api-documentation.versium.com/reference/account-based-list-abm
     * @param dataTool
     * @param inputs
     * @param outputTypes
     */
    listgen(dataTool: ListgenTool, inputs: Record<string, string | string[]>, outputTypes: ListgenOutputTypes): Promise<ListgenAPIResponse>;
    protected log(...msgs: any[]): void;
    private processAppendRequests;
    private parseAppendResponse;
    private constructAPIURL;
}
export {};
