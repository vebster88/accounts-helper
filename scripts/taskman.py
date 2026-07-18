#!/usr/bin/env python3
"""Notion Task Manager CLI"""
import argparse, json, subprocess, os, sys
from datetime import datetime, timedelta

def load_token():
    """Читает токен Notion из файла ~/.hermes/.notion_token"""
    token_path = os.path.expanduser("~/.hermes/.notion_token")
    if os.path.exists(token_path):
        with open(token_path) as f:
            return f.read().strip()
    return os.environ.get("NOTION_API_KEY", "")

TOKEN = load_token()
DB_ID = "35779e14-e037-817b-b40a-e047c0155d53"

STATUS_MAP = {
    "backlog": "🔮 Backlog",
    "week": "📅 Week",
    "today": "☀️ Today",
    "progress": "🔄 In Progress",
    "done": "✅ Done",
    "archived": "🗄️ Archived",
}

PRIORITY_MAP = {
    "high": "🔴 High",
    "medium": "🟡 Medium",
    "low": "🟢 Low",
}

def notion_query(body=None):
    cmd = ["curl", "-s", "-X", "POST", f"https://api.notion.com/v1/databases/{DB_ID}/query",
           "-H", f"Authorization: Bearer {TOKEN}",
           "-H", "Notion-Version: 2022-06-28",
           "-H", "Content-Type: application/json"]
    if body:
        cmd += ["-d", json.dumps(body)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return json.loads(result.stdout)

def notion_create_page(props):
    data = {"parent": {"database_id": DB_ID}, "properties": props}
    result = subprocess.run(
        ["curl", "-s", "-X", "POST", "https://api.notion.com/v1/pages",
         "-H", f"Authorization: Bearer {TOKEN}",
         "-H", "Notion-Version: 2022-06-28",
         "-H", "Content-Type: application/json",
         "-d", json.dumps(data)],
        capture_output=True, text=True
    )
    return json.loads(result.stdout)

def cmd_add(name, status="today", priority="medium", deadline=None, project=None, tags=None):
    props = {
        "Name": {"title": [{"text": {"content": name}}]},
        "Status": {"status": {"name": STATUS_MAP.get(status, "☀️ Today")}},
        "Priority": {"select": {"name": PRIORITY_MAP.get(priority, "🟡 Medium")}},
    }
    if deadline:
        props["Deadline"] = {"date": {"start": deadline}}
    if project:
        props["Project"] = {"select": {"name": project}}
    if tags:
        props["Tags"] = {"multi_select": [{"name": t.strip()} for t in tags.split(",")]}
    resp = notion_create_page(props)
    if "id" in resp:
        print(f"✅ Задача добавлена: {name}")
    else:
        print(f"❌ Ошибка: {resp.get('message', resp)}")

def cmd_list(status=None, today=False, overdue=False):
    body = {"sorts": [{"property": "Deadline", "direction": "ascending"}]}
    data = notion_query(body)
    
    results = data.get("results", [])
    now = datetime.now().strftime("%Y-%m-%d")
    
    filtered = []
    for r in results:
        p = r["properties"]
        name = p["Name"]["title"][0]["plain_text"] if p["Name"]["title"] else "?"
        s = p["Status"]["status"]["name"] if p["Status"]["status"] else ""
        dl = p["Deadline"]["date"]["start"] if p["Deadline"]["date"] else None
        pr = p["Priority"]["select"]["name"] if p["Priority"]["select"] else ""
        proj = p["Project"]["select"]["name"] if p["Project"]["select"] else ""
        tags = [t["name"] for t in p["Tags"]["multi_select"]]
        
        if status and s != STATUS_MAP.get(status, status):
            continue
        if today and s not in ("☀️ Today", "🔄 In Progress"):
            continue
        if overdue and (not dl or dl >= now or s == "✅ Done"):
            continue
        
        filtered.append({"name": name, "status": s, "deadline": dl, "priority": pr, "project": proj, "tags": tags})
    
    if not filtered:
        print("🎉 Задач не найдено!")
        return
    
    for t in filtered:
        dl_str = f" | 📅 {t['deadline']}" if t['deadline'] else ""
        tag_str = f" | 🏷 {', '.join(t['tags'])}" if t['tags'] else ""
        print(f"  {t['status']} {t['name']}{dl_str} | {t['priority']}{tag_str}")

def cmd_today():
    print("📅 **Задачи на сегодня:**")
    cmd_list(today=True)

def cmd_overdue():
    print("⚠️ **Просроченные задачи:**")
    cmd_list(overdue=True)

def main():
    parser = argparse.ArgumentParser(description="Notion Task Manager")
    sub = parser.add_subparsers(dest="command")
    
    add = sub.add_parser("add", help="Добавить задачу")
    add.add_argument("name", help="Название задачи")
    add.add_argument("--status", default="today", choices=list(STATUS_MAP.keys()), help="Статус")
    add.add_argument("--priority", default="medium", choices=list(PRIORITY_MAP.keys()), help="Приоритет")
    add.add_argument("--deadline", help="Дедлайн (YYYY-MM-DD)")
    add.add_argument("--project", help="Проект")
    add.add_argument("--tags", help="Теги через запятую")
    
    lst = sub.add_parser("list", help="Список задач")
    lst.add_argument("--status", choices=list(STATUS_MAP.keys()), help="Фильтр по статусу")
    
    sub.add_parser("today", help="Задачи на сегодня")
    sub.add_parser("overdue", help="Просроченные задачи")
    
    args = parser.parse_args()
    
    if args.command == "add":
        cmd_add(args.name, args.status, args.priority, args.deadline, args.project, args.tags)
    elif args.command == "list":
        cmd_list(args.status)
    elif args.command == "today":
        cmd_today()
    elif args.command == "overdue":
        cmd_overdue()
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
