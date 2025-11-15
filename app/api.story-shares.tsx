import { ActionFunction } from "react-router";
import { z } from "zod";
import { StoryResponse } from "./remotion/schemata";

const PayloadSchema = z.object({
  storyData: StoryResponse,
});

const SHARE_SERVICE_URL = "https://imageplustexttoimage.mcp-ui-flows-nanobanana.workers.dev/api/payloads";
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const action: ActionFunction = async (args) => {
  const { request } = args;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({
        type: "error",
        message: "Unsupported method",
      }),
      { status: 405, headers: CORS_HEADERS },
    );
  }

  try {
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

    return new Response(
      JSON.stringify({ type: "success", data: { id: json.id } }),
      {
        status: 200,
        headers: CORS_HEADERS,
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        type: "error",
        message: (error as Error).message,
      }),
      {
        status: 500,
        headers: CORS_HEADERS,
      },
    );
  }
};
