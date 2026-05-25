import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // P0.3: forzar deps completas en hooks. Un useMemo/useEffect con
      // dependencias incompletas produce resultados obsoletos silenciosos.
      "react-hooks/exhaustive-deps": "error",
    },
  },
  {
    ignores: [
      ".next/**",
      "out/**",
      "node_modules/**",
      "next-env.d.ts",
      "public/**",
    ],
  },
];

export default config;
