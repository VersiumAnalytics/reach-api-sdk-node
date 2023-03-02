import fetch from "node-fetch";
import { clearTimeout } from "timers";
export function waitTimer(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export function invariant(condition) {
    if (condition) {
        return;
    }
    if (process.env.NODE_ENV === "production") {
        throw new Error("Invariant failed");
    }
}
export function chunkArray(array, chunkSize) {
    let chunked = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunked.push(array.slice(i, i + chunkSize));
    }
    return chunked;
}
/**
 * Chunks a newline-delimited stream and yields each individual line for further processing.
 * @param stream
 * @private
 */
export async function* streamChunksToLines(stream) {
    let previous = "";
    for await (const chunk of stream) {
        let startSearch = previous.length;
        previous += chunk;
        while (true) {
            const eolIndex = previous.indexOf("\n", startSearch);
            if (eolIndex < 0) {
                break;
            }
            const line = previous.slice(0, eolIndex + 1);
            yield line;
            previous = previous.slice(eolIndex + 1);
            startSearch = 0;
        }
    }
    if (previous.length > 0) {
        yield previous;
    }
}
export async function fetchWithTimeout(requestInfo, requestInit) {
    const { timeout, ...init } = requestInit;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(requestInfo, {
        ...init,
        signal: controller.signal,
    });
    clearTimeout(id);
    return response;
}
export class UnauthorizedError extends Error {
    constructor() {
        super(...arguments);
        this.name = "UnauthorizedError";
    }
}
