#!/usr/bin/env python3
"""
Simple script to start the admin backend
"""
import subprocess
import sys
import os

backend_dir = "/home/cyberdude/Documents/Projects/CA-final/tax-hub-dashboard-admin/backend"
os.chdir(backend_dir)

# Activate venv and start uvicorn
venv_python = os.path.join(backend_dir, "venv/bin/python3")
log_file = os.path.join(backend_dir, "backend.log")

print("Starting admin backend on port 8003...")
print(f"Logs: {log_file}")

# Start uvicorn
with open(log_file, "w") as f:
    process = subprocess.Popen(
        [venv_python, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8003", "--reload"],
        stdout=f,
        stderr=subprocess.STDOUT,
        cwd=backend_dir
    )
    
    # Save PID
    with open(os.path.join(backend_dir, "backend.pid"), "w") as pid_file:
        pid_file.write(str(process.pid))
    
    print(f"✓ Backend started (PID: {process.pid})")
    print(f"  API: http://localhost:8003")
    print(f"  Docs: http://localhost:8003/docs")
    print(f"  Health: http://localhost:8003/health")
    print(f"\nTo stop: kill {process.pid}")

