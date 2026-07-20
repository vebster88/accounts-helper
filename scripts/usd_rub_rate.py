#!/usr/bin/env python3
"""Legacy v1.0-compatible wrapper around currency_rate.py v2.0.

Runs: currency_rate.py --currency usd report --format text
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


__version__ = "1.0.0"


def main(argv: list[str] | None = None) -> int:
    script = Path(__file__).with_name("currency_rate.py")
    cmd = [sys.executable, str(script), "--currency", "usd", "report", "--format", "text"]
    if argv:
        cmd.extend(argv)
    try:
        result = subprocess.run(cmd, text=True, capture_output=False, check=False)
        return result.returncode
    except FileNotFoundError as exc:
        print(f"Не удалось запустить {script}: {exc}", file=sys.stderr)
        return 1
    except Exception:
        print("Не удалось выполнить usd_rub_rate.py", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
