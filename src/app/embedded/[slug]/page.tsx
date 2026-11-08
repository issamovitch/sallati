import { notFound } from "next/navigation";
import TopOffersBarConfig from "@/components/top-offers-bar-config";
import { getModule } from "@/lib/modules";

export const instant = false;

export default async function ModulePage({ params }: PageProps<"/embedded/[slug]">) {
  const { slug } = await params;
  const module = getModule(slug);

  if (!module) {
    notFound();
  }

  if (module.slug === "top-offers-bar") {
    return (
      <section className="w-full px-10 py-8 md:px-16">
        <h1 className="text-2xl font-semibold tracking-tight">{module.name}</h1>
        <TopOffersBarConfig />
      </section>
    );
  }

  return (
    <section className="w-full space-y-5 px-10 py-8 md:px-16">
      <h1 className="text-2xl font-semibold tracking-tight">{module.name}</h1>

      <div className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-900">
        <h2 className="text-sm font-medium">الإعدادات</h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          إعدادات هذا الموديول قيد التطوير.
        </p>
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-900">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">معاينة</p>
        <div className="mt-2 grid h-24 place-items-center rounded-lg border border-dashed border-black/15 text-sm text-zinc-400 dark:border-white/15">
          لا توجد معاينة بعد
        </div>
      </div>
    </section>
  );
}