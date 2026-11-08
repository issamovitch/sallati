const envChecks = [
  { key: "SALLA_APP_ID", hint: "ترويسة S-Source للتحقق من الرمز" },
  { key: "SALLA_CLIENT_ID", hint: "معرّف عميل OAuth" },
  { key: "SALLA_CLIENT_SECRET", hint: "سر عميل OAuth" },
  { key: "SALLA_WEBHOOK_SECRET", hint: "سر توقيع الويب هوك" },
] as const;

export default function Home() {
  const configured = envChecks.filter((check) => Boolean(process.env[check.key])).length;

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <section className="w-full max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">سلتي</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          تطبيق سلة مضمّن — لوحة تحكم الوحدات.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <a
            className="rounded-xl border border-black/10 bg-white p-5 transition-colors hover:border-black/25 dark:border-white/15 dark:bg-zinc-900 dark:hover:border-white/30"
            href="/embedded"
          >
            <h2 className="font-medium">الصفحة المضمّنة ←</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              تفتح الواجهة داخل لوحة سلة. تحتاج رمز جلسة من سلة.
            </p>
          </a>
          <a
            className="rounded-xl border border-black/10 bg-white p-5 transition-colors hover:border-black/25 dark:border-white/15 dark:bg-zinc-900 dark:hover:border-white/30"
            href="/api/health"
          >
            <h2 className="font-medium">فحص الحالة ←</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              نقطة JSON للتأكد من عمل الخادم والنفق.
            </p>
          </a>
        </div>

        <div className="mt-8 rounded-xl border border-black/10 bg-white p-5 dark:border-white/15 dark:bg-zinc-900">
          <h2 className="font-medium">
            الإعدادات ({configured}/{envChecks.length})
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
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
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            انسخ <span className="font-mono">.env.example</span> إلى{" "}
            <span className="font-mono">.env.local</span> واملأ القيم.
          </p>
        </div>
      </section>
    </main>
  );
}
