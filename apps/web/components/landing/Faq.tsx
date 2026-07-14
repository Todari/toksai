const FAQS = [
  {
    q: "어떤 대화 파일을 올려야 하나요?",
    a: `카카오톡 채팅방에서 "대화 내보내기"로 저장한 텍스트(.txt) 파일이나, 그 파일을 담은 zip이면 돼요. 1:1 대화를 기준으로 분석해요.`,
  },
  {
    q: "안전한가요?",
    a: "업로드한 원본 대화는 암호화되어 저장되고 분석 목적으로만 사용돼요. 관리 링크로 언제든 삭제할 수 있어요.",
  },
  {
    q: "무료인가요?",
    a: "네, 톡사이는 현재 무료로 이용할 수 있어요.",
  },
  {
    q: "상대방도 결과를 볼 수 있나요?",
    a: "분석이 끝나면 비공개 링크가 생성돼요. 이 링크를 아는 사람은 결과를 볼 수 있지만 검색엔진에는 노출되지 않아요. 링크를 상대방과 공유해서 함께 확인해 보세요.",
  },
  {
    q: "결과가 정확한가요?",
    a: "AI가 대화 패턴을 분석해 재미로 보는 해석을 제공해요. 의학적·심리학적 진단이 아니라, 대화 속 관심 신호를 가볍게 즐기는 용도로 만들어졌어요.",
  },
  {
    q: "안드로이드나 PC에서도 되나요?",
    a: "현재는 아이폰(iOS) 카카오톡에서 내보낸 대화 텍스트 형식을 기준으로 분석해요. 안드로이드·PC 내보내기 형식 지원은 준비 중이에요.",
  },
  {
    q: "분석에는 얼마나 걸리나요?",
    a: "업로드 후 대화 내용을 AI가 분석하는 데 보통 수십 초에서 1분 정도 걸려요.",
  },
] as const;

/** 자연어 Q&A. AI/검색 엔진이 그대로 인용할 수 있도록 완전한 문장으로 답한다(GEO). */
export function Faq() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <section
      aria-labelledby="faq-heading"
      className="rounded-3xl bg-white p-5 shadow-sm dark:bg-[#241d17]"
    >
      <h2
        id="faq-heading"
        className="text-base font-bold text-neutral-800 dark:text-neutral-100"
      >
        자주 묻는 질문
      </h2>
      <div className="mt-3 divide-y divide-neutral-100 dark:divide-white/10">
        {FAQS.map((f) => (
          <details key={f.q} className="group py-3 first:pt-0 last:pb-0">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-neutral-800 [&::-webkit-details-marker]:hidden dark:text-neutral-100">
              {f.q}
              <span
                aria-hidden
                className="shrink-0 text-neutral-300 transition-transform duration-200 group-open:rotate-45 dark:text-neutral-600"
              >
                +
              </span>
            </summary>
            <p className="mt-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              {f.a}
            </p>
          </details>
        ))}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  );
}
