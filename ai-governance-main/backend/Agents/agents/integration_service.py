import os
import re
import json
import asyncio
from typing import List, Dict, Any
from atlassian import Jira, Confluence
from dotenv import load_dotenv

# MCP and LLM Imports
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from langchain_openai import ChatOpenAI

load_dotenv()

class AtlassianIntegration:
    def __init__(self):
        self.url = os.getenv("ATLASSIAN_URL")
        self.username = os.getenv("ATLASSIAN_EMAIL")
        self.password = os.getenv("ATLASSIAN_API_TOKEN")
        self.jira_client = None

    def _init_jira(self):
        if not self.jira_client and all([self.url, self.username, self.password]):
            self.jira_client = Jira(url=self.url, username=self.username, password=self.password, cloud=True)
        return self.jira_client

    def _init_confluence(self):
        if all([self.url, self.username, self.password]):
            return Confluence(url=self.url, username=self.username, password=self.password, cloud=True)
        return None

    async def _jira_mcp_operation(self, query: str = "issuetype IN (Epic, Story, Task, Requirement, Feature)") -> List[Dict[str, Any]]:
        if not all([self.url, self.username, self.password]):
            print("[MCP ERROR] Missing credentials.")
            return []

        # 1. Hybrid Discovery (REST API for reliable listing)
        keys = []
        all_content = ""
        jira = self._init_jira()
        if jira:
            try:
                # If query is just "issuetype = Epic", override with broader one for better discovery
                if query == "issuetype = Epic":
                    query = "issuetype IN (Epic, Story, Task, Requirement, Feature)"
                
                print(f"[MCP-Jira] Discovering issues via REST (JQL: {query})...")
                issues = jira.jql(query, limit=50)
                for issue in issues.get('issues', []):
                    keys.append(issue['key'])
                print(f"[MCP-Jira] Found {len(keys)} issues: {keys}")
            except Exception as e:
                print(f"[MCP-Jira] REST discovery error: {e}")

        # 2. MCP for Deep Reading (Comments, links, etc.)
        cmd, args = ("npx.cmd" if os.name == 'nt' else "npx", ["-y", "@modelcontextprotocol/server-jira"])
        
        server_params = StdioServerParameters(
            command=cmd, args=args,
            env={**os.environ, "JIRA_URL": self.url, "JIRA_EMAIL": self.username, "JIRA_API_TOKEN": self.password}
        )

        try:
            async with stdio_client(server_params) as (read, write):
                async with ClientSession(read, write) as session:
                    print("[MCP-Jira] Initializing session...")
                    await asyncio.wait_for(session.initialize(), timeout=30.0)
                    
                    tools_res = await session.list_tools()
                    available_tools = [t.name for t in tools_res.tools]
                    print(f"[MCP-Jira] Available tools: {available_tools}")
                    get_issue_tool = next((t for t in available_tools if "get_issue" in t), None)

                    if keys and get_issue_tool:
                        print(f"[MCP-Jira] Deep reading {len(keys[:15])} issues using {get_issue_tool}...")
                        for key in keys[:15]:
                            try:
                                res = await session.call_tool(get_issue_tool, {"issueKey": key})
                                if res and res.content:
                                    all_content += f"\n--- Issue {key} ---\n{res.content[0].text}\n"
                                    print(f"[MCP-Jira] Read issue {key} via MCP")
                            except Exception as e:
                                print(f"[MCP-Jira] MCP read error for {key}: {e}")

        except Exception as e:
            print(f"[MCP-Jira Exception] {e}")

        # 3. Final Content check & REST Fallback (if MCP failed or returned nothing)
        if not all_content and jira and keys:
            print("[MCP-Jira] No MCP content. Using REST fallback for all issues...")
            for key in keys[:20]:
                try:
                    issue = jira.issue(key)
                    all_content += f"\n--- Issue {key} ---\nSummary: {issue['fields']['summary']}\nDescription: {issue['fields'].get('description', '')}\n"
                    print(f"[MCP-Jira] Read issue {key} via REST")
                except Exception as e:
                    print(f"[MCP-Jira] REST read error for {key}: {e}")

        if not all_content: 
            print("[MCP-Jira] No content collected from any source.")
            return []

        # 4. AI Extraction
        try:
            llm = ChatOpenAI(model=os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini"), temperature=0.1)
            prompt = f"""
            Analyze these Jira issues: {all_content[:35000]}
            Extract all security requirements or project goals.
            Format as a JSON list. Every item MUST have 'id', 'title', 'description', 'category', 'priority', 'status', and '"source": "jira"'.
            Return ONLY JSON.
            """
            print(f"[MCP-Jira] AI analyzing {len(all_content)} characters...")
            res = llm.invoke(prompt)
            
            raw_text = ""
            if isinstance(res.content, str): raw_text = res.content
            elif isinstance(res.content, list):
                for part in res.content:
                    if isinstance(part, dict) and "text" in part: raw_text += part["text"]
                    else: raw_text += str(part)
            
            raw_text = raw_text.strip()
            if "```json" in raw_text: raw_text = raw_text.split("```json")[1].split("```")[0].strip()
            elif "```" in raw_text: raw_text = raw_text.split("```")[1].split("```")[0].strip()
            
            return json.loads(raw_text)
        except Exception as e:
            print(f"[MCP-Jira AI Error] {e}")
            return []

    async def fetch_jira_issues(self, query: str = "issuetype IN (Epic, Story, Task, Requirement, Feature)") -> List[Dict[str, Any]]:
        return await self._jira_mcp_operation(query)

    async def _confluence_mcp_operation(self, query: str, page_id: str = None, mode: str = "requirements") -> List[Dict[str, Any]]:
        if not all([self.url, self.username, self.password]):
            print("[MCP ERROR] Missing credentials.")
            return []

        # 1. Hybrid Discovery
        pids = []
        conf = self._init_confluence()
        if conf:
            try:
                print("[MCP] Discovering pages via REST API...")
                if page_id:
                    pids = [str(page_id)]
                else:
                    spaces = conf.get_all_spaces(limit=10)
                    for space in spaces.get('results', []):
                        skey = space.get('key')
                        print(f"[MCP] Scanning space: {skey}")
                        pages = conf.get_all_pages_from_space(skey, limit=50)
                        for page in pages:
                            pids.append(page.get('id'))
                    
                    if not pids:
                        search_results = conf.search(query, limit=20)
                        for res in search_results:
                            if res.get('content'): pids.append(res['content']['id'])
                
                pids = list(set(pids))
                print(f"[MCP] REST API discovered {len(pids)} unique pages.")
            except Exception as e:
                print(f"[MCP] REST discovery error: {e}")

        # 2. MCP for Deep Reading
        mcp_script_path = os.path.join("node_modules", "@aashari", "mcp-server-atlassian-confluence", "dist", "index.js")
        abs_mcp_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", mcp_script_path))
        cmd, args = ("node", [abs_mcp_path]) if os.path.exists(abs_mcp_path) else ("npx.cmd" if os.name == 'nt' else "npx", ["-y", "@modelcontextprotocol/server-confluence"])

        site_name = self.url.replace("https://", "").split(".")[0]
        server_params = StdioServerParameters(
            command=cmd, args=args,
            env={**os.environ, "ATLASSIAN_SITE_NAME": site_name, "ATLASSIAN_URL": self.url, "ATLASSIAN_USER_EMAIL": self.username, "ATLASSIAN_API_TOKEN": self.password, "PATH": os.getenv("PATH", "")}
        )

        try:
            async with stdio_client(server_params) as (read, write):
                async with ClientSession(read, write) as session:
                    await asyncio.wait_for(session.initialize(), timeout=30.0)
                    
                    tools_res = await session.list_tools()
                    available_tools = [t.name for t in tools_res.tools]
                    print(f"[MCP] Available MCP tools: {available_tools}")
                    
                    read_tool = next((t for t in available_tools if re.search(r"get.*page|read.*page|get.*content.*id|conf_get|read.*", t, re.I)), None)
                    if read_tool: print(f"[MCP] Selected reading tool: {read_tool}")

                    all_collected_content = ""
                    attachments_info = ""
                    if pids:
                        print(f"[MCP] Attempting to read {len(pids[:20])} pages...")
                        for pid in pids[:20]:
                            content = None
                            if read_tool:
                                for arg_name in ("pageId", "id", "contentId", "page_id"):
                                    try:
                                        res = await session.call_tool(read_tool, {arg_name: str(pid)})
                                        if res and not getattr(res, "isError", False) and res.content:
                                            txt = res.content[0].text
                                            if not (txt.startswith("Input validation error") or "MCP Error" in txt[:50]):
                                                content = txt
                                                print(f"[MCP] Read page {pid} via MCP (arg={arg_name})")
                                                break
                                    except: pass

                            if not content and conf:
                                try:
                                    pdata = conf.get_page_by_id(pid, expand='body.storage')
                                    if pdata and 'body' in pdata:
                                        raw_html = pdata['body']['storage']['value']
                                        content = re.sub('<[^<]+?>', '', raw_html)
                                        print(f"[MCP] Read page {pid} via REST Fallback")
                                except Exception as e:
                                    print(f"[MCP] REST read error for {pid}: {e}")
                            
                            if conf:
                                try:
                                    attachments = conf.get_attachments_from_content(pid, limit=10)
                                    for att in attachments.get('results', []):
                                        attachments_info += f"\n- Attached File: {att.get('title')} (Type: {att.get('metadata', {}).get('mediaType')})\n"
                                        print(f"[MCP] Discovered attachment: {att.get('title')}")
                                except Exception as e:
                                    print(f"[MCP] Attachment discovery error: {e}")

                            if content and len(content.strip()) > 10:
                                all_collected_content += f"\n--- Page {pid} ---\n{content}\n"

                    if not all_collected_content: return []

                    # 3. AI Extraction
                    llm = ChatOpenAI(model=os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini"), temperature=0.1)
                    prompt = f"""
                    Analyze these Confluence pages: {all_collected_content[:40000]}
                    {attachments_info}
                    Extract all security or technical requirements.
                    Format as a JSON list. Every item MUST have 'id', 'title', 'description', 'category', 'priority', 'status', and '"source": "confluence"'.
                    Return ONLY JSON.
                    """
                    print(f"[MCP] Analyzing {len(all_collected_content)} characters...")
                    res = llm.invoke(prompt)
                    
                    raw_text = res.content
                    if "```json" in raw_text: raw_text = raw_text.split("```json")[1].split("```")[0].strip()
                    elif "```" in raw_text: raw_text = raw_text.split("```")[1].split("```")[0].strip()
                    
                    return json.loads(raw_text)
        except Exception as e:
            print(f"[MCP Exception] {e}")
            return []

    async def extract_requirements_mcp(self, query: str = "security requirements", page_id: str = None) -> List[Dict[str, Any]]:
        return await self._confluence_mcp_operation(query, page_id, mode="requirements")

    async def extract_assets_mcp(self, query: str = "assets inventory") -> List[Dict[str, Any]]:
        return await self._confluence_mcp_operation(query, mode="assets")

integration_service = AtlassianIntegration()
