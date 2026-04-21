import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        hier: {
          primary: "#91A6EB",
          background: "#fcfcfc",
          text: "#111111",
          muted: "#6B7280",
          border: "#E5E7EB",
          card: "#fcfcfc",
          soft: "#F4F7FF",
          panel: "#F7F7FA",
          ink: "#1D2433",
        },
      },
      boxShadow: {
        panel: "0 18px 60px rgba(17, 17, 17, 0.08)",
        card: "0 8px 24px rgba(17, 17, 17, 0.06)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      backgroundImage: {
        "login-glow":
          "radial-gradient(circle at top, rgba(145,166,235,0.22), transparent 34%), radial-gradient(circle at bottom right, rgba(145,166,235,0.14), transparent 28%)",
      },
    },
  },
  plugins: [],
};

export default config;
