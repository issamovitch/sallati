import { notFound } from "next/navigation";
import LuckWheelConfig from "@/components/luck-wheel-config";
import TopOffersBarConfig from "@/components/top-offers-bar-config";
import { Card, EmptyState, Hint, Page } from "@/components/ui";
import { getModule } from "@/lib/modules";

export const instant = false;

export default async function ModulePage({ params }: PageProps<"/embedded/[slug]">) {
  const { slug } = await params;
  const currentModule = getModule(slug);

  if (!currentModule) {
    notFound();
  }

  if (currentModule.slug === "top-offers-bar") {
    return (
      <Page title={currentModule.name}>
        <TopOffersBarConfig />
      </Page>
    );
  }

  if (currentModule.slug === "luck-wheel") {
    return (
      <Page title={currentModule.name}>
        <LuckWheelConfig />
      </Page>
    );
  }

  return (
    <Page title={currentModule.name}>
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
