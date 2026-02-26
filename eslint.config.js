import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";

export default [
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"], // Apply to all relevant files
    rules: {
      // Disable base JS version of the rule
      "no-unused-expressions": "off",
      // Enable TypeScript version with specific options to prevent errors
      "@typescript-eslint/no-unused-expressions": [
        "error",
        {
          allowShortCircuit: true,
          allowTernary: true,
          allowTaggedTemplates: true,
        },
      ],
    },
  },
  {
    files: ["**/*.{jsx,tsx}"], // Apply React-specific configs only to JSX/TSX files
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        },
        ecmaVersion: "latest",
        sourceType: "module"
      },
      globals: globals.browser,
    },
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
    },
    rules: {
      ...pluginReact.configs.recommended.rules,
      ...pluginReactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off", // Next.js doesn't require React to be in scope
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    files: ["src/api/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        console: true
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      }
    },
    rules: {
      // Disable unused vars for test files if they are intentionally left for clarity or mocking.
      // We will re-evaluate if this is still needed after fixing console errors.
      "@typescript-eslint/no-unused-vars": "off",
    }
  },
  {
    files: ["**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^[_]" }],
    },
  }
];