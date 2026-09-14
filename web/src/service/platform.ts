export const isSite =
  typeof document !== "undefined" &&
  document.querySelector('meta[name="denken-platform"]')?.getAttribute("content") === "sites";
