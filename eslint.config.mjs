import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

export default [
    // Global ignores (replaces .eslintignore + sub-project ignorePatterns)
    {
        ignores: [
            "**/node_modules/**",
            "**/build/**",
            "**/dist/**",
            "**/__test__/**",
            "**/__tests__/**",
            "**/compiled-lang/**",
            "**/test-results/**",
            "**/coverage/**",
            "**/__mocks__/**",
            "Localize/**",
        ],
    },

    // Root .eslintrc.json converted via FlatCompat
    ...compat.config({
        parser: "@typescript-eslint/parser",
        plugins: ["formatjs", "react", "react-hooks", "@typescript-eslint"],
        settings: {
            react: {
                version: "detect",
            },
        },
        extends: ["eslint:recommended"],
        overrides: [
            {
                files: ["*.ts", "*.tsx"],
                extends: [
                    "plugin:react/recommended",
                    "plugin:react-hooks/recommended",
                    "plugin:import/recommended",
                    "plugin:import/typescript",
                ],
                rules: {
                    "no-unused-vars": "off",
                    "no-redeclare": "off",
                    "no-undef": "off",

                    "no-restricted-syntax": ["error", {
                        selector: "TSEnumDeclaration",
                        message: "Don't use enums.",
                    }],

                    "react-hooks/exhaustive-deps": ["warn", {
                        additionalHooks: "useDebouncedEffect",
                    }],

                    "react/jsx-no-useless-fragment": [1, {
                        allowExpressions: true,
                    }],

                    "import/no-unresolved": "off",

                    "@typescript-eslint/no-unused-vars": ["error", {
                        argsIgnorePattern: "^_",
                        destructuredArrayIgnorePattern: "^_",
                        caughtErrorsIgnorePattern: "^_",
                    }],

                    "@typescript-eslint/explicit-module-boundary-types": "off",
                    "@typescript-eslint/no-explicit-any": "off",

                    "@typescript-eslint/consistent-type-assertions": ["error", {
                        assertionStyle: "as",
                    }],

                    "@typescript-eslint/consistent-type-imports": [2, {
                        prefer: "type-imports",
                        disallowTypeAnnotations: true,
                    }],

                    "formatjs/enforce-id": ["error", {
                        idInterpolationPattern: "[sha512:contenthash:base64:6]",
                    }],

                    "formatjs/enforce-placeholders": ["error", {
                        ignoreList: ["foo"],
                    }],

                    "no-param-reassign": "off",
                    "formatjs/enforce-default-message": ["error", "literal"],
                    "formatjs/enforce-description": ["error", "literal"],
                    "formatjs/no-multiple-whitespaces": [1],
                    "formatjs/no-multiple-plurals": ["error"],

                    "formatjs/no-complex-selectors": ["error", {
                        limit: 4,
                    }],

                    "react/react-in-jsx-scope": 0,
                    "react/prop-types": 0,
                },
            },
            {
                files: ["*.json"],
                parser: "jsonc-eslint-parser",
                rules: {},
            },
        ],
    }),

    // VS Code apps: additional rule overrides (from apps/vs-code-react and apps/vs-code-designer .eslintrc.json)
    {
        files: [
            "apps/vs-code-react/src/**/*.ts",
            "apps/vs-code-react/src/**/*.tsx",
            "apps/vs-code-designer/src/**/*.ts",
            "apps/vs-code-designer/src/**/*.tsx",
        ],
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-namespace": "off",
            "react-hooks/rules-of-hooks": "off",
        },
    },
    {
        files: [
            "apps/vs-code-react/src/**/*.js",
            "apps/vs-code-react/src/**/*.jsx",
            "apps/vs-code-designer/src/**/*.js",
            "apps/vs-code-designer/src/**/*.jsx",
        ],
        rules: {
            "@typescript-eslint/no-require-imports": "off",
        },
    },
];