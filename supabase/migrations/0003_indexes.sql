-- 0003_indexes.sql: 外部キー検索パスの補完インデックス（I-098）。
-- 0001 で answer_logs(user_id) インデックスは作成済み。
-- answer_logs(problem_id) は外部キーだが未インデックス→ JOIN/検索時のシーケンシャルスキャンを防ぐ。
-- RLS/テーブル定義の変更は行わない。

-- answer_logs: problem_id 検索（問題別の解答履歴集計・分析クエリ向け）
create index if not exists answer_logs_problem_idx
  on public.answer_logs (problem_id);

-- answer_logs: topic 検索（科目別・論点別の正答率集計向け）
create index if not exists answer_logs_topic_idx
  on public.answer_logs (topic);

-- answer_logs: answered_at 検索（時系列クエリ・最近の解答履歴向け）
create index if not exists answer_logs_answered_at_idx
  on public.answer_logs (user_id, answered_at desc);

-- review_states: topic 検索（論点別の記憶状態一覧・弱点診断向け）
-- user_id は主キーの先頭列なので単独インデックスは不要。
-- (user_id, due_at) は 0001 で作成済み。
-- topic 単独インデックスは今後の管理クエリ（全ユーザー横断）のために追加。
create index if not exists review_states_topic_idx
  on public.review_states (topic);
