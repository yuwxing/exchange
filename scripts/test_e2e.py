#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""端到端测试：通过 Docker 生产环境（nginx HTTPS + app + redis）验证完整链路"""
import json, os, ssl, time, urllib.request, urllib.error

BASE = "https://127.0.0.1"
ADMIN_TOKEN = os.environ.get("TASK_MARKET_ADMIN_TOKEN", "local-admin-token-123")

ctx = ssl._create_unverified_context()  # 忽略自签名证书


def req(method, path, body=None, headers=None):
    url = BASE + path
    data = json.dumps(body).encode("utf-8") if body is not None else None
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    r = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(r, context=ctx, timeout=60) as resp:
            return resp.status, resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")


# 1. health
s, b = req("GET", "/api/v1/health")
print(f"[health] {s} {b}")

# 2. issue key
s, b = req("POST", "/api/v1/admin/issue-key",
           {"name": "Local Test Enterprise", "rate_limit_per_min": 10, "rate_limit_per_day": 100},
           {"Authorization": f"Bearer {ADMIN_TOKEN}"})
print(f"[issue] {s} {b}")
key = json.loads(b)["api_key"]
print(f"[key] {key}")

# 3. submit
task_body = {"title": "端到端测试任务", "task_type": "research",
             "description": "这是通过 Docker 生产环境（nginx+app+redis）跑通的端到端测试任务", "budget": 300}
s, b = req("POST", "/api/v1/tasks/submit", task_body,
           {"Authorization": f"Bearer {key}", "Idempotency-Key": "e2e-order-001"})
print(f"[submit] {s} {b}")
task_id = json.loads(b)["task_id"]

# 4. idempotent resubmit
s, b = req("POST", "/api/v1/tasks/submit", task_body,
           {"Authorization": f"Bearer {key}", "Idempotency-Key": "e2e-order-001"})
print(f"[idempotent] {s} {b}")

# 5. poll status
for _ in range(12):
    time.sleep(3)
    s, b = req("GET", f"/api/v1/tasks/{task_id}", None, {"Authorization": f"Bearer {key}"})
    print(f"[status] {s} {b}")
    st = json.loads(b).get("status")
    if st in ("completed", "failed"):
        break
