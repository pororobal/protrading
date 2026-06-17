// marketStatusLabel 함수는 format.ts에서 반환값을 한국어로 변경
export function marketStatusLabel(): { label: string; color: string } {
  if (isMarketOpen()) return { label: '장 개장', color: 'text-bull' };
  if (isPremarket()) return { label: '프리마켓', color: 'text-warn' };
  return { label: '장 마감', color: 'text-muted-foreground' };
}

// TopBar 컴포넌트 내부
<button onClick={() => mutate()} disabled={isLoading} ...>
  <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
  <span className="hidden sm:inline">새로고침</span>
</button>
