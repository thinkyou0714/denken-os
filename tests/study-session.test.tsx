// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StudySession } from "@/components/StudySession";
import { GRADE_LABELS } from "@/domain/srs/scheduler";
import type { Problem } from "@/domain/content/schema";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const queue: Problem[] = [
  {
    id: "t-1",
    subject: "theory",
    topic: "x",
    difficulty: 1,
    question: "問1の本文",
    choices: ["TrueOne", "FalseOne"],
    answerIndex: 0,
    explanation: "問1の解説",
    tags: [],
  },
  {
    id: "p-1",
    subject: "power",
    topic: "y",
    difficulty: 1,
    question: "問2の本文",
    choices: ["OptionA", "OptionB"],
    answerIndex: 1,
    explanation: "問2の解説",
    tags: [],
  },
];

describe("StudySession", () => {
  it("空キューでは復習完了メッセージを表示する", () => {
    render(<StudySession queue={[]} onGrade={vi.fn()} />);
    expect(screen.getByText(/今日の復習は完了/)).toBeInTheDocument();
  });

  it("正答→評価、誤答→againでセッションを完走できる", async () => {
    const user = userEvent.setup();
    const onGrade = vi.fn();
    render(<StudySession queue={queue} onGrade={onGrade} />);

    // 問1: 正答を選ぶ
    await user.click(screen.getByRole("button", { name: /TrueOne/ }));
    expect(screen.getByText("正解")).toBeInTheDocument();
    expect(screen.getByText("問1の解説")).toBeInTheDocument();

    // 正答時は hard/good/easy が出る(again は出ない)
    expect(
      screen.queryByRole("button", { name: GRADE_LABELS.again }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: GRADE_LABELS.good }));
    expect(onGrade).toHaveBeenCalledWith("t-1", "good", true);

    // 問2へ進む。誤答を選ぶ
    expect(screen.getByText("問2の本文")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /OptionA/ }));
    expect(screen.getByText("不正解")).toBeInTheDocument();

    // 誤答時は評価ボタンは出さず "次の問題へ" のみ。grade は again 固定
    await user.click(screen.getByRole("button", { name: /次の問題へ/ }));
    expect(onGrade).toHaveBeenLastCalledWith("p-1", "again", false);

    // 完了画面
    expect(screen.getByText(/セッション完了/)).toBeInTheDocument();
  });

  it("数字キーで選択肢を選べる", async () => {
    const user = userEvent.setup();
    render(<StudySession queue={queue} onGrade={vi.fn()} />);
    await user.keyboard("1"); // 1 番目(正答)を選択
    expect(screen.getByText("正解")).toBeInTheDocument();
  });

  it("getCard を渡すと評価ボタンに次回出題間隔が表示される", async () => {
    const user = userEvent.setup();
    render(
      <StudySession
        queue={queue}
        onGrade={vi.fn()}
        getCard={() => null /* 新規カード扱い */}
      />,
    );
    await user.click(screen.getByRole("button", { name: /TrueOne/ }));
    const goodBtn = screen.getByRole("button", {
      name: new RegExp(GRADE_LABELS.good),
    });
    expect(goodBtn.textContent).toMatch(/分後|時間後|日後|か月後|今すぐ/);
  });
});
