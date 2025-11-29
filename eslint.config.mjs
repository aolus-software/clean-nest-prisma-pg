// @ts-check
import eslint from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{
		ignores: [
			"eslint.config.mjs",
			"dist/**/*",
			"**/*.interface.ts",
			"**/interface/**/*",
			"**/interfaces/**/*",
			"/packages/db/clickhouse/repositories/interfaces/*.ts",
		],
	},
	eslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	eslintPluginPrettierRecommended,
	{
		languageOptions: {
			globals: {
				...globals.node,
				...globals.jest,
				Bun: "readonly",
			},
			ecmaVersion: 2022,
			sourceType: "module",
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		rules: {
			"@typescript-eslint/no-explicit-any": "error",
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-unsafe-argument": "error",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-call": "error",
			"@typescript-eslint/no-unsafe-member-access": "warn",
			"@typescript-eslint/no-unsafe-return": "error",

			indent: "off",
			"linebreak-style": ["error", "unix"],
			quotes: [
				"error",
				"double",
				{ avoidEscape: true, allowTemplateLiterals: true },
			],
			semi: ["error", "always"],
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
			],

			"no-unused-expressions": "error",
			"no-console": "error",
			"no-undef": "off",
			"no-redeclare": "error",
			"no-shadow": "error",
		},
	},
);
