#!/usr/bin/env python3
"""
Anthropic Claude Web Search & Fetch 유틸리티
Claude Messages API의 web_search + web_fetch 서버 도구를 활용한 검색 스크립트.

참고 문서:
- Web Search: https://platform.claude.com/docs/ko/agents-and-tools/tool-use/web-search-tool
- Web Fetch: https://platform.claude.com/docs/ko/agents-and-tools/tool-use/web-fetch-tool

사용법:
    python3 scripts/anthropic_search.py "검색어"
    python3 scripts/anthropic_search.py "검색어" --mode search|verify|deep
    python3 scripts/anthropic_search.py "검색어" --fetch  # 검색 후 상위 결과 페치
    python3 scripts/anthropic_search.py "검색어" --dynamic  # 동적 필터링 (Opus 4.6/Sonnet 4.6)
"""

import argparse
import json
import os
import sys
from datetime import datetime


def get_api_key():
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        print("ERROR: ANTHROPIC_API_KEY 환경 변수가 설정되지 않았습니다.", file=sys.stderr)
        sys.exit(1)
    return key


def search(
    query: str,
    mode: str = "search",
    lang: str = "both",
    model: str = "claude-sonnet-4-6",
    max_search_uses: int = 5,
    allowed_domains: list[str] | None = None,
    blocked_domains: list[str] | None = None,
    enable_fetch: bool = False,
    dynamic_filtering: bool = False,
    user_location: dict | None = None,
) -> dict:
    """
    Claude Messages API + web_search / web_fetch 서버 도구를 사용한 검색.

    도구 타입:
    - web_search_20250305: 기본 웹 검색
    - web_search_20260209: 동적 필터링 지원 (Opus 4.6, Sonnet 4.6)
    - web_fetch_20250910: 기본 웹 페치
    - web_fetch_20260209: 동적 필터링 지원

    동적 필터링은 code-execution-web-tools-2026-02-09 베타 헤더 필요.
    """
    import urllib.request
    import urllib.error

    api_key = get_api_key()

    # 모드별 시스템 프롬프트
    system_prompts = {
        "search": (
            "당신은 웹 리서치 전문가입니다. 웹 검색을 활용하여 주어진 주제에 대해 "
            "포괄적이고 정확한 정보를 수집하세요. 모든 정보의 출처를 명시하세요. "
            "한국어와 영어 소스를 모두 활용하세요."
        ),
        "verify": (
            "당신은 팩트체크 전문가입니다. 웹 검색으로 주어진 주장의 정확성을 검증하세요. "
            "원본 출처를 추적하고, 검증 결과를 '확인됨/부분확인/미확인/오류'로 분류하세요."
        ),
        "deep": (
            "당신은 심층 리서치 분석가입니다. 웹 검색을 최대한 활용하여 주제의 "
            "다양한 측면(역사, 현재, 미래 전망, 찬반 의견)을 모두 조사하세요. "
            "학술 자료, 업계 보고서, 뉴스 기사 등 다양한 소스를 활용하세요."
        ),
    }

    system_prompt = system_prompts.get(mode, system_prompts["search"])

    # 언어별 검색어 조정
    if lang == "ko":
        user_query = f"다음 주제에 대해 한국어 소스를 중심으로 검색해 주세요: {query}"
    elif lang == "en":
        user_query = f"Search comprehensively for the following topic in English: {query}"
    else:
        user_query = f"다음 주제에 대해 한국어와 영어 소스를 모두 활용하여 포괄적으로 검색해 주세요: {query}"

    # 도구 설정
    if dynamic_filtering:
        search_tool_type = "web_search_20260209"
        fetch_tool_type = "web_fetch_20260209"
    else:
        search_tool_type = "web_search_20250305"
        fetch_tool_type = "web_fetch_20250910"

    web_search_tool = {
        "type": search_tool_type,
        "name": "web_search",
        "max_uses": max_search_uses,
    }

    if allowed_domains:
        web_search_tool["allowed_domains"] = allowed_domains
    if blocked_domains:
        web_search_tool["blocked_domains"] = blocked_domains
    if user_location:
        web_search_tool["user_location"] = user_location

    tools = [web_search_tool]

    if enable_fetch:
        fetch_tool = {
            "type": fetch_tool_type,
            "name": "web_fetch",
            "max_uses": 5,
            "citations": {"enabled": True},
        }
        if allowed_domains:
            fetch_tool["allowed_domains"] = allowed_domains
        tools.append(fetch_tool)

    payload = {
        "model": model,
        "max_tokens": 4096,
        "system": system_prompt,
        "messages": [
            {"role": "user", "content": user_query},
        ],
        "tools": tools,
    }

    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
    }

    if dynamic_filtering:
        headers["anthropic-beta"] = "code-execution-web-tools-2026-02-09"

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=data,
        headers=headers,
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            result = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8") if e.fp else ""
        print(f"ERROR: Anthropic API 호출 실패 (HTTP {e.code}): {error_body}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"ERROR: 네트워크 오류: {e.reason}", file=sys.stderr)
        sys.exit(1)

    return result


def extract_response(result: dict) -> str:
    """
    Claude Messages API 응답에서 텍스트와 인용 추출.

    응답 content 배열 구조:
    - type: "text" → 텍스트 (citations 배열 포함 가능)
      - citation.type: "web_search_result_location" → url, title, cited_text
    - type: "server_tool_use" → 검색/페치 실행 (name: "web_search" | "web_fetch")
    - type: "web_search_tool_result" → 검색 결과
      - content[].type: "web_search_result" → url, title, page_age, encrypted_content
    - type: "web_fetch_tool_result" → 페치 결과
    """
    output_parts = []
    citations = []
    search_results = []

    content_blocks = result.get("content", [])

    for block in content_blocks:
        block_type = block.get("type")

        # 텍스트 블록 (인용 포함 가능)
        if block_type == "text":
            text = block.get("text", "")
            if text.strip():
                output_parts.append(text)

            # 인용 추출
            for citation in block.get("citations", []):
                if citation.get("type") == "web_search_result_location":
                    citations.append({
                        "url": citation.get("url", ""),
                        "title": citation.get("title", ""),
                        "cited_text": citation.get("cited_text", ""),
                    })
                elif citation.get("type") == "char_location":
                    citations.append({
                        "url": "",
                        "title": citation.get("document_title", ""),
                        "cited_text": citation.get("cited_text", ""),
                    })

        # 검색 결과
        elif block_type == "web_search_tool_result":
            for item in block.get("content", []):
                if isinstance(item, dict) and item.get("type") == "web_search_result":
                    search_results.append({
                        "url": item.get("url", ""),
                        "title": item.get("title", ""),
                        "page_age": item.get("page_age", ""),
                    })

    text = "\n".join(output_parts)

    # 인용
    if citations:
        text += "\n\n---\n### 인용 (Citations)\n"
        seen = set()
        for c in citations:
            key = c["url"] or c["title"]
            if key and key not in seen:
                seen.add(key)
                if c["url"]:
                    text += f"- [{c['title']}]({c['url']})\n"
                else:
                    text += f"- {c['title']}\n"
                if c["cited_text"]:
                    text += f"  > {c['cited_text'][:150]}...\n"

    # 검색에서 발견된 소스
    if search_results:
        text += "\n### 검색 결과 소스\n"
        seen_urls = set()
        for sr in search_results:
            if sr["url"] and sr["url"] not in seen_urls:
                seen_urls.add(sr["url"])
                age_str = f" ({sr['page_age']})" if sr["page_age"] else ""
                text += f"- [{sr['title']}]({sr['url']}){age_str}\n"

    # 사용량 정보
    usage = result.get("usage", {})
    server_tool_use = usage.get("server_tool_use", {})
    search_count = server_tool_use.get("web_search_requests", 0)
    fetch_count = server_tool_use.get("web_fetch_requests", 0)
    if search_count or fetch_count:
        text += f"\n_사용량: 검색 {search_count}회, 페치 {fetch_count}회_\n"

    return text


def main():
    parser = argparse.ArgumentParser(description="Anthropic Claude Web Search 유틸리티")
    parser.add_argument("query", help="검색할 주제 또는 질문")
    parser.add_argument(
        "--mode",
        choices=["search", "verify", "deep"],
        default="search",
        help="검색 모드: search(일반), verify(팩트체크), deep(심층)",
    )
    parser.add_argument(
        "--lang",
        choices=["ko", "en", "both"],
        default="both",
        help="검색 언어: ko(한국어), en(영어), both(양쪽)",
    )
    parser.add_argument(
        "--model",
        default="claude-sonnet-4-6",
        help="사용할 Claude 모델 (기본: claude-sonnet-4-6)",
    )
    parser.add_argument(
        "--max-searches",
        type=int,
        default=5,
        help="최대 검색 횟수 (기본: 5)",
    )
    parser.add_argument(
        "--domains",
        default=None,
        help="허용 도메인 (콤마 구분)",
    )
    parser.add_argument(
        "--block-domains",
        default=None,
        help="차단 도메인 (콤마 구분)",
    )
    parser.add_argument(
        "--fetch",
        action="store_true",
        help="web_fetch도 함께 활성화 (검색 후 상위 결과 페치)",
    )
    parser.add_argument(
        "--dynamic",
        action="store_true",
        help="동적 필터링 활성화 (Opus 4.6/Sonnet 4.6 전용)",
    )
    parser.add_argument("--raw", action="store_true", help="원본 JSON 출력")

    args = parser.parse_args()

    allowed_domains = [d.strip() for d in args.domains.split(",")] if args.domains else None
    blocked_domains = [d.strip() for d in args.block_domains.split(",")] if args.block_domains else None

    print(f"🔍 Claude Web Search: '{args.query}' (mode={args.mode}, model={args.model})", file=sys.stderr)

    result = search(
        args.query,
        mode=args.mode,
        lang=args.lang,
        model=args.model,
        max_search_uses=args.max_searches,
        allowed_domains=allowed_domains,
        blocked_domains=blocked_domains,
        enable_fetch=args.fetch,
        dynamic_filtering=args.dynamic,
    )

    if args.raw:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        text = extract_response(result)
        print(text)


if __name__ == "__main__":
    main()
