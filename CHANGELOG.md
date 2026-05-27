# Changelog

このプロジェクトの主な変更点を記録する。形式は [Keep a Changelog](https://keepachangelog.com/) に準拠。

## [Unreleased]

### Added
- 類題生成エンジン: solver(SymPy)/ figures / llm(stub・ollama)/ generate / render / cli
- 図ジェネレータ: single_line, phasor, waveform, bode, power_triangle,
  transformer_efficiency, impedance_triangle, resonance_curve, transient_curve
- 検証: 計算の再計算突合・妥当範囲、論説の rubric、数値グラウンディング、pint 次元検証
- 記述式の採点基準(scoring)、よくある誤り(pitfalls)、難易度パラメータ化(variants)
- 重複制御つき問題セット生成(`denken set`)、FSRS 復習スケジューラ
- 科目: 二次(電力・管理 / 機械・制御)+ 一次・理論(交流回路 / 共振 / 過渡)
- ゴールデン回帰テスト、CI(ruff + mypy + pytest + denken check)
- ドキュメント: アーキテクチャ、テンプレート作成ガイド、設計判断ログ(docs/ideas.md)
- MIT License、PEP 561 `py.typed`

### Notes
- pre-alpha → alpha。テンプレ 10 本、テスト 65 件。
