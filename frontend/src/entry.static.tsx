import { generate } from "@builder.io/qwik-city/static";
import render from "./entry.ssr";
import { manifest } from "@qwik-client-manifest";

generate({
  renderModulePath: new URL("./entry.ssr.tsx", import.meta.url).pathname,
  qwikCityPlanModulePath: "@qwik-city-plan",
  render,
  manifest,
  origin: process.env.ORIGIN || "https://build.biswas.me",
  outDir: "dist",
});
