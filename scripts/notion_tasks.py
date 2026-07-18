#!/usr/bin/env python3
"""Notion Task Manager - Daily Briefing"""
import subprocess, json, os, sys
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

def query_notion():
    result = subprocess.run(
        ["curl", "-s", "-X", "POST", f"https://api.notion.com/v1/databases/{DB_ID}/query",
         "-H", f"Authorization: Bearer {TOKEN}",
         "-H", "Notion-Version: 2022-06-28",
         "-H", "Content-Type: application/json",
         "-d", json.dumps({"page_size": 100})],
        capture_output=True, text=True
    )
    return json.loads(result.stdout)

def format_briefing(data):
    today = datetime.now().strftime("%Y-%m-%d")
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    
    today_tasks = []
    overdue = []
    week_tasks = []
    backlog = []
    in_progress = []
    
    for r in data.get("results", []):
        p = r["properties"]
        name = p["Name"]["title"][0]["plain_text"] if p["Name"]["title"] else "?"
        status = p["Status"]["status"]["name"] if p["Status"]["status"] else ""
        dl = p["Deadline"]["date"]["start"] if p["Deadline"]["date"] else None
        pr = p["Priority"]["select"]["name"] if p["Priority"]["select"] else ""
        
        task = {"name": name, "deadline": dl, "priority": pr, "status": status}
        
        if status == "☀️ Today":
            today_tasks.append(task)
        elif status == "🔄 In Progress":
            in_progress.append(task)
        elif status == "📅 Week":
            week_tasks.append(task)
        elif status == "🔮 Backlog":
            backlog.append(task)
        elif dl and dl < today:
            overdue.append(task)
    
    msg = f"📅 **Обзор задач — {datetime.now().strftime('%d.%m.%Y')}**\n\n"
    
    if in_progress:
        msg += "🔄 **In Progress:**\n"
        for t in in_progress:
            msg += f"  • {t['name']} ({t['priority']})\n"
        msg += "\n"
    
    if today_tasks:
        msg += "☀️ **На сегодня:**\n"
        for t in today_tasks:
            msg += f"  • {t['name']} ({t['priority']})\n"
        msg += "\n"
    
    if overdue:
        msg += "⚠️ **Просрочено:**\n"
        for t in overdue:
            msg += f"  • {t['name']} (дедлайн: {t['deadline']})\n"
        msg += "\n"
    
    if week_tasks:
        msg += "📅 **На эту неделю:**\n"
        for t in week_tasks:
            msg += f"  • {t['name']} ({t['priority']})\n"
        msg += "\n"
    
    if backlog:
        msg += f"🔮 **Backlog:** {len(backlog)} задач\n"
    
    if not any([today_tasks, in_progress, overdue, week_tasks]):
        msg += "🎉 На сегодня нет активных задач!"
    
    return msg

data = query_notion()
print(format_briefing(data))
