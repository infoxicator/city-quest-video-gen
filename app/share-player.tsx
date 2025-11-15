import { Player } from "@remotion/player";
import { type FC } from "react";
import {
  DURATION_IN_FRAMES,
  COMPOSITION_FPS,
  COMPOSITION_HEIGHT,
  COMPOSITION_WIDTH,
} from "./remotion/constants.mjs";
import "./app.css";
import { z } from "zod";
import { Main } from "./remotion/components/Main";
import { StoryResponse } from "./remotion/schemata";
import type { StoryData } from "./remotion/types";
import { themes } from "~/features/news-generator/themes";
import { Loading } from "./components/Loading";

interface SuccessLoaderData {
  status: "success";
  storyData: z.infer<typeof StoryResponse>;
  shareUrl: string;
  shareId: string;
}

interface ErrorLoaderData {
  status: "error";
  message: string;
  shareUrl: string;
}

type LoaderData = SuccessLoaderData | ErrorLoaderData;

export async function clientLoader({ params, request }: { params: { shareId?: string }; request: Request }) {
  const shareId = params.shareId;
  const currentUrl = new URL(request.url);

  if (!shareId) {
    return {
      status: "error",
      message: "Missing share identifier.",
      shareUrl: currentUrl.origin,
    } satisfies LoaderData;
  }

  try {
    const res = await fetch(`https://imageplustexttoimage.mcp-ui-flows-nanobanana.workers.dev/api/payloads/${shareId}`);
    if (!res.ok) {
      const message = res.status === 404 ? "We couldn't find that adventure." : "Unable to load shared story.";
      return {
        status: "error",
        message,
        shareUrl: `${currentUrl.origin}/share/${shareId}`,
      } satisfies LoaderData;
    }
    const json = await res.json();
    if (json?.type === "error") {
      return {
        status: "error",
        message: typeof json.message === "string" ? json.message : "Unable to load shared story.",
        shareUrl: `${currentUrl.origin}/share/${shareId}`,
      } satisfies LoaderData;
    }

    const payload = json?.payload;
    const storyPayload = payload?.storyData ?? payload;
    const parsed = StoryResponse.safeParse(storyPayload);
    if (!parsed.success) {
      return {
        status: "error",
        message: "Shared story data is corrupted.",
        shareUrl: `${currentUrl.origin}/share/${shareId}`,
      } satisfies LoaderData;
    }

    return {
      status: "success",
      storyData: parsed.data,
      shareId,
      shareUrl: `${currentUrl.origin}/share/${shareId}`,
    } satisfies LoaderData;
  } catch (error) {
    console.error("Failed to load shared story", error);
    return {
      status: "error",
      message: "Something glitched while loading this adventure.",
      shareUrl: `${currentUrl.origin}/share/${shareId}`,
    } satisfies LoaderData;
  }
}

export function HydrateFallback() {
  return (
    <div className="city-quest-body min-h-screen text-white pb-16">
      <div className="max-w-screen-lg m-auto px-6 md:px-10 pt-20">
        <div className="mx-auto w-full max-w-[360px]">
          <div className="relative overflow-hidden rounded-[28px] mb-12 mt-8 border border-[#fbbf24] shadow-[0_45px_140px_rgba(217,119,6,0.55),0_0_40px_rgba(255,215,0,0.2)] aspect-[9/16] portrait-frame">
            <div className="absolute inset-0 bg-gradient-to-br from-[#3b0764] via-[#7c2d12] to-[#0c0a09]" aria-hidden />
            <div className="absolute -inset-8 bg-[radial-gradient(circle_at_top,rgba(255,215,0,0.3)_0%,rgba(217,119,6,0)_65%)] opacity-30" aria-hidden />
            <div className="relative flex h-full w-full items-center justify-center">
              <Loading
                compact
                title="Loading shared adventure…"
                subtitle="✨ Preparing your quest..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SharedAdventure({ loaderData }: { loaderData: LoaderData }) {
  if (loaderData.status === "error") {
    return (
      <div className="city-quest-body min-h-screen text-white pb-16">
        <div className="max-w-screen-md m-auto px-6 md:px-10 pt-24">
          <div className="mx-auto max-w-md rounded-[28px] border border-[#fbbf24] bg-[#78350f] px-6 py-8 shadow-[0_0_45px_rgba(251,191,36,0.35),0_0_15px_rgba(255,215,0,0.2)]">
            <h1 className="city-quest-headline text-2xl text-white">Adventure missing</h1>
            <p className="mt-4 text-sm text-[#fef3c7]">{loaderData.message}</p>
          </div>
        </div>
      </div>
    );
  }

  const rawStory = loaderData.storyData as (StoryData | undefined);
  if (!rawStory) {
    throw new Error("Missing story data for share view");
  }

  const inputProps: StoryData = rawStory.theme ? rawStory : { ...rawStory, theme: themes.cityQuest.video };

  return (
    <div className="city-quest-body min-h-screen text-white pb-16">
      <div className="max-w-screen-lg m-auto px-6 md:px-10 pt-20">
        <div className="mx-auto w-full max-w-[360px]">
          <div className="overflow-hidden rounded-[28px] shadow-[0_35px_110px_rgba(0,0,0,0.6),0_0_30px_rgba(255,215,0,0.15)] border border-[#92400e] mb-12 mt-8 aspect-[9/16] portrait-frame">
            <Player
              component={Main}
              inputProps={inputProps}
              durationInFrames={DURATION_IN_FRAMES}
              fps={COMPOSITION_FPS}
              compositionHeight={COMPOSITION_HEIGHT}
              compositionWidth={COMPOSITION_WIDTH}
              style={{ width: "100%", height: "100%" }}
              controls
              autoPlay
              loop
            />
          </div>
        </div>
      </div>
    </div>
  );
}
