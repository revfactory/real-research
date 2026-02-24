import Link from 'next/link';
import {
  Globe,
  Layers,
  ShieldCheck,
  Brain,
  ShieldAlert,
  Network,
  Rocket,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const phases = [
  { icon: Brain, label: '심층 분석', color: '#2563EB' },
  { icon: ShieldAlert, label: '비판적 사고', color: '#7C3AED' },
  { icon: Network, label: '지식 통합', color: '#059669' },
  { icon: Rocket, label: '실전 적용', color: '#D97706' },
];

const features = [
  {
    icon: Globe,
    title: '3사 AI 통합 검색',
    description: 'OpenAI, Claude, Gemini가 병렬로 웹 검색하여 다각도 자료를 수집합니다.',
  },
  {
    icon: Layers,
    title: '4단계 심층 분석',
    description:
      '전문가 분석, 레드팀 비판, 프레임워크 구축, 실행 계획까지 체계적으로 수행합니다.',
  },
  {
    icon: ShieldCheck,
    title: '교차 팩트체크',
    description: '3사 AI가 교차 검증하여 A~F 신뢰도 등급을 자동으로 부여합니다.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">R</span>
            </div>
            <span className="font-semibold">Real Research</span>
          </div>
          <Link href="/login">
            <Button variant="outline" size="sm">
              로그인
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-[1200px] mx-auto px-4 pt-24 pb-20 text-center relative">
        {/* Glow effect behind hero */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-hero blur-[100px] opacity-50 pointer-events-none rounded-full" />
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-gradient relative z-10">
          AI 리서치의 새로운 기준
        </h1>
        <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto relative z-10">
          OpenAI, Claude, Gemini가 함께 만드는 10단계 심층 리서치
        </p>
        <div className="relative z-10">
          <Link href="/login">
            <Button size="lg" className="h-14 px-8 text-lg font-medium gap-3 rounded-full bg-gradient-primary hover:shadow-lg hover:shadow-purple-500/30 transition-all hover:-translate-y-1">
              <GoogleIcon />
              Google로 시작하기
            </Button>
          </Link>
        </div>

        {/* Pipeline visualization */}
        <div className="flex items-center justify-center gap-4 mt-20 flex-wrap relative z-10">
          {phases.map((phase, idx) => (
            <div key={phase.label} className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-3">
                <div
                  className="h-16 w-16 rounded-2xl flex items-center justify-center animate-float shadow-lg transition-all duration-300 hover:scale-110"
                  style={{ 
                    backgroundColor: `${phase.color}15`, 
                    boxShadow: `0 10px 30px -10px ${phase.color}40`,
                    animationDelay: `${idx * 0.2}s`
                  }}
                >
                  <phase.icon className="h-7 w-7" style={{ color: phase.color }} />
                </div>
                <span className="text-sm font-semibold text-muted-foreground">
                  {phase.label}
                </span>
              </div>
              {idx < phases.length - 1 && (
                <ArrowRight className="h-5 w-5 text-muted-foreground/30 mb-8" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-[1200px] mx-auto px-4 pb-24 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="group transition-all duration-300 hover:-translate-y-2 hover:shadow-xl glass-card border-white/5"
            >
              <CardContent className="p-8 space-y-4">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="h-7 w-7 text-blue-500" />
                </div>
                <h3 className="text-xl font-bold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Real Research - AI Multi-Agent Research Platform
      </footer>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
