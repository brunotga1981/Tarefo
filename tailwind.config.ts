import type { Config } from "tailwindcss";

/**
 * Paleta baseada na identidade visual da Azul Administradora — Smart Living.
 * Tons de azul extraídos da logo (refináveis com o manual de marca oficial).
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        azul: {
          navy: "#0E4A66",   // primária / cabeçalhos
          DEFAULT: "#2E89B8", // ações / destaques
          claro: "#4FA9DC",  // apoio / detalhes
          suave: "#9FD2EC",  // fundos / hovers
          bg: "#F4F7F9",     // superfície de fundo
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
