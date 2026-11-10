import { Card, Hint, Page } from "@/components/ui";

const envChecks = [
  { key: "SALLA_APP_ID", hint: "ترويسة S-Source للتحقق من الرمز" },
  { key: "SALLA_CLIENT_ID", hint: "معرّف عميل OAuth" },
  { key: "SALLA_CLIENT_SECRET", hint: "سر عميل OAuth" },
  { key: "SALLA_WEBHOOK_SECRET", hint: "سر توقيع الويب هوك" },
] as const;

export default function Home() {
  const configured = envChecks.filter((check) => Boolean(process.env[check.key])).length;

  return (
    <Page title="سلتي">
      <Hint className="mt-2 text-sm">تطبيق سلة مضمّن — لوحة تحكم الوحدات.</Hint>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <a
          className="rounded-xl border border-black/10 bg-white p-5 transition-colors hover:border-black/25 dark:border-white/15 dark:bg-zinc-900 dark:hover:border-white/30"
          href="/embedded"
        >
          <h2 className="font-medium">الصفحة المضمّنة ←</h2>
          <Hint className="mt-1">تفتح الواجهة داخل لوحة سلة. تحتاج رمز جلسة من سلة.</Hint>
        </a>
        <a
          className="rounded-xl border border-black/10 bg-white p-5 transition-colors hover:border-black/25 dark:border-white/15 dark:bg-zinc-900 dark:hover:border-white/30"
          href="/api/health"
        >
          <h2 className="font-medium">فحص الحالة ←</h2>
          <Hint className="mt-1">نقطة JSON للتأكد من عمل الخادم والنفق.</Hint>
        </a>
      </div>

      <Card title={`الإعدادات (${configured}/${envChecks.length})`} className="mt-6">
        <ul className="space-y-2 text-sm">
          {envChecks.map((check) => {
            const ready = Boolean(process.env[check.key]);
            return (
              <li key={check.key} className="flex items-center justify-between gap-4">
                <span className="font-mono">{check.key}</span>
                <span className={ready ? "text-[#1781ae]" : "text-zinc-400"}>
                  {ready ? "مضبوط" : "ناقص"}
                </span>
              </li>
            );
          })}
        </ul>
        <Hint className="mt-3">
          انسخ <span className="font-mono">.env.example</span> إلى{" "}
          <span className="font-mono">.env.local</span> واملأ القيم.
        </Hint>
      </Card>
    </Page>
  );
}
