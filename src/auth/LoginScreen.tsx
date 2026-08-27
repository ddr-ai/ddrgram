import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppError, parseTelegramError } from "@/telegram/errors";
import type { TelegramPort } from "@/telegram/port";

type Step = "phone" | "code" | "password" | "email" | "email_code" | "captcha";

export function LoginScreen({
  port,
  configured,
  onDone,
  onSaveCredentials,
  onResetCredentials,
}: {
  port?: TelegramPort;
  configured: boolean;
  onDone: () => void;
  onSaveCredentials?: (apiId: number, apiHash: string) => Promise<void>;
  onResetCredentials?: () => Promise<void>;
}) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [siteKey, setSiteKey] = useState<string | undefined>();
  const [apiId, setApiId] = useState("");
  const [apiHash, setApiHash] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [waitSeconds, setWaitSeconds] = useState<number | null>(null);

  function showErr(err: unknown) {
    const parsed = parseTelegramError(err);
    if (parsed.code === "flood_wait") {
      setWaitSeconds(parsed.waitSeconds ?? 0);
      setError(`Wait ${parsed.waitSeconds ?? 0}s before trying again.`);
      return;
    }
    if (parsed.code === "invalid_code" || parsed.code === "code_expired") {
      setError(parsed.code === "code_expired" ? "Code expired." : "Invalid code.");
      return;
    }
    setError(parsed.message || "Something went wrong.");
  }

  async function sendCode() {
    if (!port) return;
    setBusy(true);
    setError(null);
    try {
      const res = await port.startLogin({ phone: phone.trim() });
      if (res.next === "captcha") {
        setSiteKey(res.siteKey);
        setStep("captcha");
      } else if (res.next === "email") {
        setStep("email");
      } else {
        setStep("code");
      }
    } catch (err) {
      showErr(err);
    } finally {
      setBusy(false);
    }
  }

  async function signIn() {
    if (!port) return;
    setBusy(true);
    setError(null);
    try {
      const res = await port.submitCode(code.trim());
      if (res.next === "done") onDone();
      else if (res.next === "password") setStep("password");
      else if (res.next === "email") setStep("email");
      else if (res.next === "captcha") {
        setSiteKey(res.siteKey);
        setStep("captcha");
      }
    } catch (err) {
      showErr(err);
    } finally {
      setBusy(false);
    }
  }

  async function sendPassword() {
    if (!port) return;
    setBusy(true);
    setError(null);
    try {
      await port.submitPassword(password);
      onDone();
    } catch (err) {
      showErr(err);
    } finally {
      setBusy(false);
    }
  }

  async function sendEmail() {
    if (!port) return;
    setBusy(true);
    setError(null);
    try {
      await port.submitEmail(email.trim());
      setStep("email_code");
    } catch (err) {
      showErr(err);
    } finally {
      setBusy(false);
    }
  }

  async function sendEmailCode() {
    if (!port) return;
    setBusy(true);
    setError(null);
    try {
      await port.submitEmailCode(code.trim());
      onDone();
    } catch (err) {
      showErr(err);
    } finally {
      setBusy(false);
    }
  }

  async function sendCaptcha() {
    if (!port) return;
    setBusy(true);
    setError(null);
    try {
      const res = await port.submitCaptcha(captcha.trim());
      setStep(res.next === "done" ? "phone" : "code");
      if (res.next === "done") onDone();
    } catch (err) {
      showErr(err);
    } finally {
      setBusy(false);
    }
  }

  async function saveCreds() {
    if (!onSaveCredentials) return;
    setBusy(true);
    setError(null);
    try {
      const id = Number(apiId.trim());
      const hash = apiHash.trim();
      if (!id || !hash) {
        throw new AppError("not_configured", "Enter both API ID and API hash.");
      }
      await onSaveCredentials(id, hash);
    } catch (err) {
      showErr(err);
    } finally {
      setBusy(false);
    }
  }

  function cancelExtra() {
    setStep("phone");
    setError(null);
    setCode("");
    setPassword("");
    setEmail("");
    setCaptcha("");
  }

  return (
    <main className="mx-auto flex h-full w-full max-w-md flex-col justify-center overflow-y-auto px-5 py-10">
      <div className="mb-8">
        <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-surface-2 shadow-[var(--shadow-border)]">
          <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
            <rect
              x="4"
              y="7"
              width="24"
              height="18"
              rx="3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="text-primary"
            />
            <path d="M14 12.5v7l7-3.5-7-3.5z" fill="currentColor" className="text-primary" />
          </svg>
        </div>
        <p className="font-display text-3xl font-semibold tracking-tight text-balance">
          TG Videos
        </p>
        <p className="mt-2 text-sm text-muted text-pretty">
          Sign in with your Telegram account to browse channel and group videos.
        </p>
      </div>

      {!configured ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void saveCreds();
          }}
        >
          <p className="text-sm text-muted">app is not configured</p>
          <p className="text-sm text-pretty">
            Create an app at{" "}
            <a
              className="text-primary underline"
              href="https://my.telegram.org/apps"
              target="_blank"
              rel="noreferrer"
            >
              my.telegram.org/apps
            </a>{" "}
            and paste the API ID and API hash. They stay on this device and are used to
            talk to Telegram directly from your browser.
          </p>
          <label className="text-sm font-medium" htmlFor="api-id">
            API ID
          </label>
          <Input
            id="api-id"
            inputMode="numeric"
            autoComplete="off"
            value={apiId}
            onChange={(e) => setApiId(e.target.value)}
          />
          <label className="text-sm font-medium" htmlFor="api-hash">
            API hash
          </label>
          <Input
            id="api-hash"
            autoComplete="off"
            value={apiHash}
            onChange={(e) => setApiHash(e.target.value)}
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={busy || !onSaveCredentials}>
            Save credentials
          </Button>
        </form>
      ) : null}

      {configured && step === "phone" ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void sendCode();
          }}
        >
          <label className="text-sm font-medium" htmlFor="phone">
            Phone number
          </label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+15555550100"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={busy || !phone.trim() || waitSeconds != null || !port}>
            Send code
          </Button>
          {onResetCredentials ? (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => void onResetCredentials()}
            >
              Change API credentials
            </Button>
          ) : null}
        </form>
      ) : null}

      {configured && step === "code" ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void signIn();
          }}
        >
          <label className="text-sm font-medium" htmlFor="login-code">
            Login code
          </label>
          <Input
            id="login-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" data-testid="sign-in" disabled={busy || !code.trim()}>
            Sign in
          </Button>
          <Button type="button" variant="ghost" disabled={busy} onClick={() => void sendCode()}>
            Resend
          </Button>
          <Button type="button" variant="ghost" onClick={cancelExtra}>
            Cancel
          </Button>
        </form>
      ) : null}

      {configured && step === "password" ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void sendPassword();
          }}
        >
          <label className="text-sm font-medium" htmlFor="password">
            Two-step password
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={busy || !password}>
            Continue
          </Button>
          <Button type="button" variant="ghost" onClick={cancelExtra}>
            Cancel
          </Button>
        </form>
      ) : null}

      {configured && step === "email" ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void sendEmail();
          }}
        >
          <label className="text-sm font-medium" htmlFor="email">
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={busy || !email.trim()}>
            Continue
          </Button>
          <Button type="button" variant="ghost" onClick={cancelExtra}>
            Cancel
          </Button>
        </form>
      ) : null}

      {configured && step === "email_code" ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void sendEmailCode();
          }}
        >
          <label className="text-sm font-medium" htmlFor="email-code">
            Email code
          </label>
          <Input
            id="email-code"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={busy || !code.trim()}>
            Continue
          </Button>
          <Button type="button" variant="ghost" onClick={cancelExtra}>
            Cancel
          </Button>
        </form>
      ) : null}

      {configured && step === "captcha" ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void sendCaptcha();
          }}
        >
          <p className="text-sm text-muted">Captcha required{siteKey ? ` (${siteKey})` : ""}.</p>
          <label className="text-sm font-medium" htmlFor="captcha">
            Captcha token
          </label>
          <Input
            id="captcha"
            value={captcha}
            onChange={(e) => setCaptcha(e.target.value)}
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={busy || !captcha.trim()}>
            Continue
          </Button>
          <Button type="button" variant="ghost" onClick={cancelExtra}>
            Cancel
          </Button>
        </form>
      ) : null}
    </main>
  );
}
