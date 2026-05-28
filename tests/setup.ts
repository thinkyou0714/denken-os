import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// globals 無効構成なので RTL の自動クリーンアップを明示登録する。
afterEach(() => cleanup());
