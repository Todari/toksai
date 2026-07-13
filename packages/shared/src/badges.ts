export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const BADGES: Badge[] = [
  { id: "first_texter", name: "선톡왕", description: "먼저 말 거는 걸 두려워하지 않는 사람", icon: "📣" },
  { id: "night_owl", name: "새벽감성", description: "늦은 밤 대화가 유독 많은 사람", icon: "🌙" },
  { id: "reply_fairy", name: "답장요정", description: "답장이 빛의 속도인 사람", icon: "⚡" },
  { id: "emoji_bomber", name: "이모지 폭격기", description: "이모지로 감정을 표현하는 사람", icon: "💥" },
  { id: "essay_writer", name: "장문파", description: "한 번 보내면 소설을 쓰는 사람", icon: "📜" },
  { id: "laugh_machine", name: "ㅋㅋ제조기", description: "ㅋ과 ㅎ이 끊이지 않는 사람", icon: "😆" },
  { id: "slow_burner", name: "느림의미학", description: "답장은 느려도 진심인 사람", icon: "🐢" },
  { id: "question_master", name: "궁금이", description: "질문으로 대화를 이어가는 사람", icon: "❓" },
];

export const BADGE_IDS = BADGES.map((b) => b.id);
