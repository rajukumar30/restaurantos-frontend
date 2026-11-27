import type { Config } from "tailwindcss";
const config: Config = { content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"], theme: { extend: { colors: { ink: "#171916", cream: "#F7F4EC", coral: "#E56A42", herb: "#527A5B", gold: "#E6B85C" } } }, plugins: [] };
export default config;
