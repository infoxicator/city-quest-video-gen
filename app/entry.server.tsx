import { PassThrough } from "node:stream";

import type {
  ActionFunctionArgs,
  AppLoadContext,
  EntryContext,
  LoaderFunctionArgs,
} from "react-router";
import { ServerRouter } from "react-router";
import { createReadableStreamFromReadable } from "@react-router/node";
import type { RenderToPipeableStreamOptions } from "react-dom/server";
import { renderToPipeableStream } from "react-dom/server";
import { isbot } from "isbot";

const STORY_SHARES_PATH = "/api/story-shares";
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const streamTimeout = 5_000;

const shouldHandleCors = (_request: Request, url: URL) => {
  return url.pathname === STORY_SHARES_PATH;
};

const createCorsResponse = (body: BodyInit | null, status: number) => {
  return new Response(body, {
    status,
    headers: new Headers(CORS_HEADERS),
  });
};

const withCorsHeaders = (response: Response) => {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  loadContext: AppLoadContext,
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    let userAgent = request.headers.get("user-agent");

    const readyOption: keyof RenderToPipeableStreamOptions =
      (userAgent && isbot(userAgent)) || routerContext.isSpaMode
        ? "onAllReady"
        : "onShellReady";

    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} />,
      {
        [readyOption]() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );

          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        },
      },
    );

    setTimeout(abort, streamTimeout + 1000);
  });
}

type DataArgs = LoaderFunctionArgs | ActionFunctionArgs;

export function handleDataRequest(
  response: Response,
  args: DataArgs,
): Response | Promise<Response> {
  const { request } = args;
  const url = new URL(request.url);
  if (!shouldHandleCors(request, url)) {
    return response;
  }

  if (request.method === "OPTIONS") {
    return createCorsResponse(null, 204);
  }

  return withCorsHeaders(response);
}
