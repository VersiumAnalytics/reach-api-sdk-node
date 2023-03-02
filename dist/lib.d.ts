/// <reference types="node" />
import { RequestInfo, RequestInit } from "node-fetch";
export declare function waitTimer(ms: number): Promise<unknown>;
export declare function invariant(condition: any): asserts condition;
export declare function chunkArray<T>(array: T[], chunkSize: number): T[][];
/**
 * Chunks a newline-delimited stream and yields each individual line for further processing.
 * @param stream
 * @private
 */
export declare function streamChunksToLines(stream: NodeJS.ReadableStream): AsyncGenerator<string, void, unknown>;
export declare function fetchWithTimeout(requestInfo: RequestInfo, requestInit: RequestInit & {
    timeout: number;
}): Promise<import("node-fetch").Response>;
export declare class UnauthorizedError extends Error {
    name: string;
}
