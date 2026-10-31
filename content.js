// Game content: stages, weapons, items. Text fields (intro/clear/desc/story) are prose shown to players.
// `facts` fields are source notes for writers only and are never rendered.
window.CONTENT = {
  hero: {
    name: '문형수',
    title: '백엔드 개발자 · AI 엔지니어',
    facts: '백엔드 개발자이자 AI 엔지니어, 프론트엔드 포함 풀스택도 함. 좌우명: 함께 일하고 싶은 사람이 되자!',
    intro: '저는 백엔드 개발자이자 AI 엔지니어 문형수입니다. 제가 사용해 온 언어와 기술을 모으며 경력 스테이지를 함께 지나가 주세요.',
  },

  weapons: {
    php:    { name: 'PHP',     mechanic: '가장 가까운 적에게 기본탄', facts: '개인방송·방송 VOD·채용·웹툰 서비스를 LAMP/LEMP로 개발', desc: '가장 가까운 적에게 기본탄을 쏩니다.', story: '저는 개인방송과 방송 VOD, 채용, 웹툰 서비스를 PHP로 개발했습니다.' },
    java:   { name: 'Java',    mechanic: '적을 관통하는 무거운 탄', facts: '방송 VOD에서 PHP로 개발하다 막바지에 Java Spring·MyBatis로 전환(사용자 확인). 이후 어학원 플랫폼(Java Spring), 브랜드 커머스 수리 서비스(Spring Boot·JPA·JdbcTemplate)', desc: '적을 관통하는 무거운 탄을 쏩니다.', story: '저는 방송 VOD 플랫폼을 PHP로 개발하다 막바지에 Java와 Spring, MyBatis로 전환했습니다.' },
    kotlin: { name: 'Kotlin',  mechanic: '부채꼴로 퍼지는 여러 발', facts: '브랜드 커머스 PIM·신규 커머스 플랫폼·레거시 현대화를 Kotlin·Spring Boot로. 사내에 Kotlin 교육', desc: '부채꼴로 퍼지는 탄을 여러 발 쏩니다.', story: '저는 커머스 상품 정보 관리와 신규 플랫폼 개발, 기존 시스템 현대화에 Kotlin과 Spring Boot를 사용했습니다.' },
    cpp:    { name: 'C++',     mechanic: '발밑에 지뢰를 깔고 적이 닿으면 폭발', facts: '방송 VOD 플랫폼 통합 개발 기술 스택에 C++·DRM 포함', desc: '발밑에 깐 지뢰는 적이 닿으면 폭발합니다.', story: '저는 방송 VOD 플랫폼의 통합 개발에 C++를 사용했습니다.' },
    nodejs: { name: 'Node.js', mechanic: '작은 탄을 빠르게 연사', facts: 'AI 세일즈 콜 플랫폼(팀 구축) 연동에 사용', desc: '작은 탄을 빠르게 연속으로 쏩니다.', story: '저는 팀과 함께 구축한 AI 세일즈 콜 플랫폼의 시스템 연동에 Node.js를 사용했습니다.' },
    python: { name: 'Python',  mechanic: '캐릭터 주위를 도는 구체', facts: 'AI 세일즈 콜 플랫폼(팀), 보험설계 추천(Python/FastAPI·Databricks), 개인 서비스 세무 Tools(FastAPI)', desc: '캐릭터 주위를 도는 구체로 적을 공격합니다.', story: '저는 보험설계 추천 시스템과 개인 서비스 세무 Tools를 Python과 FastAPI로 개발했습니다.' },
    llm:    { name: 'LLM',     mechanic: '적을 따라가는 유도탄', facts: 'AI 세일즈 콜 플랫폼(팀)에서 LLM 서빙·운영·Tool Calling 담당. 개인 서비스에서 Gemini RAG 챗봇', desc: '적을 따라가는 유도탄을 쏩니다.', story: '저는 팀과 함께 만든 AI 세일즈 콜 플랫폼에서 LLM 운영과 도구 호출 기능을 담당했습니다.' },
  },

  items: {
    mysql:         { name: 'MySQL',         effect: 'maxHp', amount: 20,   facts: '개인방송 서비스 DB',                          desc: '최대 체력 +20 · 개인방송 서비스의 DB로 사용한 MySQL' },
    memcached:     { name: 'Memcached',     effect: 'fireRate', amount: 0.10, facts: '개인방송 서비스 캐시',                     desc: '공격 속도 +10% · 개인방송 캐시에 사용한 Memcached' },
    elasticsearch: { name: 'Elasticsearch', effect: 'magnet', amount: 0.4, facts: '방송 VOD 검색',                               desc: '경험치 흡수 범위 +40% · 방송 VOD 검색에 사용한 Elasticsearch' },
    aws:           { name: 'AWS',           effect: 'regen', amount: 1,    facts: '방송 VOD 플랫폼에서 회사 첫 AWS 도입(EC2·ELB·S3·CloudFront·RDS). 이후 ECS/Fargate 운영', desc: '초당 체력 회복 +1 · 방송 VOD 플랫폼에 도입한 AWS' },
    redis:         { name: 'Redis',         effect: 'fireRate', amount: 0.15, facts: '채용 서비스 캐싱, 커머스 분산 세션 스토어', desc: '공격 속도 +15% · 채용 캐싱과 커머스 세션 저장에 사용한 Redis' },
    elk:           { name: 'ELK',           effect: 'crit', amount: 0.15,  facts: '웹툰 플랫폼에서 ELK로 실시간 로그 분석·이상 징후 알림', desc: '치명타 확률 +15%p · 웹툰 로그 분석과 이상 알림에 사용한 ELK' },
    sphinx:        { name: 'Sphinx',        effect: 'magnet', amount: 0.3, facts: '웹툰 플랫폼 다국어 검색',                     desc: '경험치 흡수 범위 +30% · 웹툰 다국어 검색에 사용한 Sphinx' },
    pg:            { name: 'PG 연동',       effect: 'xp', amount: 0.15,    facts: '재능 거래 플랫폼에서 여러 PG사 연동', desc: '경험치 획득 +15% · 교육 플랫폼 결제와 정산에 사용한 PG 연동' },
    kafka:         { name: 'Kafka',         effect: 'chain', amount: 1,    facts: '브랜드 커머스 PIM 변경 이벤트, 커머스 비동기 이벤트. 멱등 처리·오프셋 기준 재개', desc: '처치 시 연쇄 폭발 · 커머스의 비동기 이벤트 처리에 사용한 Kafka' },
    dynamodb:      { name: 'DynamoDB',      effect: 'speed', amount: 0.15, facts: '브랜드마다 속성이 다른 상품 정보 → 유연한 스키마. 조회 패턴을 먼저 정의', desc: '이동 속도 +15% · 브랜드별로 다른 상품 속성을 저장한 DynamoDB' },
    jwt:           { name: 'JWT',           effect: 'iframe', amount: 0.4, facts: '레거시 현대화에서 JWT 무상태 인증·Spring Security 역할 구분', desc: '피격 후 무적 시간 +0.4초 · 기존 시스템의 무상태 인증에 사용한 JWT' },
    docker:        { name: 'Docker',        effect: 'shield', amount: 1,   facts: 'ECS/Fargate 운영, 반복 재기동을 헬스체크 대기·프록시·인코딩 원인 분리로 해결', desc: '주기적 보호막 · 팀과 함께 ECS/Fargate 운영에 사용한 Docker' },
    iac:           { name: 'IaC',           effect: 'cooldown', amount: 0.12, facts: '고친 설정이 다음 배포에서 되돌아가지 않게 IaC로 재발 방지', desc: '쿨다운 -12% · 팀과 함께 고친 배포 설정을 유지하는 데 사용한 IaC' },
    websocket:     { name: 'WebSocket',     effect: 'projSpeed', amount: 0.25, facts: 'AI 세일즈 콜(팀)에서 Relay–LLM 간 WebSocket 연동 담당', desc: '탄속 +25% · 팀과 함께 AI 세일즈 콜 연동에 사용한 WebSocket' },
    databricks:    { name: 'Databricks',    effect: 'xp', amount: 0.2,     facts: '데이터 레이크 구축을 위한 Databricks 도입, 보험설계 추천 배포', desc: '경험치 획득 +20% · 보험설계 추천 배포에 사용한 Databricks' },
    dmn:           { name: 'DMN/FEEL',      effect: 'damage', amount: 0.2, facts: '보험설계 추천에서 인수 심사 조건을 DMN/FEEL 규칙으로 판정, 규칙 자동 변환으로 최신 기준 검증', desc: '피해량 +20% · 보험설계 추천의 인수 심사 조건을 판정한 DMN/FEEL' },

    mybatis:       { name: 'MyBatis',       effect: 'damage', amount: 0.1, facts: '방송 VOD 플랫폼에서 Java Spring·MyBatis 사용', desc: '피해량 +10% · 방송 VOD 플랫폼 개발에 사용한 MyBatis' },
    drm:           { name: 'DRM',           effect: 'iframe', amount: 0.2, facts: '방송 VOD 플랫폼 기술 스택에 DRM 포함', desc: '피격 후 무적 시간 +0.2초 · 방송 VOD 플랫폼에 사용한 DRM' },
    zend:          { name: 'Zend Framework', effect: 'cooldown', amount: 0.08, facts: '채용 서비스를 LAMP·Zend Framework로 개발', desc: '쿨다운 -8% · 채용 서비스 개발에 사용한 Zend Framework' },
    nginx:         { name: 'Nginx',         effect: 'fireRate', amount: 0.1, facts: '웹툰 플랫폼을 LEMP(Linux·Nginx·MySQL·PHP)로 개발', desc: '공격 속도 +10% · 웹툰 플랫폼 개발에 사용한 Nginx' },
    oracle:        { name: 'Oracle DB',     effect: 'maxHp', amount: 25,   facts: '어학원 온라인 수강 신청 플랫폼 개편(Java Spring·AXBoot·Oracle DB)', desc: '최대 체력 +25 · 어학원 수강 신청 플랫폼 개편에 사용한 Oracle DB' },
    refund:        { name: '할인·환불 규정', category: 'exp', effect: 'xp', amount: 0.1, facts: '어학원 플랫폼에서 할인 정책·환불 규정을 시스템화, 강사 스케줄링·정산 시스템 구축', desc: '경험치 획득 +10% · 어학원 플랫폼에서 시스템화한 할인·환불 규정' },
    settlement:    { name: '정산·세금 계산', category: 'exp', effect: 'damage', amount: 0.12, facts: '재능 거래 플랫폼에서 플랫폼 수수료 계산·강사 정산금 지급·소득세·부가가치세 계산과 신고 자료 생성', desc: '피해량 +12% · 재능 거래 플랫폼에서 구현한 정산·세금 계산' },
    mvp:           { name: 'MVP 출시',      category: 'exp', effect: 'speed', amount: 0.1, facts: '헬스케어 커머스에서 풀스택으로 MVP 개발·출시, 사업 종료를 겪으며 고객 수요·시장 적합성 검증의 중요성을 배움', desc: '이동 속도 +10% · 헬스케어 커머스에서 풀스택으로 개발·출시한 MVP' },
    aurora:        { name: 'Aurora',        effect: 'maxHp', amount: 30,   facts: '브랜드 커머스에서 팀과 함께 Aurora 장애 전환 시 읽기 경로 지연을 읽기 복제본·AWS Advanced JDBC Wrapper·오류 알림으로 개선', desc: '최대 체력 +30 · 저희 팀이 장애 전환 시 읽기 지연을 개선한 Aurora' },
    optlock:       { name: '낙관적 락',     effect: 'crit', amount: 0.1,   facts: '사내 카페 주문 앱에서 낙관적 락·재시도·SSE로 동시 주문 처리', desc: '치명타 확률 +10%p · 사내 카페 앱의 동시 주문 처리에 사용한 낙관적 락' },
    incident:      { name: '장애 대응',     category: 'exp', effect: 'regen', amount: 1, facts: '브랜드 커머스 기술전략팀 팀장으로 팀과 함께 장애 대응·AWS 비용 최적화 방향을 정하고 실행', desc: '초당 체력 회복 +1 · 저희 팀이 방향을 정하고 실행한 장애 대응' },
    gpu:           { name: 'GPU 서버',      effect: 'damage', amount: 0.15, facts: '팀으로 만든 AI 세일즈 콜 플랫폼에서 GPU 서버 구성·LLM 서빙 담당', desc: '피해량 +15% · 저희 팀이 만든 AI 세일즈 콜 플랫폼의 GPU 서버' },
    stt:           { name: 'STT/TTS',       effect: 'magnet', amount: 0.3, facts: 'AI 세일즈 콜(팀)에서 STT 성능 차이를 같은 녹음으로 엔진·실행 환경만 바꿔 비교하고 전화 연동 옵션·샘플레이트를 조정(수치는 쓰지 않음)', desc: '경험치 흡수 범위 +30% · 같은 녹음으로 엔진과 환경을 바꿔 비교한 STT' },
    security:      { name: '정보보안 인증', category: 'exp', effect: 'iframe', amount: 0.3, facts: '팀으로 만든 AI 세일즈 콜 플랫폼에서 보안 요구사항을 사전 점검·대응해 금융 서비스 승인에 필요한 정보보안 인증 전 항목 통과', desc: '피격 후 무적 시간 +0.3초 · 저희 팀이 준비하고 통과한 정보보안 인증' },
  },

  // Weapon evolutions: base weapon at max level + partner weapon/item.
  evolutions: {
    strangler:   { name: 'Strangler Fig', facts: 'PHP 최대 + Kotlin. 레거시 PHP 모노리스를 Kotlin 서비스와 공존시키며 기능 단위로 옮긴 방식', desc: '탄이 맞으면 작은 탄 3개로 갈라집니다.', story: '저는 기존 PHP 모노리스와 Kotlin 서비스를 공존시키며 기능 단위로 옮겼습니다.' },
    eventdriven: { name: 'Event-driven',  facts: 'Kotlin 최대 + Kafka. 커머스에서 Kafka 이벤트로 브랜드 시스템이 변경을 받아 반영하는 구조', desc: '맞은 적 주변으로 번개가 이어집니다.', story: '저는 커머스에서 Kafka 이벤트로 브랜드 시스템이 변경을 받아 반영하도록 구성했습니다.' },
    agent:       { name: 'AI Agent',      facts: 'LLM 최대 + WebSocket. 팀으로 만든 AI 세일즈 콜에서 Relay–LLM WebSocket 연동과 Tool Calling', desc: '사방으로 크게 터지는 유도탄을 쏩니다.', story: '저는 팀과 함께 AI 세일즈 콜의 Relay–LLM WebSocket 연동과 Tool Calling을 구현했습니다.' },
  },

  // Rare drops from defeated errors.
  pickups: {
    bomb:   { name: '배포 성공', facts: '화면 안의 적을 모두 터뜨림', desc: '화면 안의 적을 모두 터뜨려 장애를 정리합니다.' },
    magnet: { name: '캐시 플러시', facts: '떨어진 경험치를 모두 끌어옴', desc: '떨어진 경험치를 한 번에 모두 끌어옵니다.' },
    heal:   { name: '핫픽스', facts: '체력 35% 회복', desc: '긴급 패치로 체력을 35% 회복합니다.' },
  },

  // Bonus level-up cards when every upgrade is taken.
  extras: {
    refactor: { name: '리팩터링', facts: '피해량 +8%', desc: '피해량이 8% 증가합니다.' },
    hotfix:   { name: '핫픽스', facts: '체력 40% 회복', desc: '체력을 40% 회복합니다.' },
  },

  // Career Run signboards: short in-course captions. `facts` are writer notes only.
  run: {
    facts: {
      live: { start: '첫 코스. 밟아서 오류를 처치하고 ?블록에서 기술을 얻는다', graph: '동시접속 그래프처럼 치솟는 계단, 끝에 월드컵 동시접속 보스' },
      vod: { start: '방송 VOD. 주로 PHP로 개발', java: '코스 후반, 막바지에 Java로 전환한 지점. 여기서 Java 무기를 얻어 X/J로 발사' },
      hr: { start: '채용 서비스. 2명 풀스택 팀', cache: '?블록 줄이 Redis 캐시처럼 커밋을 한꺼번에 준다(캐시 히트)' },
      webtoon: { start: '글로벌 웹툰 플랫폼', climb: '만화 칸을 위로 올라가는 구간. 다국어 검색·다국가 결제' },
      lang: { start: '어학원 온라인 수강 신청 플랫폼 개편', rush: '수강 신청 폭주처럼 빠른 오류가 몰려오는 컨베이어' },
      talent: { start: '재능 거래 플랫폼, 결제·정산', switch: '결제 → 정산 → 세금 순서로 스위치를 밟아야 문이 열림' },
      health: { start: '헬스케어 커머스 MVP', collapse: '다리가 무너지지만 아래에서 고객 수요 검증 아이콘을 얻음(사업 종료에서 배운 점)' },
      brand: { start: '브랜드 커머스, Kotlin 무기 획득', strangler: 'PHP 타일이 밟으면 무너지고 그 자리를 Kotlin 타일이 채움(Strangler Fig 단계 전환)' },
      ai: { start: '보험 · AI, LLM 무기 획득', wave: '음성 파형 발판이 박자에 맞춰 오르내림', ffwd: '통화 음성이 빨리 감기처럼 재생되던 문제 — 이 구간은 1.6배속' },
    },
    signs: {
      live: { start: '첫 코스에서는 오류를 밟고 ?블록에서 기술을 얻으세요.', graph: '동시접속 그래프 같은 계단을 올라 월드컵 보스에 대비하세요.' }, vod: { start: 'PHP로 방송 VOD를 개발하던 시기의 코스를 따라가세요.', java: 'Java로 전환한 이곳에서 무기를 얻고 X 키로 발사하세요.' }, hr: { start: '풀스택 팀으로 채용 서비스를 만들던 시기의 코스를 따라가세요.', cache: 'Redis 캐시처럼 ?블록 줄에서 커밋을 한꺼번에 얻으세요.' }, webtoon: { start: '글로벌 웹툰 플랫폼을 개발하던 시기의 코스를 따라가세요.', climb: '다국어 검색과 다국가 결제를 다루던 이곳의 만화 칸을 올라가세요.' },
      lang: { start: '어학원 수강 신청 플랫폼을 개편하던 시기의 코스를 따라가세요.', rush: '수강 신청 폭주처럼 오류가 몰려오는 컨베이어를 조심하세요.' }, talent: { start: '재능 거래 플랫폼의 결제와 정산을 다루던 시기의 코스를 따라가세요.', switch: '결제·정산·세금 순서로 스위치를 밟아 문을 여세요.' }, health: { start: '헬스케어 커머스 MVP를 만들던 시기의 코스를 따라가세요.', collapse: '무너진 다리 아래에서 고객 수요 검증 아이콘을 얻으세요.' },
      brand: { start: '브랜드 커머스를 만들던 시기에는 Kotlin 무기를 얻으세요.', strangler: 'PHP 타일은 밟으면 무너지고 Kotlin 타일이 그 자리를 채웁니다.' }, ai: { start: '보험과 AI를 다루던 시기에는 LLM 무기를 얻으세요.', wave: '음성 파형 발판이 오르내리는 박자에 맞춰 건너가세요.', ffwd: '통화 음성이 빨리 감기던 문제처럼 빨라진 구간을 조심하세요.' },
    },
  },

  levels: [
    {
      id: 'career',
      title: '레벨 1 · 경력',
      stages: [
        {
          id: 'live', name: '개인방송', unlock: { weapons: ['php'], items: ['mysql', 'memcached'] },
          mobs: [{ name: 'Fatal error', kind: 'bug' }, { name: '느린 쿼리', kind: 'tank' }, { name: '세션 만료', kind: 'fast' }],
          boss: { name: '월드컵 동시접속', facts: '개인방송 웹 서비스 개발·운영, 월드컵 기간 동시접속 대응(수치는 쓰지 않음)' },
          facts: '첫 회사. 개인방송 웹 서비스 개발·운영. PHP(LAMP)·MySQL·Memcached',
          intro: '저는 개인방송 웹 서비스의 개발과 운영을 맡았습니다. PHP와 MySQL, Memcached를 사용했습니다.',
          clear: '저는 월드컵 기간의 동시접속에 대응했습니다. 개인방송 웹 서비스의 개발과 운영을 함께 경험했습니다.',
        },
        {
          id: 'vod', name: '방송 VOD', autoGrant: false, lateWeapon: 'java', unlock: { weapons: ['cpp'], items: ['elasticsearch', 'aws', 'mybatis', 'drm'] },
          mobs: [{ name: '503', kind: 'fast' }, { name: '인코딩 실패', kind: 'bug' }, { name: '동기화 누락', kind: 'tank' }, { name: 'DRM 오류', kind: 'bug' }],
          boss: { name: 'VOD 플랫폼 개편', facts: 'VOD 플랫폼 개편, 회사 첫 AWS 도입. 콘텐츠 허브 담당자들과 DB 동기화 누락·오류를 함께 확인·수정' },
          facts: '방송 VOD 플랫폼 통합 개발. 주로 PHP(LAMP)로 개발하다 막바지에 Java(Spring·MyBatis)로 전환(사용자 확인). Elasticsearch·C++·DRM·WordPress·AWS',
          intro: '저는 방송 VOD 플랫폼의 통합 개발을 맡았습니다. 주로 PHP로 개발했고 Elasticsearch와 C++, DRM을 사용했습니다.',
          clear: '저는 플랫폼 개편 과정에서 AWS를 도입했습니다. 콘텐츠 허브 담당자들과 데이터베이스 동기화 누락과 오류를 함께 확인하고 수정했습니다.',
        },
        {
          id: 'hr', name: '채용 서비스', unlock: { weapons: [], items: ['redis', 'zend'] },
          mobs: [{ name: 'Undefined index', kind: 'bug' }, { name: '캐시 미스', kind: 'fast' }, { name: '중복 발송', kind: 'tank' }],
          boss: { name: 'CRM 캠페인 자동화', facts: '2명 풀스택 팀으로 연봉 정보 서비스 출시, CRM 캠페인 자동화 시스템 개발. LAMP·Zend Framework·Redis' },
          facts: '채용(HR) 플랫폼. 풀스택 2명',
          intro: '저는 채용 플랫폼에서 프론트엔드와 백엔드를 함께 개발했습니다. 팀과 함께 연봉 정보 서비스를 출시했습니다.',
          clear: '저는 팀과 함께 고객 관리 캠페인을 자동화하는 시스템을 개발했습니다. 채용 서비스에는 Redis를 사용해 캐시를 구성했습니다.',
        },
        {
          id: 'webtoon', name: '웹툰 플랫폼', unlock: { weapons: [], items: ['nginx', 'sphinx', 'elk'] },
          mobs: [{ name: '결제 실패', kind: 'tank' }, { name: '글자 깨짐', kind: 'bug' }, { name: '검색 0건', kind: 'fast' }, { name: '502 Bad Gateway', kind: 'fast' }],
          boss: { name: '다국가 결제', facts: '한국·글로벌 웹툰 플랫폼. 다국가 결제·다국어 검색(Sphinx)·ELK 실시간 로그 분석과 이상 징후 알림. LEMP·AWS' },
          facts: '글로벌 웹툰 플랫폼',
          intro: '저는 국내와 해외에서 사용하는 웹툰 플랫폼을 개발했습니다. 여러 국가의 결제와 여러 언어의 검색을 다뤘습니다.',
          clear: '저는 여러 국가의 결제를 연동하고 Sphinx로 다국어 검색을 구현했습니다. ELK로 실시간 로그를 분석하고 이상 징후를 알리도록 구성했습니다.',
        },
        {
          id: 'lang', name: '어학원 플랫폼', unlock: { weapons: [], items: ['oracle', 'refund'] },
          mobs: [{ name: 'NullPointerException', kind: 'bug' }, { name: 'ORA-00001', kind: 'fast' }, { name: '수강 신청 폭주', kind: 'tank' }],
          boss: { name: '할인·환불 규정', facts: '어학원 온라인·TOEFL 수강 신청 및 관리 플랫폼 개편, 할인 정책·환불 규정 시스템화, 강사 스케줄링·정산 시스템 구축. Java Spring·AXBoot·Oracle DB' },
          facts: '어학원 온라인 플랫폼',
          intro: '저는 어학원의 온라인 수강 신청과 관리 플랫폼을 개편했습니다. Java와 Spring, Oracle DB를 사용했습니다.',
          clear: '저는 할인 정책과 환불 규정을 시스템에 반영했습니다. 강사 일정 관리와 정산 시스템도 구축했습니다.',
        },
        {
          id: 'talent', name: '재능 거래 플랫폼', unlock: { weapons: [], items: ['pg', 'settlement'] },
          mobs: [{ name: '정산 오차', kind: 'bug' }, { name: '중복 결제', kind: 'fast' }, { name: 'Deadlock', kind: 'tank' }],
          boss: { name: '정산과 세금 계산', facts: '강사와 수강생을 잇는 양면 마켓플레이스. 회원 가입부터 강좌 개설·검색·수강 신청·정산까지 설계·개발, 여러 PG사 연동, 플랫폼 수수료·강사 정산금 지급·소득세·부가가치세 계산과 신고 자료 생성, 오프라인 수업 예약·출석·리뷰' },
          facts: '재능 거래(교육) 플랫폼 백엔드 개발',
          intro: '저는 강사와 수강생을 잇는 재능 거래 플랫폼의 백엔드를 개발했습니다. 회원 가입부터 강좌 개설과 검색, 수강 신청과 정산까지 설계했습니다.',
          clear: '저는 여러 결제 대행사를 연동하고 플랫폼 수수료 계산과 강사 정산금 지급을 구현했습니다. 소득세와 부가가치세를 계산하고 신고 자료를 생성하도록 구성했습니다.',
        },
        {
          id: 'health', name: '헬스케어 커머스', unlock: { weapons: [], items: ['mvp'] },
          mobs: [{ name: '요구사항 변경', kind: 'fast' }, { name: '표시 기준 위반', kind: 'bug' }, { name: '출시 일정', kind: 'tank' }],
          boss: { name: 'MVP 출시', facts: '초기 스타트업의 제한된 인력과 기간 안에 약사 추천 영양제 커머스 MVP를 풀스택으로 개발·출시, 영양제 성분 데이터 관리 설계, 건강기능식품 규제·표시 기준 반영. 이후 사업 종료를 겪으며 고객 수요·시장 적합성 검증의 중요성을 배움' },
          facts: '헬스케어 커머스 스타트업 풀스택 개발',
          intro: '저는 약사가 추천하는 영양제 커머스의 프론트엔드와 백엔드를 개발했습니다. 영양제 성분 데이터 관리 방식을 설계하고 건강기능식품 규제와 표시 기준을 반영했습니다.',
          clear: '저는 영양제 커머스의 MVP를 개발하고 출시했습니다. 이후 사업 종료를 겪으며 고객 수요와 시장 적합성 검증의 중요성을 배웠습니다.',
        },
        {
          id: 'brand', name: '브랜드 커머스', unlock: { weapons: ['kotlin'], items: ['kafka', 'dynamodb', 'jwt', 'docker', 'iac', 'aurora', 'optlock', 'incident'] },
          mobs: [{ name: 'OOM', kind: 'tank' }, { name: '재기동 루프', kind: 'fast' }, { name: '커넥션 풀 고갈', kind: 'bug' }, { name: '중복 이벤트', kind: 'bug' }, { name: '장애 전환 지연', kind: 'tank' }],
          boss: { name: '레거시 PHP 모노리스', facts: '담당자 퇴사·버전 패치 중단으로 유지보수가 어려운 PHP 모노리스를 Strangler Fig로 Kotlin 서비스와 공존시키며 무중단 전환' },
          facts: '브랜드 커머스 기술전략팀 팀장. PIM·Kafka 변경 이벤트, 신규 커머스 플랫폼, AI 코딩 도구·Databricks 도입, 팀과 함께 AWS 장애 대응·비용 최적화',
          intro: '저는 브랜드 커머스의 상품 정보 관리 시스템과 신규 플랫폼을 개발했습니다. 저희 팀은 AWS 장애에 대응하고 비용 최적화를 진행했습니다.',
          clear: '저는 유지보수가 어려운 PHP 시스템을 Kotlin 서비스와 함께 운영하도록 구성했습니다. 기존 서비스를 중단하지 않고 전환했습니다.',
        },
        {
          id: 'ai', name: '보험 · AI', unlock: { weapons: ['nodejs', 'python', 'llm'], items: ['websocket', 'databricks', 'dmn', 'gpu', 'stt', 'security'] },
          mobs: [{ name: '환각', kind: 'bug' }, { name: 'Timeout', kind: 'fast' }, { name: '음성 지연', kind: 'bug' }, { name: '토큰 초과', kind: 'tank' }],
          boss: { name: '빨리 감기는 통화 음성', facts: '팀으로 만든 AI 세일즈 콜 플랫폼에서 통화 음성이 몇 배속처럼 빨리 재생되던 현상 → 구간별 전송 속도·타이밍을 비교해 정상화. 실시간 음성 연동·LLM 운영 담당. 보험설계 추천은 결정론적 추천 + 인수 심사 규칙 검증으로 재정의해 직접 구축' },
          facts: '보험 도메인. AI를 실제 업무 시스템에 연결',
          intro: '저는 팀과 함께 AI 세일즈 콜 플랫폼을 구축하며 실시간 음성 연동과 LLM 운영을 맡았습니다. 보험설계 추천에서는 인수 심사 조건을 규칙으로 검증하는 시스템을 구축했습니다.',
          clear: '팀과 함께 만든 플랫폼에서 통화 음성이 빨리 감기처럼 재생되는 문제가 있었습니다. 저는 구간별 전송 속도와 타이밍을 비교해 재생 속도를 정상화했습니다.',
        },
      ],
      ending: { facts: '지금도 성장 중. 개인 서비스 세무 Tools(semu.ai.kr) 운영, hello-llm 가이드 작성. 연락처 moonhou@naver.com, github.com/amecoder', text: '레벨 1을 함께 클리어해 주셔서 감사합니다. 저는 세무 Tools를 운영하고 hello-llm 가이드를 작성하며 계속 배우고 있습니다. 이메일은 moonhou@naver.com이며 GitHub 주소는 github.com/amecoder입니다.' },
    },
  ],
};
