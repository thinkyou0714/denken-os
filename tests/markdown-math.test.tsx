// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MarkdownMath } from "@/components/MarkdownMath";

describe("MarkdownMath", () => {
  it("KaTeX 数式と通常テキストを描画する", () => {
    const { container } = render(
      <MarkdownMath>{"質量とエネルギー $E = mc^2$ の関係"}</MarkdownMath>,
    );
    expect(container.querySelector(".katex")).not.toBeNull();
    expect(container).toHaveTextContent("質量とエネルギー");
  });
});
