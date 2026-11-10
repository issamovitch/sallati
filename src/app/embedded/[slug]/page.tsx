import { notFound } from "next/navigation";
import TopOffersBarConfig from "@/components/top-offers-bar-config";
import { Card, EmptyState, Hint, Page } from "@/components/ui";
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
      <Page title={module.name}>
        <TopOffersBarConfig />
      </Page>
    );
  }

  return (
    <Page title={module.name}>
      <div className="mt-6 space-y-5">
        <Card title="الإعدادات">
          <Hint className="text-sm">إعدادات هذا الموديول قيد التطوير.</Hint>
        </Card>

        <Card title="معاينة">
          <EmptyState>لا توجد معاينة بعد</EmptyState>
        </Card>
      </div>
    </Page>
  );
}
