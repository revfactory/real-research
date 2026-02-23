#!/usr/bin/env python3
"""
OpenAI Web Search 유틸리티
OpenAI Responses API의 web_search 도구를 활용한 웹 검색 스크립트.

참고 문서: https://developers.openai.com/api/docs/guides/tools-web-search/

사용법:
    python3 scripts/openai_search.py "검색어"
    python3 scripts/openai_search.py "검색어" --mode search|verify|deep
    python3 scripts/openai_search.py "검색어" --lang ko|en|both
    python3 scripts/openai_search.py "검색어" --domains "pubmed.ncbi.nlm.nih.gov,fda.gov"
"""

import argparse
import json
import os
import sys
from datetime import datetime


def get_api_key():
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        print("ERROR: OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.", file=sys.stderr)
        sys.exit(1)
    return key


def search(
    query: str,
    mode: str = "search",
    lang: str = "both",
    model: str = "gpt-4.1",
    allowed_domains: list[str] | None = None,
    user_location: dict | None = None,
) -> dict:
    """
    OpenAI Responses API + web_search 도구를 사용한 웹 검색.

    Responses API는 tools에 {"type": "web_search"}를 전달합니다.
    - 도메인 필터: filters.allowed_domains (최대 100개)
    - 위치 기반: user_location (country, city, region, timezone)
    - 소스 포함: include=["web_search_call.action.sources"]
    """
    import urllib.request
    import urllib.error

    api_key = get_api_key()

    # 모드별 시스템 프롬프트
    system_prompts = {
        "search": (
            "당신은 웹 리서치 전문가입니다. 주어진 주제에 대해 포괄적으로 검색하고, "
            "핵심 정보를 구조화하여 정리해 주세요. 각 정보의 출처(URL)를 반드시 포함하세요. "
            "한국어와 영어 소스를 모두 활용하세요."
        ),
        "verify": (
            "당신은 팩트체크 전문가입니다. 주어진 주장/정보의 정확성을 검증하세요. "
            "원본 출처를 추적하고, 다른 소스에서의 확인 여부를 보고하세요. "
            "검증 결과를 '확인됨/부분확인/미확인/오류'로 분류하세요."
        ),
        "deep": (
            "당신은 심층 리서치 분석가입니다. 주어진 주제에 대해 다각도로 심층 검색하세요. "
            "찬성/반대 양측 의견, 역사적 맥락, 최신 동향, 전문가 견해를 모두 포함하세요. "
            "학술 자료, 업계 보고서, 뉴스 기사 등 다양한 소스를 활용하세요."
        ),
    }

    system_prompt = system_prompts.get(mode, system_prompts["search"])

    # 언어별 검색어 조정
    if lang == "ko":
        user_query = f"다음 주제에 대해 한국어 소스를 중심으로 검색해 주세요: {query}"
    elif lang == "en":
        user_query = f"Search comprehensively for the following topic using English sources: {query}"
    else:  # both
        user_query = (
            f"다음 주제에 대해 한국어와 영어 소스를 모두 활용하여 포괄적으로 검색해 주세요: {query}"
        )

    # web_search 도구 설정
    web_search_tool = {"type": "web_search"}
    if allowed_domains:
        web_search_tool["filters"] = {"allowed_domains": allowed_domains}
    if user_location:
        web_search_tool["user_location"] = user_location

    payload = {
        "model": model,
        "tools": [web_search_tool],
        "include": ["web_search_call.action.sources"],
        "input": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_query},
        ],
    }

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        "https://api.openai.com/v1/responses",
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8") if e.fp else ""
        print(f"ERROR: OpenAI API 호출 실패 (HTTP {e.code}): {error_body}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"ERROR: 네트워크 오류: {e.reason}", file=sys.stderr)
        sys.exit(1)

    return result


def extract_response(result: dict) -> str:
    """
    Responses API 응답에서 텍스트와 인용 추출.

    응답 구조 (output 배열):
    - type: "web_search_call" → 검색 실행 정보 (status, id)
    - type: "message" → content 배열 내 output_text + annotations
      - annotation.type: "url_citation" → url, title, start_index, end_index
    """
    output_parts = []
    citations = []
    search_sources = []

    if "output" not in result:
        return "(응답 없음)"

    for item in result["output"]:
        item_type = item.get("type")

        # 검색 호출 정보
        if item_type == "web_search_call":
            status = item.get("status", "unknown")
            # sources가 포함된 경우 (include 옵션)
            action = item.get("action", {})
            for source in action.get("sources", []):
                search_sources.append({
                    "title": source.get("title", ""),
                    "url": source.get("url", ""),
                })

        # 메시지 (텍스트 + 인용)
        elif item_type == "message":
            for content in item.get("content", []):
                if content.get("type") == "output_text":
                    output_parts.append(content["text"])
                    for annotation in content.get("annotations", []):
                        if annotation.get("type") == "url_citation":
                            citations.append({
                                "title": annotation.get("title", ""),
                                "url": annotation.get("url", ""),
                            })

    text = "\n".join(output_parts)

    # 인용 URL 정리
    if citations:
        text += "\n\n---\n### 인용 출처 (Citations)\n"
        seen = set()
        for c in citations:
            key = c["url"]
            if key and key not in seen:
                seen.add(key)
                text += f"- [{c['title']}]({c['url']})\n"

    # 검색 소스 (include 옵션으로 가져온 전체 소스)
    if search_sources:
        text += "\n### 검색 소스 (Sources)\n"
        seen_sources = set()
        for s in search_sources:
            key = s["url"]
            if key and key not in seen_sources:
                seen_sources.add(key)
                text += f"- [{s['title']}]({s['url']})\n"

    return text


def main():
    parser = argparse.ArgumentParser(description="OpenAI Web Search 유틸리티 (Responses API)")
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
        default="gpt-4.1",
        help="사용할 OpenAI 모델 (기본: gpt-4.1)",
    )
    parser.add_argument(
        "--domains",
        default=None,
        help="허용 도메인 (콤마 구분, 예: pubmed.ncbi.nlm.nih.gov,fda.gov)",
    )
    parser.add_argument(
        "--country",
        default=None,
        help="검색 위치 국가 코드 (예: KR, US, GB)",
    )
    parser.add_argument("--raw", action="store_true", help="원본 JSON 출력")

    args = parser.parse_args()

    # 도메인 필터
    allowed_domains = None
    if args.domains:
        allowed_domains = [d.strip() for d in args.domains.split(",")]

    # 위치 설정
    user_location = None
    if args.country:
        user_location = {"type": "approximate", "country": args.country}

    print(f"🔍 OpenAI Web Search: '{args.query}' (mode={args.mode}, lang={args.lang})", file=sys.stderr)

    result = search(
        args.query,
        mode=args.mode,
        lang=args.lang,
        model=args.model,
        allowed_domains=allowed_domains,
        user_location=user_location,
    )

    if args.raw:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        text = extract_response(result)
        print(text)


if __name__ == "__main__":
    main()
