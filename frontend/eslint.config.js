import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['dist'],
    },
    {
        files: ['**/*.{ts,tsx}'],
        extends: [
            js.configs.recommended,
            ...tseslint.configs.recommended,
            reactPlugin.configs.flat.recommended,
            reactPlugin.configs.flat['jsx-runtime'],
        ],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
            },
        },
        plugins: {
            'react-hooks': reactHooksPlugin,
            'react-refresh': reactRefreshPlugin,
        },
        rules: {
            ...reactHooksPlugin.configs.recommended.rules,
            'react/react-in-jsx-scope': 'off',
            'react-hooks/set-state-in-effect': 'off',
            'react-refresh/only-export-components': 'off',
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
);
