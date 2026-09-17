import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-admin";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "دخول الإدارة — مِزْجَة للدهانات" },
      { name: "description", content: "تسجيل دخول صاحب المحل لتعديل الأسعار والعروض." },
      { property: "og:title", content: "دخول الإدارة — مِزْجَة للدهانات" },
      { property: "og:description", content: "لوحة تحكم أسعار المحل." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email({ message: "بريد إلكتروني غير صحيح" }).max(255),
  password: z.string().min(6, { message: "كلمة السر ٦ أحرف على الأقل" }).max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const { session } = useAuthSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/admin", replace: true });
  }, [session, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب. راجع بريدك لتأكيد التسجيل.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        navigate({ to: "/admin", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حصل خطأ، حاول تاني.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-background px-4 font-body"
    >
      <div className="w-full max-w-sm rounded-3xl bg-ink p-6 text-cream">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-cream/60">
          لوحة الإدارة
        </div>
        <h1 className="mt-1 font-display text-2xl font-extrabold">
          {mode === "signin" ? "تسجيل الدخول" : "إنشاء حساب الإدارة"}
        </h1>
        <form onSubmit={handleSubmit} className="mt-5 grid gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="البريد الإلكتروني"
            className="rounded-xl bg-cream/10 px-3 py-3 text-sm outline-none ring-1 ring-cream/20 placeholder:text-cream/50"
            dir="ltr"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="كلمة السر"
            className="rounded-xl bg-cream/10 px-3 py-3 text-sm outline-none ring-1 ring-cream/20 placeholder:text-cream/50"
            dir="ltr"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-mustard px-4 py-3 text-[14px] font-extrabold text-ink disabled:opacity-60"
          >
            {busy ? "لحظة…" : mode === "signin" ? "دخول" : "إنشاء الحساب"}
          </button>
        </form>
        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-center text-[12px] text-cream/70 underline"
        >
          {mode === "signin" ? "مالكش حساب؟ اعمل حساب" : "عندك حساب؟ سجّل دخول"}
        </button>
      </div>
    </div>
  );
}
