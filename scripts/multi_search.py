#!/usr/bin/env python3
"""
멀티 프로바이더 통합 검색 유틸리티
OpenAI + Anthropic + Gemini 3사를 동시에 검색하고 결과를 통합합니다.

사용법:
    python3 scripts/multi_search.py "검색어"
    python3 scripts/multi_search.py "검색어" --mode search|verify|deep
    python3 scripts/multi_search.py "검색어" --providers openai,anthropic,gemini
    python3 scripts/multi_search.py "검색어" --output research-output/sources/search-result.md
"""

import argparse
import json
import os
import sys
import concurrent.futures
from datetime import datetime


def run_openai_search(query: str, mode: str, lang: str) -> dict:
    """OpenAI Responses API + web_search 실행"""
    try:
        from openai_search import search, extract_response
        result = search(query, mode=mode, lang=lang)
        text = extract_response(result)
        return {"provider": "OpenAI", "status": "success", "text": text, "raw": result}
    except SystemExit:
        return {"provider": "OpenAI", "status": "error", "text": "API 키 미설정 또는 API 오류", "raw": None}
    except Exception as e:
        return {"provider": "OpenAI", "status": "error", "text": str(e), "raw": None}


def run_anthropic_search(query: str, mode: str, lang: str) -> dict:
    """Anthropic Claude Messages API + web_search 실행"""
    try:
        from anthropic_search import search, extract_response
        result = search(query, mode=mode, lang=lang)
        text = extract_response(result)
        return {"provider": "Anthropic", "status": "success", "text": text, "raw": result}
    except SystemExit:
        return {"provider": "Anthropic", "status": "error", "text": "API 키 미설정 또는 API 오류", "raw": None}
    except Exception as e:
        return {"provider": "Anthropic", "status": "error", "text": str(e), "raw": None}


def run_gemini_search(query: str, mode: str, lang: str) -> dict:
    """Gemini API + google_search 그라운딩 실행"""
    gemini_mode = "grounding" if mode == "search" else mode
    try:
        from gemini_search import search, extract_response
        result = search(query, mode=gemini_mode, lang=lang)
        text = extract_response(result)
        return {"provider": "Gemini", "status": "success", "text": text, "raw": result}
    except SystemExit:
        return {"provider": "Gemini", "status": "error", "text": "API 키 미설정 또는 API 오류", "raw": None}
    except Exception as e:
        return {"provider": "Gemini", "status": "error", "text": str(e), "raw": None}


def format_combined_report(query: str, results: list, mode: str) -> str:
    """통합 검색 보고서 생성"""
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    successful = [r for r in results if r["status"] == "success"]
    failed = [r for r in results if r["status"] == "error"]

    report = f"""# 멀티 프로바이더 검색 결과
_검색어: {query}_
_모드: {mode}_
_생성일: {now}_
_프로바이더: {', '.join(r['provider'] for r in results)}_
_성공: {len(successful)}/{len(results)}_

---

"""

    # 프로바이더별 결과
    for r in results:
        status_icon = "✅" if r["status"] == "success" else "❌"
        report += f"## {status_icon} {r['provider']} 검색 결과\n\n"
        report += r["text"] + "\n\n"
        report += "---\n\n"

    # 교차 검증 가이드
    if len(successful) >= 2:
        report += "## 📊 교차 검증 가이드\n\n"
        report += f"- 총 {len(successful)}개 프로바이더에서 검색 완료\n"
        report += "- 동일 정보가 2개 이상 프로바이더에서 확인되면 ✅ (높은 신뢰)\n"
        report += "- 1개 프로바이더에서만 나온 정보는 ⚠️ (추가 검증 필요)\n"
        report += "- 프로바이더 간 상충되는 정보는 🔴 (모순 추적 필요)\n\n"

    if failed:
        report += "## ⚠️ 검색 실패 프로바이더\n\n"
        for r in failed:
            report += f"- **{r['provider']}**: {r['text']}\n"
        report += "\n"

    return report


def main():
    parser = argparse.ArgumentParser(description="멀티 프로바이더 통합 검색")
    parser.add_argument("query", help="검색할 주제 또는 질문")
    parser.add_argument(
        "--mode",
        choices=["search", "verify", "deep"],
        default="search",
        help="검색 모드",
    )
    parser.add_argument(
        "--lang",
        choices=["ko", "en", "both"],
        default="both",
        help="검색 언어",
    )
    parser.add_argument(
        "--providers",
        default="openai,anthropic,gemini",
        help="사용할 프로바이더 (콤마 구분, 기본: openai,anthropic,gemini)",
    )
    parser.add_argument(
        "--output",
        help="결과를 저장할 파일 경로 (미지정 시 stdout 출력)",
    )
    parser.add_argument("--raw", action="store_true", help="원본 JSON 출력")

    args = parser.parse_args()
    providers = [p.strip().lower() for p in args.providers.split(",")]

    # 스크립트 디렉토리를 Python 경로에 추가
    script_dir = os.path.dirname(os.path.abspath(__file__))
    if script_dir not in sys.path:
        sys.path.insert(0, script_dir)

    print(f"🔍 멀티 프로바이더 검색 시작: '{args.query}'", file=sys.stderr)
    print(f"   프로바이더: {', '.join(providers)} | 모드: {args.mode} | 언어: {args.lang}", file=sys.stderr)

    # 병렬 검색 실행
    results = []
    search_funcs = {
        "openai": run_openai_search,
        "anthropic": run_anthropic_search,
        "gemini": run_gemini_search,
    }

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = {}
        for provider in providers:
            if provider in search_funcs:
                future = executor.submit(search_funcs[provider], args.query, args.mode, args.lang)
                futures[future] = provider

        for future in concurrent.futures.as_completed(futures):
            provider = futures[future]
            try:
                result = future.result(timeout=180)
                results.append(result)
                status = "✅" if result["status"] == "success" else "❌"
                print(f"   {status} {provider} 완료", file=sys.stderr)
            except Exception as e:
                results.append({
                    "provider": provider.capitalize(),
                    "status": "error",
                    "text": f"실행 오류: {str(e)}",
                    "raw": None,
                })
                print(f"   ❌ {provider} 오류: {e}", file=sys.stderr)

    # 결과 정렬 (프로바이더 이름순)
    results.sort(key=lambda r: r["provider"])

    if args.raw:
        output = json.dumps([r for r in results], ensure_ascii=False, indent=2, default=str)
    else:
        output = format_combined_report(args.query, results, args.mode)

    # 출력
    if args.output:
        os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(output)
        print(f"✅ 결과 저장: {args.output}", file=sys.stderr)
    else:
        print(output)

    print(f"🏁 멀티 프로바이더 검색 완료 ({len([r for r in results if r['status']=='success'])}/{len(results)} 성공)", file=sys.stderr)


if __name__ == "__main__":
    main()
