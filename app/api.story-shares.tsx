import { ActionFunction, ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { errorAsJson } from "./lib/return-error-as-json";
import { StoryResponse } from "./remotion/schemata";

const PayloadSchema = z.object({
  storyData: StoryResponse,
});

const SHARE_SERVICE_URL = "https://imageplustexttoimage.mcp-ui-flows-nanobanana.workers.dev/api/payloads";
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const handlePost = errorAsJson(async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    throw new Error("Unsupported method");
  }

  const body = await request.json();
  const { storyData } = PayloadSchema.parse(body);
  const response = await fetch(SHARE_SERVICE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(storyData),
  });

  if (!response.ok) {
    throw new Error(`Share service error: ${response.status}`);
  }

  const json = (await response.json()) as { id?: string };
  if (!json?.id) {
    throw new Error("Share service did not return a share id.");
  }

  return { id: json.id };
});

export const action: ActionFunction = async (args) => {
  const { request } = args;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const response = await handlePost(args);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }

  return response;
};
