// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProgress } from "@/lib/useProgress";

describe("useProgress", () => {
  beforeEach(() => window.localStorage.clear());

  it("解答を記録し localStorage に永続化する", () => {
    const { result } = renderHook(() => useProgress());
    act(() => result.current.record("theory-001", "good", true));

    expect(result.current.store.logs()).toHaveLength(1);
    expect(window.localStorage.getItem("denken-os/progress/v1")).toContain(
      "theory-001",
    );
  });

  it("reset で進捗を消去する", () => {
    const { result } = renderHook(() => useProgress());
    act(() => result.current.record("power-001", "again", false));
    act(() => result.current.reset());
    expect(result.current.store.logs()).toHaveLength(0);
  });
});
