import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./services/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#050509",
        "ink-soft": "#0d0f1a",
        plasma: "#a855f7",
        flare: "#ff2d55",
        volt: "#19c8ff"
      },
      boxShadow: {
        glow: "0 0 36px rgba(168, 85, 247, 0.35)",
        "red-glow": "0 0 32px rgba(255, 45, 85, 0.35)"
      },
      backgroundImage: {
        "radial-vignette": "radial-gradient(circle at 50% 0%, rgba(168,85,247,0.18), transparent 32%), radial-gradient(circle at 85% 20%, rgba(25,200,255,0.16), transparent 28%), linear-gradient(180deg, #050509 0%, #080913 46%, #050509 100%)"
      }
    }
  },
  plugins: []
};

export default config;
