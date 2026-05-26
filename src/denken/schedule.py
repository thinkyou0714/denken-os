"""FSRS による復習スケジューリング (アイデア#86)。

py-fsrs(FSRS-6) を薄くラップする。カードは dict で永続化できる形にして、
将来 Supabase 等に保存しやすくする。1 問 = 1 カードを想定。
"""

from __future__ import annotations

from datetime import datetime

from fsrs import Card, Rating, Scheduler

_RATING = {
    "again": Rating.Again,
    "hard": Rating.Hard,
    "good": Rating.Good,
    "easy": Rating.Easy,
}


class Reviewer:
    def __init__(self, desired_retention: float = 0.9) -> None:
        self.scheduler = Scheduler(desired_retention=desired_retention)

    def new_card(self) -> dict:
        """新規カードを dict で返す(永続化用)。"""
        return Card().to_dict()

    def review(
        self, card_dict: dict, rating: str, now: datetime | None = None
    ) -> tuple[dict, datetime]:
        """評価(again/hard/good/easy)を適用し、(更新後カード, 次回復習日時)を返す。"""
        key = rating.lower()
        if key not in _RATING:
            raise ValueError(f"unknown rating: {rating} (use {list(_RATING)})")
        card = Card.from_dict(card_dict)
        updated, _log = self.scheduler.review_card(card, _RATING[key], review_datetime=now)
        return updated.to_dict(), updated.due
