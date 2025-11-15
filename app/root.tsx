import {
  Links,
  LinksFunction,
  Meta,
  MetaFunction,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

export const meta: MetaFunction = () => {
  return [
    {
      title: "City Quest",
    },
    { charset: "utf-8" },
    { name: "viewport", content: "width=device-width,initial-scale=1" },
    { property: "og:title", content: "City Quest" },
    {
      name: "description",
      content:
        "City Quest - Choose your own adventure game. Generate adventure summary videos with a magical, high-fantasy theme.",
    },
  ];
};

export const links: LinksFunction = () => [
  {
    rel: "icon",
    type: "image/svg+xml",
    href: "/tbpn-favicon.svg",
  },
  {
    rel: "apple-touch-icon",
    href: "/tbpn-favicon.svg",
  },
];
export default function App() {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body className="mt-14">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
