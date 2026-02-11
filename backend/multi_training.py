"""Run intensive training multiple times"""
import sys
import io
import subprocess
import time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

print("=" * 80)
print("MULTI-TRAINING SESSION")
print("Running intensive training 5 times")
print("=" * 80)

for i in range(1, 6):
    print(f"\n{'='*80}")
    print(f"TRAINING RUN {i}/5")
    print(f"{'='*80}\n")
    
    result = subprocess.run(
        [sys.executable, "intensive_training.py"],
        cwd="backend",
        capture_output=True,
        text=True,
        timeout=3600  # 1 hour timeout
    )
    
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    
    if i < 5:
        print(f"\nWaiting 10 seconds before next run...")
        time.sleep(10)

print("\n" + "=" * 80)
print("ALL TRAINING RUNS COMPLETE")
print("=" * 80)

