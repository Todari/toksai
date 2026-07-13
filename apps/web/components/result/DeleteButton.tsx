"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAdminToken, deleteAnalysis, loadAdminToken } from "../../lib/api";

interface DeleteButtonProps {
  viewToken: string;
}

/** 관리 토큰(브라우저에 저장된 업로더 본인 표식)이 있을 때만 노출되는 결과 삭제 버튼. */
export function DeleteButton({ viewToken }: DeleteButtonProps) {
  const router = useRouter();
  const [adminToken, setAdminToken] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAdminToken(loadAdminToken(viewToken));
  }, [viewToken]);

  if (!adminToken) return null;

  async function handleDelete() {
    const ok = confirm("정말 삭제할까요? 대화 원본과 분석 결과가 모두 사라지고 되돌릴 수 없어요.");
    if (!ok) return;
    setBusy(true);
    try {
      await deleteAnalysis(adminToken);
      clearAdminToken(viewToken);
      router.push("/");
    } catch {
      setBusy(false);
      alert("삭제에 실패했어요. 잠시 후 다시 시도해 주세요.");
    }
  }

  return (
    <div className="text-center">
      <button
        onClick={handleDelete}
        disabled={busy}
        className="text-xs font-medium text-neutral-400 underline underline-offset-2 disabled:opacity-40 dark:text-neutral-500"
      >
        {busy ? "삭제 중…" : "이 분석 결과 삭제하기"}
      </button>
    </div>
  );
}
