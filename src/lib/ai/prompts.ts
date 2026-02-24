interface PromptSet {
  system: string;
  user: (query: string, language: 'ko' | 'en' | 'both') => string;
}

const SEARCH_PROMPTS: PromptSet = {
  system:
    '당신은 웹 리서치 전문가입니다. 웹 검색을 활용하여 주어진 주제에 대해 ' +
    '포괄적이고 정확한 정보를 수집하세요. 모든 정보의 출처를 명시하세요. ' +
    '핵심 사실, 주요 플레이어, 최신 동향을 중심으로 정리하세요.',
  user: (query, language) => {
    if (language === 'ko') return `다음 주제에 대해 한국어 소스를 중심으로 검색하세요: ${query}`;
    if (language === 'en') return `Search comprehensively for the following topic in English: ${query}`;
    return `다음 주제에 대해 한국어와 영어 소스를 모두 활용하여 포괄적으로 검색하세요: ${query}`;
  },
};

const VERIFY_PROMPTS: PromptSet = {
  system:
    '당신은 팩트체크 전문가입니다. 웹 검색으로 주어진 주장의 정확성을 검증하세요. ' +
    '원본 출처를 추적하고, 검증 결과를 \'확인됨/부분확인/미확인/오류\'로 분류하세요. ' +
    '근거가 되는 소스를 반드시 명시하세요.',
  user: (query, language) => {
    if (language === 'ko') return `다음 주장을 한국어 소스로 검증하세요: "${query}"`;
    if (language === 'en') return `Verify the following claim using English sources: "${query}"`;
    return `다음 주장을 검증하세요 (한국어/영어 소스 모두 활용): "${query}"`;
  },
};

const DEEP_PROMPTS: PromptSet = {
  system:
    '당신은 심층 리서치 분석가입니다. 웹 검색을 최대한 활용하여 주제의 ' +
    '다양한 측면(역사, 현재, 미래 전망, 찬반 의견)을 모두 조사하세요. ' +
    '학술 자료, 업계 보고서, 뉴스 기사 등 다양한 소스를 활용하세요. ' +
    '정보의 신뢰도를 평가하고, 서로 상충하는 관점이 있다면 모두 포함하세요.',
  user: (query, language) => {
    if (language === 'ko') return `다음 주제에 대해 한국어 소스를 중심으로 심층 조사하세요: ${query}`;
    if (language === 'en') return `Conduct deep research on the following topic in English: ${query}`;
    return `다음 주제에 대해 한국어와 영어 소스를 모두 활용하여 심층 조사하세요: ${query}`;
  },
};

const PROMPT_MAP: Record<string, PromptSet> = {
  search: SEARCH_PROMPTS,
  verify: VERIFY_PROMPTS,
  deep: DEEP_PROMPTS,
};

export function getPrompts(mode: 'search' | 'verify' | 'deep' = 'search'): PromptSet {
  return PROMPT_MAP[mode] || SEARCH_PROMPTS;
}

/** Mode-specific maxResults defaults */
export function getDefaultMaxResults(mode: 'search' | 'verify' | 'deep' = 'search'): number {
  switch (mode) {
    case 'verify': return 3;
    case 'deep': return 8;
    case 'search':
    default: return 5;
  }
}
