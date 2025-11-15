import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("./index.tsx"),
  route("/api/lambda/progress", "./progress.tsx"),
  route("/api/lambda/render", "./render.tsx"),
  route("/api/story-shares", "./api.story-shares.tsx"),
  route("/share/:shareId", "./share-player.tsx"),
] satisfies RouteConfig;
