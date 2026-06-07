-- review_states に FSRS の学習状態(state)列を追加（SCHED-FSRS-STATE）。
-- 0001 は stability/difficulty 列を持つが state を持たず、再読込時に reps から復元していた。
-- ts-fsrs は初回レビューで reps をインクリメントし状態が4種(New/Learning/Review/Relearning)あるため、
-- reps>0 を一律 Review とみなすと Learning/Relearning が誤分類され、間隔が約10倍に膨らむ。
-- state を永続化往復で保持してこの誤分類を断つ。NULL 許容（SM-2 / 旧データは未設定）。
alter table public.review_states
  add column if not exists state smallint;
