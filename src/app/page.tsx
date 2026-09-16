import React from 'react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center px-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">순천</span>
            </div>
            <span className="font-bold text-lg text-primary">순천시 혜택 모음</span>
          </div>
          <nav className="ml-auto flex items-center gap-4 text-sm font-medium">
            <a href="#" className="transition-colors hover:text-primary text-foreground/80">맞춤혜택 찾기</a>
            <a href="#" className="transition-colors hover:text-primary text-foreground/80">분야별 정책</a>
            <a href="#" className="transition-colors hover:text-primary text-foreground/80">공지사항</a>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <section className="mb-12 text-center py-12 bg-primary/5 rounded-3xl mt-4">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4 text-foreground">
            내게 맞는 혜택을 <span className="text-primary">한눈에</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            순천시, 전남광주통합특별시, 그리고 전국민을 대상으로 하는 모든 정책과 지원금을 모았습니다.
          </p>
          <div className="flex justify-center gap-4">
            <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-8 py-2">
              내 맞춤 혜택 찾기
            </button>
            <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-10 px-8 py-2">
              전체 혜택 보기
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Placeholder for policy cards */}
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-xl border bg-card text-card-foreground shadow">
              <div className="flex flex-col space-y-1.5 p-6">
                <h3 className="font-semibold leading-none tracking-tight">청년 전세자금 대출 이자 지원</h3>
                <p className="text-sm text-muted-foreground pt-2">순천시에 거주하는 무주택 청년들의 주거 안정을 위해 전세자금 대출 이자를 지원합니다.</p>
              </div>
              <div className="p-6 pt-0 flex gap-2">
                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary border-transparent">
                  #청년
                </span>
                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground border-transparent">
                  #주거
                </span>
              </div>
            </div>
          ))}
        </section>
      </main>
      
      <footer className="border-t py-6 md:py-0 bg-muted/20">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row px-4 text-sm text-muted-foreground">
          <p>
            © 2026 순천시 혜택 모음. Open Source AI Hackathon.
          </p>
        </div>
      </footer>
    </div>
  );
}
