import { generate } from "@builder.io/qwik-city/static";

generate({
  renderModulePath: new URL("./entry.ssr.tsx", import.meta.url).pathname,
  qwikCityPlanModulePath: "@qwik-city-plan",
  origin: process.env.ORIGIN || "https://build.biswas.me",
  outDir: "dist",
});
