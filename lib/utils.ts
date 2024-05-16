import { webmasters_v3 } from "googleapis";

/**
 * Creates an array of chunks from the given array with a specified size.
 * @param arr The array to be chunked.
 * @param size The size of each chunk.
 * @returns An array of chunks.
 */
const createChunks = (arr: any[], size: number) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

/**
 * Executes tasks on items in batches and invokes a callback upon completion of each batch.
 * @param task The task function to be executed on each item.
 * @param items The array of items on which the task is to be executed.
 * @param batchSize The size of each batch.
 * @param onBatchComplete The callback function invoked upon completion of each batch.
 */
export async function batch(
  task: (url: string) => void,
  items: string[],
  batchSize: number,
  onBatchComplete: (batchIndex: number, batchCount: number) => void
) {
  const chunks = createChunks(items, batchSize);
  for (let i = 0; i < chunks.length; i++) {
    await Promise.all(chunks[i].map(task));
    onBatchComplete(i, chunks.length);
  }
}

/**
 * Fetches a resource from a URL with retry logic.
 * @param url The URL of the resource to fetch.
 * @param options The options for the fetch request.
 * @param retries The number of retry attempts (default is 5).
 * @returns A Promise resolving to the fetched response.
 * @throws Error when retries are exhausted or server error occurs.
 */
export async function fetchRetry(url: string, options: RequestInit, retries: number = 5) {
  try {
    const response = await fetch(url, options);
    if (response.status >= 500) {
      const body = await response.text();
      throw new Error(`Server error code ${response.status}\n${body}`);
    }
    return response;
  } catch (err) {
    if (retries <= 0) {
      throw err;
    }
    return fetchRetry(url, options, retries - 1);
  }
}

/**
 * Converts a given input string to a valid Google Search Console site URL format.
 * @param input - The input string to be converted.
 * @returns The converted site URL (domain.com or https://domain.com/)
 */
export function convertToSiteUrl(input: string) {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    return input.endsWith("/") ? input : `${input}/`;
  }
  return `sc-domain:${input}`;
}

/**
 * Converts a given file path to a formatted version suitable for use as a file name.
 * @param path - The url to be converted as a file name
 * @returns The converted file path
 */
export function convertToFilePath(path: string) {
  return path.replace("http://", "http_").replace("https://", "https_").replaceAll("/", "_");
}

/**
 * Converts an HTTP URL to a sc-domain URL format.
 * @param httpUrl The HTTP URL to be converted.
 * @returns The sc-domain formatted URL.
 */
export function convertToSCDomain(httpUrl: string) {
  return `sc-domain:${httpUrl.replace("http://", "").replace("https://", "").replace("/", "")}`;
}

/**
 * Converts a domain to an HTTP URL.
 * @param domain The domain to be converted.
 * @returns The HTTP URL.
 */
export function convertToHTTP(domain: string) {
  return `http://${domain}/`;
}

/**
 * Converts a domain to an HTTPS URL.
 * @param domain The domain to be converted.
 * @returns The HTTPS URL.
 */
export function convertToHTTPS(domain: string) {
  return `https://${domain}/`;
}