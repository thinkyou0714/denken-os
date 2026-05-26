"""図の自動生成。solver と同じ値から描くので図・数値・答えが必ず一致する。

generator は `kind` で登録制 (アイデア#38)。ライブラリ未導入や描画失敗時は
例外を握りつぶさず警告 FigureRef を返し、生成パイプライン全体は止めない (アイデア#34)。
"""

from __future__ import annotations

import math
from collections.abc import Callable
from pathlib import Path
from typing import Any

from denken.models import FigureRef, FigureSpec

# kind -> 描画関数 (values, spec, out_path) を受け取り SVG を書き出す
Generator = Callable[[dict[str, float], FigureSpec, Path], None]
REGISTRY: dict[str, Generator] = {}


def register(kind: str) -> Callable[[Generator], Generator]:
    def deco(fn: Generator) -> Generator:
        REGISTRY[kind] = fn
        return fn

    return deco


def resolve(ref: Any, values: dict[str, float]) -> float:
    """ref が中間値のキーならその値、リテラル数値ならそのまま返す。"""
    if isinstance(ref, bool):
        raise TypeError("bool is not a numeric ref")
    if isinstance(ref, (int, float)):
        return float(ref)
    if isinstance(ref, str):
        if ref in values:
            return float(values[ref])
        if ref.startswith("-") and ref[1:] in values:  # "-phi_deg" のような符号反転参照
            return -float(values[ref[1:]])
        return float(ref)  # 数値リテラル文字列。失敗すれば ValueError が伝播
    raise TypeError(f"unsupported ref: {ref!r}")


def render_figures(
    specs: list[FigureSpec], values: dict[str, float], out_dir: Path, basename: str
) -> list[FigureRef]:
    out_dir.mkdir(parents=True, exist_ok=True)
    refs: list[FigureRef] = []
    for i, spec in enumerate(specs):
        path = out_dir / f"{basename}_{i}.svg"
        gen = REGISTRY.get(spec.kind)
        if gen is None:
            refs.append(
                FigureRef(path="", caption=spec.caption, alt=f"[未登録の図種別: {spec.kind}]")
            )
            continue
        try:
            gen(values, spec, path)
            refs.append(
                FigureRef(
                    path=path.name,
                    caption=spec.caption,
                    alt=spec.caption or spec.kind,
                    kind=spec.kind,
                    role=spec.role,
                    provenance="solver",
                )
            )
        except Exception as e:  # noqa: BLE001 - 図失敗で全体を止めない
            refs.append(
                FigureRef(
                    path="", caption=spec.caption, alt=f"[図生成失敗: {e}]", kind=spec.kind,
                    role=spec.role,
                )
            )
    return refs


def _use_agg():
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    return plt


@register("phasor")
def _phasor(values: dict[str, float], spec: FigureSpec, out: Path) -> None:
    """ベクトル(フェーザ)図。options.vectors = [{label, mag, angle_deg, color?}]。

    mag / angle_deg は中間値のキー名でもリテラル数値でもよい。
    """
    plt = _use_agg()
    vectors = spec.options.get("vectors", [])
    fig, ax = plt.subplots(figsize=(4, 4))
    max_r = 1e-9
    for v in vectors:
        mag = resolve(v["mag"], values)
        ang = math.radians(resolve(v["angle_deg"], values))
        x, y = mag * math.cos(ang), mag * math.sin(ang)
        max_r = max(max_r, abs(x), abs(y))
        ax.annotate(
            "",
            xy=(x, y),
            xytext=(0, 0),
            arrowprops=dict(arrowstyle="-|>", color=v.get("color", "C0"), lw=2),
        )
        ax.text(x * 1.05, y * 1.05, v.get("label", ""), color=v.get("color", "C0"))
    lim = max_r * 1.3
    ax.set_xlim(-lim, lim)
    ax.set_ylim(-lim, lim)
    ax.axhline(0, color="gray", lw=0.5)
    ax.axvline(0, color="gray", lw=0.5)
    ax.set_aspect("equal")
    # 図内テキストは ASCII のみ(日本語は markdown キャプションで表示し、字化けを防ぐ)
    title = spec.options.get("title", "")
    if title:
        ax.set_title(title)
    fig.savefig(out, format="svg", bbox_inches="tight")
    plt.close(fig)


@register("single_line")
def _single_line(values: dict[str, float], spec: FigureSpec, out: Path) -> None:
    """送電系統の単線図: 電源 — (R + jX) — 負荷。

    options.source_label / load_label で注記を上書きできる (値キーを {} で埋め込み可)。
    """
    import schemdraw
    import schemdraw.elements as elm

    def fmt(label: str) -> str:
        try:
            return label.format(**values)
        except (KeyError, IndexError, ValueError):
            return label

    src = fmt(spec.options.get("source_label", "Source Vs"))
    load = fmt(spec.options.get("load_label", "Load"))

    with schemdraw.Drawing(file=str(out), show=False) as d:
        d += elm.SourceV().up().label(src, loc="bottom")
        d += elm.Line().right()
        d += elm.Resistor().right().label("R")
        d += elm.Inductor().right().label("jX")
        d += elm.Line().right()
        d += elm.Dot(open=True).label(load, loc="right")
        d += elm.Line().down().length(d.unit)
        d += elm.Line().left().tox(0)
        d += elm.Line().left()
    # caption は render 側で扱う


@register("waveform")
def _waveform(values: dict[str, float], spec: FigureSpec, out: Path) -> None:
    """時間波形。options.wave = sine / three_phase / rectified / halfwave。

    amp(振幅) は中間値キー可。avg を与えると直流平均線を重ねる(整流回路の Vdc 等)。
    """
    plt = _use_agg()
    import numpy as np

    wave = spec.options.get("wave", "sine")
    amp = resolve(spec.options.get("amp", 1.0), values)
    cycles = float(spec.options.get("cycles", 2))
    t = np.linspace(0, cycles, 1000)
    wt = 2 * np.pi * t

    fig, ax = plt.subplots(figsize=(5, 3))
    if wave == "three_phase":
        for k, c in zip((0, -120, 120), ("C0", "C1", "C2"), strict=True):
            ax.plot(t, amp * np.sin(wt + np.radians(k)), color=c)
    elif wave == "rectified":
        ax.plot(t, amp * np.abs(np.sin(wt)), color="C0")
    elif wave == "halfwave":
        ax.plot(t, amp * np.clip(np.sin(wt), 0, None), color="C0")
    else:  # sine
        ax.plot(t, amp * np.sin(wt), color="C0")

    avg_ref = spec.options.get("avg")
    if avg_ref is not None:
        avg = resolve(avg_ref, values)
        ax.axhline(avg, color="C3", ls="--", lw=1.2)
        ax.text(cycles * 0.98, avg, " avg", color="C3", va="bottom", ha="right")

    ax.axhline(0, color="gray", lw=0.5)
    ax.set_xlabel("t / T")
    ax.set_ylabel("amplitude")
    ax.grid(True, alpha=0.3)
    fig.savefig(out, format="svg", bbox_inches="tight")
    plt.close(fig)


@register("bode")
def _bode(values: dict[str, float], spec: FigureSpec, out: Path) -> None:
    """一次遅れ系 H(jw)=1/(1+jw·tau) のボード線図。options.tau = 時定数キー。

    折点角周波数 wc=1/tau に縦線を引く。自動制御科目用。
    """
    plt = _use_agg()
    import numpy as np

    tau = resolve(spec.options["tau"], values)
    if tau <= 0:
        raise ValueError("tau must be positive")
    wc = 1.0 / tau
    w = np.logspace(np.log10(wc) - 2, np.log10(wc) + 2, 500)
    h = 1.0 / (1.0 + 1j * w * tau)
    mag = 20 * np.log10(np.abs(h))
    phase = np.degrees(np.angle(h))

    fig, (a1, a2) = plt.subplots(2, 1, figsize=(5, 4), sharex=True)
    a1.semilogx(w, mag, color="C0")
    a1.axvline(wc, color="C3", ls="--", lw=1.0)
    a1.set_ylabel("Gain [dB]")
    a1.grid(True, which="both", alpha=0.3)
    a2.semilogx(w, phase, color="C0")
    a2.axvline(wc, color="C3", ls="--", lw=1.0)
    a2.set_ylabel("Phase [deg]")
    a2.set_xlabel("omega [rad/s]")
    a2.grid(True, which="both", alpha=0.3)
    fig.savefig(out, format="svg", bbox_inches="tight")
    plt.close(fig)
