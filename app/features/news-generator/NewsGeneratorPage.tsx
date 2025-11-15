import { Player } from "@remotion/player";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Main } from "~/remotion/components/Main";
import { RenderControls } from "~/components/RenderControls";
import { Spacing } from "~/components/Spacing";
import { StoryResponse } from "~/remotion/schemata";
import { Loading } from "~/components/Loading";
import { Input } from "~/components/Input";
import { Button } from "~/components/Button";
import { ImageUpload, type ImageUploadHandle } from "~/components/ImageUpload";
import { Spinner } from "~/components/Spinner";
import {
  COMPOSITION_FPS,
  COMPOSITION_HEIGHT,
  COMPOSITION_WIDTH,
  DURATION_IN_FRAMES,
} from "~/remotion/constants.mjs";
import type { GeneratorLoaderData, NewsGeneratorTheme } from "./types";
import type { VideoThemeSettings } from "~/remotion/types";
import { cn } from "~/lib/utils";

export const createHydrateFallback = (theme: NewsGeneratorTheme) => {
  function HydrateFallback() {
    return (
      <div className={theme.pageClassName}>
        <div className="max-w-screen-lg m-auto px-6 md:px-10 pt-20">
          <div className="mx-auto w-full max-w-[360px]">
            <div className={cn("relative overflow-hidden rounded-[28px] mb-12 mt-8 aspect-[9/16]", theme.loaderFrameClassName)}>
              <div className={cn("absolute inset-0", theme.loaderBackgroundClassName)} aria-hidden />
              <div className={cn("absolute -inset-8 opacity-30", theme.loaderHighlightClassName)} aria-hidden />
              <div className="relative flex h-full w-full items-center justify-center">
                <Loading compact title="Rendering video…" subtitle={theme.copy.loaderSubtitle} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return HydrateFallback;
};

type HydratedStoryData = (z.infer<typeof StoryResponse> & { theme: VideoThemeSettings }) | undefined;

export const useGeneratorInputProps = (storyData: HydratedStoryData) => {
  return useMemo(() => storyData, [storyData]);
};

type GeneratorProps = {
  loaderData: GeneratorLoaderData;
  theme: NewsGeneratorTheme;
};

export const NewsGeneratorPage: React.FC<GeneratorProps> = ({ loaderData, theme }) => {
  const [pending, setPending] = useState(false);
  const [nameInput, setNameInput] = useState(loaderData.name ?? "");
  const [companyInput, setCompanyInput] = useState(loaderData.company ?? "");
  const [promptInput, setPromptInput] = useState("");
  const [showNerdSection, setShowNerdSection] = useState(false);

  const [storyData, setStoryData] = useState<HydratedStoryData>(
    loaderData.storyData ? { ...loaderData.storyData, theme: theme.video } : undefined,
  );
  const [selectedProfileFile, setSelectedProfileFile] = useState<File | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(loaderData.profilePic ?? null);
  const [profileUrlInput, setProfileUrlInput] = useState(loaderData.profilePic ?? "");
  const [imageMode, setImageMode] = useState<"upload" | "url">(() => {
    const incoming = loaderData.profilePic ?? "";
    return incoming && incoming.startsWith("http") ? "url" : "upload";
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const imageUploadRef = useRef<ImageUploadHandle | null>(null);

  const inputProps = useGeneratorInputProps(storyData);

  useEffect(() => {
    setNameInput(loaderData.name ?? "");
    setSelectedProfileFile(null);
    const incomingPic = loaderData.profilePic ?? null;
    const nextMode = incomingPic && incomingPic.startsWith("http") ? "url" : incomingPic ? "upload" : "upload";
    setImageMode(nextMode);
    setProfileImageUrl(nextMode === "upload" ? incomingPic : null);
    setProfileUrlInput(incomingPic ?? "");
    setCompanyInput(loaderData.company ?? "");
    setStoryData(loaderData.storyData ? { ...loaderData.storyData, theme: theme.video } : undefined);
    setPromptInput("");
    setError(null);
    setUploadingImage(false);
    setPending(false);
  }, [loaderData.name, loaderData.profilePic, loaderData.company, loaderData.storyData]);

  useEffect(() => {
    if (!pending && inputProps) {
      playerContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [pending, inputProps]);

  const handleImageModeChange = (
    mode: "upload" | "url",
    options: { openDialog?: boolean } = {},
  ) => {
    if (mode === imageMode) {
      if (mode === "upload" && options.openDialog) {
        imageUploadRef.current?.openFileDialog();
      }
      return;
    }
    setImageMode(mode);
    setError(null);
    if (mode === "upload") {
      setProfileImageUrl(null);
    } else {
      setSelectedProfileFile(null);
      setProfileImageUrl(null);
      setUploadingImage(false);
    }

    if (mode === "upload" && options.openDialog) {
      setTimeout(() => {
        imageUploadRef.current?.openFileDialog();
      }, 0);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (playerContainerRef.current) {
      playerContainerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    const trimmedName = nameInput.trim();
    const trimmedCompany = companyInput.trim();
    const trimmedPrompt = promptInput.trim();
    if (!trimmedName || !trimmedCompany) {
      setError(theme.copy.missingNameCompanyError);
      return;
    }
    if (uploadingImage) {
      setError(theme.copy.uploadInProgressError);
      return;
    }

    const resolvedProfilePic = imageMode === "upload" ? profileImageUrl : profileUrlInput.trim();

    if (!resolvedProfilePic) {
      setError(theme.copy.missingProfileError);
      return;
    }
    if (imageMode === "url" && !/^https?:\/\//i.test(resolvedProfilePic)) {
      setError(theme.copy.invalidProfileUrlError);
      return;
    }
    setPending(true);
    try {
      const res = await fetch("https://postman.flows.pstmn.io/api/default/get-mcp-ui-stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          profilePic: resolvedProfilePic,
          company: trimmedCompany,
          mainInstructions: theme.story.mainInstructions,
          templatePic: theme.story.templatePic,
          ...(trimmedPrompt ? { prompt: trimmedPrompt } : {}),
        }),
      });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();

      const content = Array.isArray(data?.content) ? data.content : [];
      const initial = content
        .map((item: any) => item?.resource?._meta?.["mcpui.dev/ui-initial-render-data"])
        .find((val: any) => Boolean(val));

      const parsed = StoryResponse.safeParse(initial);
      if (!parsed.success) throw parsed.error;
      setStoryData({ ...parsed.data, theme: theme.video });
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : "Failed to load story";
      setError(`${theme.copy.errorPrefix}: ${errMessage}`);
      setStoryData(undefined);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={theme.pageClassName}>
      <div className="max-w-screen-lg m-auto px-6 md:px-10">
        <div ref={playerContainerRef} className="mx-auto w-full max-w-[360px]">
          {pending ? (
            <div className={cn("relative overflow-hidden rounded-[28px] mb-12 mt-8 aspect-[9/16]", theme.loaderFrameClassName)}>
              <div className={cn("absolute inset-0", theme.loaderBackgroundClassName)} aria-hidden />
              <div className={cn("absolute -inset-8 opacity-30", theme.loaderHighlightClassName)} aria-hidden />
              <div className="relative flex h-full w-full items-center justify-center">
                <Loading compact title="Rendering video…" subtitle={theme.copy.loaderSubtitle} />
              </div>
            </div>
          ) : null}

          {!pending && inputProps ? (
            <>
              <div className={cn("overflow-hidden rounded-[28px] mb-6 mt-8 aspect-[9/16]", theme.playerFrameClassName)}>
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
              <div className="mb-12">
                <RenderControls inputProps={inputProps} appearance={theme.renderControlsAppearance} />
              </div>
            </>
          ) : null}

          {!pending && !inputProps ? (
            <div
              className={cn(
                "relative overflow-hidden rounded-[28px] border border-dashed mb-12 mt-8 aspect-[9/16] flex items-center justify-center text-center px-6",
                theme.emptyFrameClassName,
              )}
            >
              <div className="flex flex-col items-center gap-4">
                <Spinner size={40} color={theme.placeholderSpinnerColor} />
                <div>
                  <p className={theme.noDataTitleClassName}>{theme.copy.emptyStateTitle}</p>
                  <p className={theme.noDataDescriptionClassName}>{theme.copy.emptyStateDescription}</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <form onSubmit={handleSubmit}>
          <div className={cn("px-7 py-9 md:px-12 md:py-12 flex flex-col gap-7", theme.panelClassName)}>
            <div>
              <p className={theme.chipClassName}>{theme.copy.heroChip}</p>
              <h2 className="city-quest-headline text-4xl md:text-5xl text-white mt-4">{theme.copy.heroTitle}</h2>
              <p className={cn("text-sm md:text-base mt-4 max-w-2xl", theme.heroDescriptionClassName)}>
                {theme.copy.heroDescription}
              </p>
            </div>

            <div className="grid gap-5">
              <div>
                <label className={theme.labelClassName}>{theme.copy.nameLabel}</label>
                <Input
                  disabled={pending}
                  text={nameInput}
                  setText={setNameInput}
                  placeholder={theme.copy.namePlaceholder}
                  className={cn("mt-3", theme.inputClassName)}
                />
              </div>

              <div>
                <label className={theme.labelClassName}>{theme.copy.companyLabel}</label>
                <Input
                  disabled={pending}
                  text={companyInput}
                  setText={setCompanyInput}
                  placeholder={theme.copy.companyPlaceholder}
                  className={cn("mt-3", theme.inputClassName)}
                />
              </div>

              <div>
                <label className={theme.labelClassName}>{theme.copy.promptLabel}</label>
                <Input
                  disabled={pending}
                  text={promptInput}
                  setText={setPromptInput}
                  placeholder={theme.copy.promptPlaceholder}
                  className={cn("mt-3", theme.inputClassName)}
                />
              </div>

              <div>
                <label className={theme.labelClassName}>{theme.copy.glamourLabel}</label>
                <p className={cn("text-xs mt-3", theme.helperTextClassName)}>{theme.copy.glamourHelper}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className={cn(
                      "px-4 py-2 text-xs city-quest-subheadline rounded-full border transition-colors duration-150 tracking-[0.2em]",
                      imageMode === "upload" ? theme.imageModeActiveClassName : theme.imageModeInactiveClassName,
                    )}
                    onClick={() => handleImageModeChange("upload", { openDialog: true })}
                    aria-pressed={imageMode === "upload"}
                  >
                    Upload file
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "px-4 py-2 text-xs city-quest-subheadline rounded-full border transition-colors duration-150 tracking-[0.2em]",
                      imageMode === "url" ? theme.imageModeActiveClassName : theme.imageModeInactiveClassName,
                    )}
                    onClick={() => handleImageModeChange("url")}
                    aria-pressed={imageMode === "url"}
                  >
                    Paste a URL
                  </button>
                </div>

                {imageMode === "upload" ? (
                  <div className="mt-5">
                    <ImageUpload
                      ref={imageUploadRef}
                      disabled={pending}
                      initialImageUrl={profileImageUrl}
                      onFileSelect={setSelectedProfileFile}
                      onImageUploaded={setProfileImageUrl}
                      onUploadingChange={setUploadingImage}
                      selectedFile={selectedProfileFile}
                      appearance={theme.imageUploadAppearance}
                    />
                  </div>
                ) : null}

                {imageMode === "url" ? (
                  <div className="mt-5 space-y-3">
                    <Input
                      disabled={pending}
                      text={profileUrlInput}
                      setText={setProfileUrlInput}
                      placeholder={theme.copy.glamourUrlPlaceholder}
                      className={theme.inputClassName}
                      type="url"
                    />
                    {profileUrlInput.trim() ? (
                      <div>
                        <img
                          src={profileUrlInput.trim()}
                          alt="Profile preview"
                          className={cn("max-h-48 rounded-[18px] object-cover border", theme.urlPreviewBorderClassName)}
                        />
                      </div>
                    ) : null}
                    <p className={cn("text-xs", theme.glamourPublicHelperClassName)}>
                      {theme.copy.glamourPublicHelper}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            {error ? <div className={theme.errorPanelClassName}>{error}</div> : null}

            <div className="flex justify-center">
              <Button
                type="submit"
                loading={pending || uploadingImage}
                disabled={pending || uploadingImage}
                className={theme.primaryButtonClassName}
              >
                {theme.copy.primaryButton}
              </Button>
            </div>
          </div>
        </form>

        <Spacing />
        <Spacing />
        <Spacing />
        <Spacing />

        <div className={cn("px-7 py-6 md:px-12 md:py-8 flex flex-col items-center gap-4", theme.secondaryPanelClassName)}>
          <button
            type="button"
            onClick={() => setShowNerdSection((prev) => !prev)}
            className={theme.nerdButtonClassName}
            aria-expanded={showNerdSection}
            aria-controls="nerd-notes"
          >
            {showNerdSection ? theme.copy.nerdToggleClose : theme.copy.nerdToggleOpen}
          </button>
          {showNerdSection ? (
            <div id="nerd-notes" className={theme.nerdPanelClassName}>
              <p className={theme.nerdTextClassName}>{theme.copy.nerdDescription}</p>
              <div className={cn("mt-3 aspect-video w-full overflow-hidden rounded-[12px] border", theme.nerdEmbedBorderClassName)}>
                <iframe
                  src="https://www.youtube.com/embed/42B_ia64QZU?si=NCFqdI906xS_2Dsx"
                  title="How this site was built"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  className="h-full w-full"
                  loading="lazy"
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
