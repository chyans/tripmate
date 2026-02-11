"""
Run the self-training test suite 100 times and report aggregate accuracy.

This uses the existing `test_queries` function from `self_train_ai.py`
and repeats it 100 times, summing the results to give an overall pass rate.
"""

import sys
import io
from contextlib import redirect_stdout

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

from self_train_ai import test_queries


def main(runs: int = 100):
    """Run test_queries() `runs` times, suppress per-run logs, and print aggregate stats."""
    total_runs = runs
    agg_total = 0
    agg_passed = 0
    agg_failed = 0
    agg_clarifying = 0
    agg_sorry = 0

    print("=" * 80)
    print(f"SELF-TRAINING x{total_runs}")
    print("=" * 80)

    for i in range(1, total_runs + 1):
        # Suppress detailed console output from each run to keep logs small
        buf = io.StringIO()
        with redirect_stdout(buf):
            result = test_queries()

        agg_total += result["total"]
        agg_passed += result["passed"]
        agg_failed += result["failed"]
        agg_clarifying += result["clarifying"]
        agg_sorry += result["sorry"]

    print("\n" + "=" * 80)
    print(f"AGGREGATE RESULTS ({total_runs} RUNS)")
    print("=" * 80)

    accuracy = (agg_passed / agg_total * 100) if agg_total else 0.0
    print(f"Total queries across all runs: {agg_total}")
    print(f"Total passed: {agg_passed}")
    print(f"Total failed: {agg_failed}")
    print(f"Total clarifying: {agg_clarifying}")
    print(f"Total sorry: {agg_sorry}")
    print(f"\nOverall accuracy: {accuracy:.2f}%")


if __name__ == "__main__":
    main()


