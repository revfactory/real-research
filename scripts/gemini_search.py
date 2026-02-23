#!/usr/bin/env python3
"""
Google Gemini Grounding Search 유틸리티
Gemini API의 Google Search 그라운딩 기능을 활용한 웹 검색 스크립트.

참고 문서: https://ai.google.dev/gemini-api/docs/google-search?hl=ko

사용법:
    python3 scripts/gemini_search.py "검색어"
    python3 scripts/gemini_search.py "검색어" --mode grounding|verify|deep
    python3 scripts/gemini_search.py "검색어" --lang ko|en|both
"""

import argparse
import json
import os
import sys
from datetime import datetime


def get_api_key():
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not key:
        print(
            "ERROR: GEMINI_API_KEY 또는 GOOGLE_API_KEY 환경 변수가 설정되지 않았습니다.",
            file=sys.stderr,
        )
        sys.exit(1)
    return key


def search(
    query: str,
    mode: str = "grounding",
    lang: str = "both",
    model: str = "gemini-2.5-flash",
) -> dict:
    """
    Gemini API + google_search 도구를 사용한 그라운딩 검색.

    tools에 {"google_search": {}} 를 전달하면 Google Search 그라운딩이 활성화됩니다.
    응답의 groundingMetadata에서:
    - webSearchQueries: 모델이 사용한 검색어
    - groundingChunks: 웹 소스의 URI와 제목
    - groundingSupports: 응답 텍스트를 소스에 매핑 (startIndex, endIndex, groundingChunkIndices)
    """
    import urllib.request
    import urllib.error

    api_key = get_api_key()

    # 모드별 시스템 프롬프트
    system_prompts = {
        "grounding": (
            "당신은 웹 리서치 전문가입니다. Google 검색을 활용하여 주어진 주제에 대해 "
            "포괄적이고 정확한 정보를 수집하세요. 모든 정보의 출처를 명시하세요."
        ),
        "verify": (
            "당신은 팩트체크 전문가입니다. Google 검색으로 주어진 주장의 정확성을 검증하세요. "
            "원본 출처를 추적하고 검증 결과를 보고하세요."
        ),
        "deep": (
            "당신은 심층 리서치 분석가입니다. Google 검색을 최대한 활용하여 주제의 "
            "다양한 측면(역사, 현재, 미래 전망, 찬반 의견)을 모두 조사하세요."
        ),
    }

    system_prompt = system_prompts.get(mode, system_prompts["grounding"])

    # 언어별 검색어 조정
    if lang == "ko":
        user_query = f"다음 주제에 대해 한국어 중심으로 검색해 주세요: {query}"
    elif lang == "en":
        user_query = f"Search comprehensively for the following topic in English: {query}"
    else:
        user_query = f"다음 주제에 대해 한국어와 영어 양쪽에서 검색해 주세요: {query}"

    payload = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": [
            {
                "role": "user",
                "parts": [{"text": user_query}],
            }
        ],
        "tools": [{"google_search": {}}],
    }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8") if e.fp else ""
        print(f"ERROR: Gemini API 호출 실패 (HTTP {e.code}): {error_body}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"ERROR: 네트워크 오류: {e.reason}", file=sys.stderr)
        sys.exit(1)

    return result


def extract_response(result: dict) -> str:
    """
    Gemini API 응답에서 텍스트와 그라운딩 정보 추출.

    groundingMetadata 구조:
    - webSearchQueries: 모델이 사용한 검색어 배열
    - searchEntryPoint: 검색 추천용 HTML/CSS
    - groundingChunks: [{web: {uri, title}}, ...] 웹 소스 목록
    - groundingSupports: [{segment: {startIndex, endIndex, text}, groundingChunkIndices: [...]}]
      → 응답 텍스트의 특정 부분을 소스에 매핑
    """
    output_parts = []
    sources = []
    supports = []
    search_queries = []

    candidates = result.get("candidates", [])
    for candidate in candidates:
        content = candidate.get("content", {})
        for part in content.get("parts", []):
            if "text" in part:
                output_parts.append(part["text"])

        # 그라운딩 메타데이터
        grounding = candidate.get("groundingMetadata", {})

        # 검색 쿼리
        search_queries = grounding.get("webSearchQueries", [])

        # 소스 청크 (URI + 제목)
        for chunk in grounding.get("groundingChunks", []):
            web = chunk.get("web", {})
            if web.get("uri"):
                sources.append({
                    "title": web.get("title", ""),
                    "url": web["uri"],
                })

        # 그라운딩 서포트 (텍스트 ↔ 소스 매핑)
        for support in grounding.get("groundingSupports", []):
            segment = support.get("segment", {})
            chunk_indices = support.get("groundingChunkIndices", [])
            confidence_scores = support.get("confidenceScores", [])
            supports.append({
                "text": segment.get("text", ""),
                "start": segment.get("startIndex", 0),
                "end": segment.get("endIndex", 0),
                "chunk_indices": chunk_indices,
                "confidence": confidence_scores,
            })

    text = "\n".join(output_parts)

    # 그라운딩 소스
    if sources:
        text += "\n\n---\n### 출처 (Google Search Grounding)\n"
        seen = set()
        for i, s in enumerate(sources):
            if s["url"] not in seen:
                seen.add(s["url"])
                text += f"- [{s['title']}]({s['url']})\n"

    # 그라운딩 서포트 (텍스트-소스 매핑 요약)
    if supports:
        text += "\n### 그라운딩 서포트 (텍스트-소스 매핑)\n"
        for sup in supports[:10]:  # 상위 10개만 표시
            chunk_refs = []
            for idx in sup["chunk_indices"]:
                if idx < len(sources):
                    chunk_refs.append(sources[idx]["title"] or sources[idx]["url"])
            confidence_str = ""
            if sup["confidence"]:
                avg_conf = sum(sup["confidence"]) / len(sup["confidence"])
                confidence_str = f" (신뢰도: {avg_conf:.0%})"
            snippet = sup["text"][:100] + ("..." if len(sup["text"]) > 100 else "")
            text += f"- \"{snippet}\"{confidence_str}\n"
            for ref in chunk_refs:
                text += f"  ← {ref}\n"

    # 사용된 검색 쿼리
    if search_queries:
        text += "\n### 사용된 검색 쿼리\n"
        for q in search_queries:
            text += f"- {q}\n"

    return text


def main():
    parser = argparse.ArgumentParser(description="Gemini Grounding Search 유틸리티")
    parser.add_argument("query", help="검색할 주제 또는 질문")
    parser.add_argument(
        "--mode",
        choices=["grounding", "verify", "deep"],
        default="grounding",
        help="검색 모드: grounding(일반), verify(팩트체크), deep(심층)",
    )
    parser.add_argument(
        "--lang",
        choices=["ko", "en", "both"],
        default="both",
        help="검색 언어: ko(한국어), en(영어), both(양쪽)",
    )
    parser.add_argument(
        "--model",
        default="gemini-2.5-flash",
        help="사용할 Gemini 모델 (기본: gemini-2.5-flash)",
    )
    parser.add_argument("--raw", action="store_true", help="원본 JSON 출력")

    args = parser.parse_args()

    print(f"🔍 Gemini Grounding Search: '{args.query}' (mode={args.mode}, lang={args.lang})", file=sys.stderr)

    result = search(args.query, mode=args.mode, lang=args.lang, model=args.model)

    if args.raw:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        text = extract_response(result)
        print(text)


if __name__ == "__main__":
    main()
