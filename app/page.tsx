<h1 className="text-base font-bold text-foreground">대시보드</h1>
<p className="text-xs text-muted-foreground">실시간 모멘텀 개요 — NASDAQ / NYSE / AMEX</p>

<StatWidget label="스캔 종목" value={fmt.num(data?.count ?? 0)} sub="1차 필터 통과" color="text-foreground" />
<StatWidget label="필터 통과" value={fmt.num(passedCount)} sub="가격 / 유동성 / 거래량 OK" color="text-accent" />
<StatWidget label="매수 신호" value={fmt.num(buySignalCount)} sub="몬스터 점수 ≥ 85" color="text-bull" />
<StatWidget label="최고 점수" value={topScore > 0 ? fmt.score(topScore) : '—'} sub={topMonster[0]?.ticker ?? '없음'} color="text-primary" />

<SectionHeader title="🔥 최고 몬스터 종목" count={topMonster.length} />
<SectionHeader title="⚡ 유동회전율" subtitle="거래량 / 유동주식" count={topFloat.length} />
<SectionHeader title="📈 최고 RVOL" subtitle="vs 30일 평균" count={topRvol.length} />
<SectionHeader title="🚀 갭 상승" subtitle="vs 전일 종가" count={topGap.length} />
<SectionHeader title="🌅 프리마켓 급등주" count={premarket.length} />
<SectionHeader title="💥 공매도 스퀴즈" subtitle="SI ≥ 15%" count={squeeze.length} />
