import next from "eslint-config-next";

// eslint-config-next 16 はフラットコンフィグ配列を default export する
// (core-web-vitals + typescript + 既定の ignores を内包)。
const eslintConfig = [...next];

export default eslintConfig;
