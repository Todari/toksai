"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, type DragEvent } from "react";
import {
  UploadApiError,
  createEmailIntake,
  getEmailIntake,
  saveAdminToken,
  uploadFile,
  type EmailIntake,
  type EmailIntakeStatus,
} from "../../lib/api";
import {
  EMAIL_INTAKE_STORAGE_KEY,
  emailIntakeErrorMessage,
  isActiveEmailIntake,
} from "../../lib/email-intake";
import { fileKind, fileSizeBucket, trackEvent } from "../../lib/analytics";
import {
  isSupportedChatFile,
  toFriendlyUploadError,
  UNSUPPORTED_FILE_ERROR,
} from "../../lib/upload";

type StartMethod = "upload" | "email" | null;

/** 랜딩의 시작 CTA. 직접 업로드와 이메일 수신 흐름을 한곳에서 안내한다. */
export function UploadCta() {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [method, setMethod] = useState<StartMethod>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [intake, setIntake] = useState<EmailIntake | null>(null);
  const [intakeStatus, setIntakeStatus] = useState<EmailIntakeStatus["status"]>("WAITING");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(EMAIL_INTAKE_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as EmailIntake;
      if (!isActiveEmailIntake(parsed)) {
        localStorage.removeItem(EMAIL_INTAKE_STORAGE_KEY);
        return;
      }
      setIntake(parsed);
      setStarted(true);
      setMethod("email");
    } catch {
      localStorage.removeItem(EMAIL_INTAKE_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!intake || method !== "email") return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const status = await getEmailIntake(intake.token);
        if (!active) return;
        setIntakeStatus(status.status);
        setEmailError(null);

        if (status.status === "READY") {
          saveAdminToken(status.viewToken, status.adminToken);
          localStorage.removeItem(EMAIL_INTAKE_STORAGE_KEY);
          trackEvent("email_intake_succeeded");
          router.push(`/a/${status.viewToken}/identify`);
          return;
        }
        if (status.status === "FAILED") {
          localStorage.removeItem(EMAIL_INTAKE_STORAGE_KEY);
          setEmailError(emailIntakeErrorMessage(status.errorCode));
          trackEvent("email_intake_failed", { error_code: status.errorCode });
          return;
        }
        if (status.status === "EXPIRED" || status.status === "NOT_FOUND") {
          localStorage.removeItem(EMAIL_INTAKE_STORAGE_KEY);
          setEmailError("전용 주소가 만료됐어요. 새 주소를 받아 다시 보내주세요.");
          return;
        }
        timer = setTimeout(poll, 3_000);
      } catch {
        if (!active) return;
        setEmailError("수신 상태 확인이 잠시 지연되고 있어요. 자동으로 다시 확인할게요.");
        timer = setTimeout(poll, 5_000);
      }
    };

    void poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [intake, method, router]);

  async function onFile(file: File) {
    if (!isSupportedChatFile(file.name)) {
      setUploadError(UNSUPPORTED_FILE_ERROR);
      trackEvent("upload_failed", { error_code: "CLIENT_UNSUPPORTED_FILE" });
      return;
    }
    const startedAt = performance.now();
    const kind = fileKind(file.name);
    trackEvent("upload_selected", {
      file_kind: kind,
      size_bucket: fileSizeBucket(file.size),
    });
    setBusy(true);
    setUploadError(null);
    try {
      const result = await uploadFile(file);
      saveAdminToken(result.viewToken, result.adminToken);
      trackEvent("upload_succeeded", {
        file_kind: kind,
        elapsed_ms: Math.round(performance.now() - startedAt),
      });
      router.push(`/a/${result.viewToken}/identify`);
    } catch (error) {
      trackEvent("upload_failed", {
        file_kind: kind,
        error_code:
          error instanceof UploadApiError
            ? error.code
            : error instanceof TypeError
              ? "NETWORK"
              : "UNKNOWN",
      });
      setUploadError(toFriendlyUploadError(error));
      setBusy(false);
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (!busy) setDragging(true);
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (busy) return;
    const file = event.dataTransfer.files?.[0];
    if (file) void onFile(file);
  }

  async function beginEmail(force = false) {
    setMethod("email");
    setEmailError(null);
    setIntakeStatus("WAITING");
    trackEvent("start_method_selected", { method: "email" });
    if (!force && intake && isActiveEmailIntake(intake)) return;
    setBusy(true);
    try {
      const created = await createEmailIntake();
      setIntake(created);
      localStorage.setItem(EMAIL_INTAKE_STORAGE_KEY, JSON.stringify(created));
      trackEvent("email_intake_created");
    } catch {
      setEmailError("전용 메일 주소를 만들지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  }

  async function restartEmail() {
    localStorage.removeItem(EMAIL_INTAKE_STORAGE_KEY);
    setIntake(null);
    setEmailError(null);
    await beginEmail(true);
  }

  async function copyAddress() {
    if (!intake) return;
    await navigator.clipboard.writeText(intake.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2_000);
    trackEvent("email_address_copied");
  }

  if (!started) {
    return (
      <div className="mt-8">
        <button
          onClick={() => {
            setStarted(true);
            trackEvent("start_clicked");
          }}
          className="w-full rounded-2xl bg-gradient-to-r from-[#F5B301] to-[#FB7185] py-4 text-base font-extrabold text-white shadow-lg shadow-amber-300/30 transition hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 dark:shadow-none"
        >
          무료로 시작하기 →
        </button>
        <p className="mt-3 text-xs text-neutral-400 dark:text-neutral-500">
          로그인 없이 · 결과는 비공개 링크로
        </p>
      </div>
    );
  }

  if (!method) {
    return (
      <div className="mt-8 rounded-3xl border border-black/5 bg-white/80 p-4 text-left shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#241d17]/90">
        <p className="text-center text-sm font-extrabold text-neutral-800 dark:text-neutral-100">
          어떤 방법이 편하세요?
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => {
              setMethod("upload");
              trackEvent("start_method_selected", { method: "upload" });
            }}
            className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left transition hover:border-amber-400 hover:shadow-sm dark:border-amber-400/20 dark:bg-amber-400/10"
          >
            <span aria-hidden className="text-2xl">📂</span>
            <span className="mt-2 block text-sm font-extrabold text-neutral-800 dark:text-neutral-100">
              파일 직접 올리기
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              저장한 zip·txt·csv를 바로 선택해요.
            </span>
          </button>
          <button
            onClick={() => void beginEmail()}
            className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-left transition hover:border-rose-400 hover:shadow-sm dark:border-rose-400/20 dark:bg-rose-400/10"
          >
            <span aria-hidden className="text-2xl">💌</span>
            <span className="mt-2 block text-sm font-extrabold text-neutral-800 dark:text-neutral-100">
              메일로 보내기
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              카카오톡 내보내기에서 바로 메일로 보내요.
            </span>
          </button>
        </div>
      </div>
    );
  }

  if (method === "email") {
    const waiting = intakeStatus === "WAITING" || intakeStatus === "PROCESSING";
    return (
      <div className="mt-8 rounded-3xl border border-rose-200 bg-white p-5 text-left shadow-sm dark:border-rose-400/20 dark:bg-[#241d17]">
        <button
          onClick={() => setMethod(null)}
          className="text-xs font-semibold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
        >
          ← 다른 방법 선택
        </button>
        <div className="mt-3 text-center">
          <span aria-hidden className="text-3xl">💌</span>
          <h2 className="mt-2 text-base font-extrabold text-neutral-800 dark:text-neutral-100">
            카카오톡에서 메일로 내보내세요
          </h2>
        </div>

        {intake ? (
          <>
            <div className="mt-4 rounded-2xl bg-rose-50 p-3 dark:bg-rose-400/10">
              <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-300">
                이번 분석 전용 받는 사람
              </p>
              <p className="mt-1 break-all font-mono text-xs font-bold text-neutral-700 dark:text-neutral-200">
                {intake.address}
              </p>
              <button
                onClick={() => void copyAddress()}
                className="mt-2 w-full rounded-xl bg-white py-2 text-xs font-bold text-rose-600 shadow-sm dark:bg-white/10 dark:text-rose-300"
              >
                {copied ? "복사했어요 ✓" : "메일 주소 복사"}
              </button>
            </div>
            <ol className="mt-4 space-y-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
              <li><strong>1.</strong> 카카오톡 채팅방 설정에서 대화 내용 내보내기 → 메일을 선택해요.</li>
              <li><strong>2.</strong> 위 주소를 받는 사람에 붙여넣고 전송해요.</li>
              <li><strong>3.</strong> 이 화면이 메일을 확인하면 자동으로 다음 단계로 이동해요.</li>
            </ol>
            {waiting && !emailError && (
              <p className="mt-4 text-center text-xs font-semibold text-rose-500" role="status">
                {intakeStatus === "PROCESSING" ? "첨부파일을 안전하게 확인하고 있어요…" : "메일을 기다리고 있어요…"}
              </p>
            )}
          </>
        ) : (
          <p className="mt-4 text-center text-sm text-neutral-500">
            {busy ? "전용 주소를 만들고 있어요…" : "전용 주소를 준비하지 못했어요."}
          </p>
        )}

        {emailError && (
          <div className="mt-4 rounded-2xl bg-red-50 p-3 dark:bg-red-400/10">
            <p className="text-xs leading-relaxed text-red-600 dark:text-red-300" role="alert">
              {emailError}
            </p>
            {(intakeStatus === "FAILED" || intakeStatus === "EXPIRED" || intakeStatus === "NOT_FOUND" || !intake) && (
              <button
                onClick={() => void restartEmail()}
                className="mt-2 text-xs font-bold text-red-600 underline dark:text-red-300"
              >
                새 주소 받기
              </button>
            )}
          </div>
        )}
        <p className="mt-4 text-[10px] leading-relaxed text-neutral-400 dark:text-neutral-500">
          메일 수신 과정에서 Resend를 거치며 제공업체 정책에 따라 최대 30일 보관될 수 있어요.
          더 민감한 대화라면 파일 직접 올리기를 권장해요.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <button
        onClick={() => setMethod(null)}
        className="mb-3 text-xs font-semibold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
      >
        ← 다른 방법 선택
      </button>
      <label
        onDragOver={handleDragOver}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`group relative block cursor-pointer rounded-3xl border-2 border-dashed bg-white p-10 text-center shadow-sm transition active:scale-[0.99] dark:bg-[#241d17] ${
          dragging
            ? "scale-[1.01] border-amber-500 bg-amber-50 shadow-md dark:bg-amber-400/10"
            : "border-amber-300 hover:border-amber-400 hover:shadow-md dark:border-amber-500/30"
        }`}
      >
        <span className="pointer-events-none block">
          <span aria-hidden className="block text-4xl">
            {busy ? "⏳" : dragging ? "📂" : "📂"}
          </span>
          <span className="mt-3 block text-base font-bold text-neutral-800 dark:text-neutral-100">
            {busy ? "분석 준비 중…" : dragging ? "여기에 놓아주세요!" : "여기에 파일을 올리거나 클릭"}
          </span>
          <span className="mt-1 block text-xs text-neutral-400 dark:text-neutral-500">
            카카오톡 대화 내보내기 파일(.zip, .txt, .csv)
          </span>
        </span>
        <input
          type="file"
          accept=".zip,.txt,.csv"
          className="hidden"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void onFile(file);
          }}
        />
      </label>
      {uploadError && (
        <p className="mt-4 text-sm text-red-500" role="alert">
          {uploadError}
        </p>
      )}
    </div>
  );
}
