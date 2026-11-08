export type Priority = "high" | "medium" | "low";

export type Module = {
  id: number;
  slug: string;
  name: string;
  priority: Priority;
  note: string;
};

export const modules: Module[] = [
  { id: 1, slug: "luck-wheel", name: "عجلة الحظ", priority: "low", note: "خصم نسبة من الشحن غير مدعوم، فقط شحن مجاني أو خصم ثابت" },
  { id: 2, slug: "product-bundles", name: "حزم المنتجات وخصومات الكمية", priority: "medium", note: "يجب التفوق على المنافس" },
  { id: 3, slug: "bought-together", name: "يُشترى معه فوق زر الشراء", priority: "medium", note: "يجب التفوق على المنافس" },
  { id: 4, slug: "cookie-consent", name: "موافقة الكوكيز", priority: "low", note: "منع أدوات التتبع قبل الموافقة صعب تقنيًا" },
  { id: 5, slug: "countdown", name: "العداد التنازلي", priority: "low", note: "سوق مزدحم" },
  { id: 6, slug: "stock-scarcity", name: "شريط ندرة المخزون", priority: "low", note: "الميزة فقط في أشكال الواجهة" },
  { id: 7, slug: "trust-badges", name: "شارات الثقة", priority: "high", note: "أيقونات ونصوص قابلة للتعديل، 2 إلى 4 شارات" },
  { id: 8, slug: "you-may-like", name: "قد يعجبك أيضًا", priority: "medium", note: "اختيار يدوي، تحكم بالمكان والتصميم" },
  { id: 9, slug: "recent-purchase", name: "فلان اشترى الآن", priority: "low", note: "تنبيه حماية البيانات الشخصية، الاسم الأول فقط" },
  { id: 10, slug: "color-swatches", name: "تنسيق خيارات الألوان والصور", priority: "medium", note: "التنسيق ممكن بطريقة غير رسمية تحتاج اختبار" },
  { id: 11, slug: "top-offers-bar", name: "شريط العروض العلوي", priority: "low", note: "شريط متحرك، رسائل متعددة، عداد، نسخ الكوبون، جدولة" },
  { id: 12, slug: "sticky-buy-button", name: "زر الشراء الثابت", priority: "low", note: "سوق فيه منافس" },
  { id: 13, slug: "free-shipping-bar", name: "شريط الشحن المجاني", priority: "low", note: "يحتاج تأكيد" },
  { id: 14, slug: "product-faq", name: "أسئلة شائعة للمنتج", priority: "low", note: "أسئلة يكتبها التاجر لكل منتج أو تصنيف" },
  { id: 15, slug: "whatsapp-button", name: "زر واتساب", priority: "low", note: "رسالة جاهزة بتفاصيل المنتج" },
  { id: 16, slug: "pre-checkout-offer", name: "عرض قبل الدفع", priority: "medium", note: "ممكن جزئيًا عبر cart::submitting واعتراض غير رسمي" },
  { id: 17, slug: "share-buttons", name: "أزرار المشاركة", priority: "low", note: "أزرار ظاهرة ومنصات إضافية" },
  { id: 18, slug: "fullscreen-images", name: "الصور بملء الشاشة", priority: "low", note: "خطر التعارض مع الثيم" },
  { id: 19, slug: "delivery-estimate", name: "موعد التوصيل المتوقع", priority: "high", note: "بيانات حقيقية من مناطق الشحن + إعدادات التاجر" },
  { id: 20, slug: "product-card-stars", name: "النجوم في بطاقات المنتجات", priority: "high", note: "ممكن عبر salla-rating-stars" },
  { id: 21, slug: "product-card-layout", name: "تنسيق بطاقات المنتجات", priority: "medium", note: "CSS آمن، الاستبدال الكامل فيه مخاطرة" },
];

export function getModule(slug: string): Module | undefined {
  return modules.find((module) => module.slug === slug);
}

// Sidebar order: the offers bar is first, everything else keeps the source order.
export const orderedModules: Module[] = [
  ...modules.filter((module) => module.slug === "top-offers-bar"),
  ...modules.filter((module) => module.slug !== "top-offers-bar"),
];

// module_num is the 1-based position in the sidebar (offers bar = 1).
// It is also the key used by the `settings` table in Supabase.
export const moduleNumbers: Record<string, number> = Object.fromEntries(
  orderedModules.map((module, index) => [module.slug, index + 1]),
);
