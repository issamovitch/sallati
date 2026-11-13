"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HiArrowPath, HiPlus, HiTrash } from "react-icons/hi2";
import {
  DEFAULT_LUCK_WHEEL,
  LUCK_WHEEL_PALETTE,
  MAX_DELAY_SECONDS,
  MAX_PRIZES,
  MAX_SPIN_DURATION,
  MIN_DELAY_SECONDS,
  MIN_PRIZES,
  MIN_SPIN_DURATION,
  normalizeLuckWheel,
  prizeChance,
  type LuckWheelConfig as Config,
  type LuckWheelPrize,
} from "@/lib/luck-wheel";
import { FONT_OPTIONS } from "@/lib/fonts";
import { queuePendingSave, readMerchantId, takePendingSave, writeModuleSettings } from "@/lib/settings";
import { embedded } from "@salla.sa/embedded-sdk";
import { useModuleConfig } from "@/components/settings-provider";
import { moduleNumbers } from "@/lib/modules";
import {
  Button,
  Card,
  ColorField,
  ColorInput,
  DangerButton,
  Field,
  FontSelect,
  IconButton,
  Hint,
  LinkButton,
  TextInput,
  ToggleRow,
  useToast,
} from "@/components/ui";

const LUCK_WHEEL_MODULE_NUM = moduleNumbers["luck-wheel"] ?? 2;

/**
 * Isolated document that loads the real storefront snippet. Nothing is fetched
 * from the database: the parent page pushes the live (unsaved) config in.
 */
function buildPreviewDoc(snippet: string) {
  const js = snippet.replace(/<\/script/gi, "<\\/script");
  return [
    "<!doctype html><html lang=\"ar\" dir=\"rtl\"><head><meta charset=\"utf-8\" />",
    "<style>html,body{margin:0;padding:0;height:100%;overflow:hidden;background:#e4e4e7;}</style>",
    "</head><body>",
    "<script>window.__SALLATI_PREVIEW__=true;</script>",
    "<script>" + js + "</script>",
    "<script>",
    "window.addEventListener('message',function(event){",
    "var data=event.data;",
    "if(!data||data.type!=='sallati:preview')return;",
    "window.SallatiLuckWheel.render(data.config);",
    "});",
    "</script>",
    "</body></html>",
  ].join("");
}

export default function LuckWheelConfig() {
  const { settings: remote, reload } = useModuleConfig(LUCK_WHEEL_MODULE_NUM);
  const [draft, setDraft] = useState<Config | null>(() => {
    const pending = takePendingSave(readMerchantId(), LUCK_WHEEL_MODULE_NUM);
    return pending ? normalizeLuckWheel(pending) : null;
  });
  const retrying = useRef(false);
  const [snippet, setSnippet] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const previewRef = useRef<HTMLIFrameElement | null>(null);
  const seq = useRef(0);
  const { show } = useToast();

  // Server row is the source of truth until the merchant edits something.
  const config = useMemo(
    () => draft ?? (remote === undefined ? DEFAULT_LUCK_WHEEL : normalizeLuckWheel(remote)),
    [draft, remote],
  );

  const previewDoc = useMemo(() => (snippet ? buildPreviewDoc(snippet) : ""), [snippet]);

  function loadSnippet() {
    fetch("/storefront-luck-wheel.js", { cache: "no-store" })
      .then((response) => response.text())
      .then((text) => setSnippet(text))
      .catch(() => {});
  }

  function refreshPreview() {
    setPreviewKey((key) => key + 1);
    loadSnippet();
  }

  const pushPreview = useCallback(() => {
    previewRef.current?.contentWindow?.postMessage(
      { type: "sallati:preview", config },
      "*",
    );
  }, [config]);

  useEffect(() => {
    const timer = window.setTimeout(pushPreview, 200);
    return () => window.clearTimeout(timer);
  }, [pushPreview, previewDoc, previewKey]);

  useEffect(() => {
    loadSnippet();
  }, []);

  function update(next: Config) {
    setDraft(next);
  }

  function updatePrize(index: number, patch: Partial<LuckWheelPrize>) {
    update({
      ...config,
      prizes: config.prizes.map((prize, i) => (i === index ? { ...prize, ...patch } : prize)),
    });
  }

  function addPrize() {
    if (config.prizes.length >= MAX_PRIZES) return;
    const index = config.prizes.length;
    update({
      ...config,
      prizes: [
        ...config.prizes,
        {
          id: `prize-${config.prizes.length}-${(seq.current += 1)}`,
          label: "",
          weight: 10,
          couponCode: "",
          color: LUCK_WHEEL_PALETTE[index % LUCK_WHEEL_PALETTE.length],
        },
      ],
    });
  }

  function removePrize(index: number) {
    if (config.prizes.length <= MIN_PRIZES) return;
    update({ ...config, prizes: config.prizes.filter((_, i) => i !== index) });
  }

  async function save() {
    const next = normalizeLuckWheel(config);
    const result = await writeModuleSettings(readMerchantId(), LUCK_WHEEL_MODULE_NUM, next);

    if (result === "unauthorized") {
      // Token expired: keep the edit, reload the iframe, replay after reload.
      queuePendingSave(readMerchantId(), LUCK_WHEEL_MODULE_NUM, next);
      show("انتهت الجلسة، نعيد الحفظ تلقائيًا…", "warning", 3000);
      try {
        embedded.auth.refresh();
      } catch {
        /* host unavailable */
      }
      return;
    }

    if (result === "failed") {
      setDraft(next);
      show("تعذّر الحفظ، حاول مرة أخرى", "warning", 4000);
      return;
    }

    await reload();
    setDraft(null);
    refreshPreview();
    show("تم الحفظ");
  }

  // Replay a save that was interrupted by the token refresh.
  useEffect(() => {
    if (!draft || retrying.current) return;
    retrying.current = true;
    void save();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
      <div className="space-y-5">
        <Card title="إعدادات العجلة">
          <ToggleRow
            title="تفعيل عجلة الحظ"
            description="إظهار نافذة العجلة في واجهة المتجر."
            checked={config.enabled}
            onChange={(enabled) => update({ ...config, enabled })}
            label="تفعيل عجلة الحظ"
          />

          <Field label="العنوان" className="mt-5">
            <TextInput
              value={config.headline}
              onChange={(event) => update({ ...config, headline: event.target.value })}
              className="mt-1"
            />
          </Field>

          <Field label="الوصف" className="mt-4">
            <TextInput
              value={config.description}
              onChange={(event) => update({ ...config, description: event.target.value })}
              className="mt-1"
            />
          </Field>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <Field label="نص زر العجلة">
              <TextInput
                value={config.buttonText}
                onChange={(event) => update({ ...config, buttonText: event.target.value })}
                className="mt-1"
              />
            </Field>
            <Field label="مدة الدوران (ms)">
              <TextInput
                type="number"
                min={MIN_SPIN_DURATION}
                max={MAX_SPIN_DURATION}
                step={500}
                value={config.spinDuration}
                onChange={(event) =>
                  update({
                    ...config,
                    spinDuration: Number(event.target.value) || DEFAULT_LUCK_WHEEL.spinDuration,
                  })
                }
                className="mt-1"
              />
            </Field>
          </div>

          <Field label="رسالة الفوز" className="mt-4">
            <TextInput
              value={config.successText}
              onChange={(event) => update({ ...config, successText: event.target.value })}
              className="mt-1"
            />
          </Field>

          <Field label="الخط" className="mt-5">
            <FontSelect
              value={config.fontFamily}
              options={FONT_OPTIONS}
              onChange={(fontFamily) => update({ ...config, fontFamily })}
              className="mt-1"
            />
          </Field>

          <ColorField
            label="لون التمييز"
            value={config.accentColor}
            onChange={(accentColor) => update({ ...config, accentColor })}
            pickerHeight={140}
          />

          <div className="mt-5 flex items-center justify-end">
            <Button type="button" onClick={save}>
              حفظ
            </Button>
          </div>
        </Card>

        <Card title="الجوائز">
          <Hint>
            احتمالية كل جائزة تُحسب من مجموع الأوزان. اترك كود الكوبون فارغًا لجائزة
            «حظ أوفر» بدون كوبون.
          </Hint>

          <div className="mt-4 space-y-4">
            {config.prizes.map((prize, index) => {
              const chance = prizeChance(config.prizes, prize);

              return (
                <div
                  key={prize.id}
                  className="rounded-lg border border-black/10 p-3 dark:border-white/10"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">
                      الجائزة {index + 1}
                    </span>
                    <DangerButton
                      type="button"
                      disabled={config.prizes.length <= MIN_PRIZES}
                      onClick={() => removePrize(index)}
                      className="inline-flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <HiTrash className="size-3.5" />
                      حذف
                    </DangerButton>
                  </div>

                  <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="اسم الجائزة">
                      <TextInput
                        value={prize.label}
                        onChange={(event) => updatePrize(index, { label: event.target.value })}
                        placeholder="خصم 10%"
                        className="mt-1"
                      />
                    </Field>
                    <Field label="كود الكوبون">
                      <TextInput
                        dir="ltr"
                        value={prize.couponCode}
                        onChange={(event) =>
                          updatePrize(index, { couponCode: event.target.value })
                        }
                        placeholder="SPIN10"
                        className="mt-1 text-left"
                      />
                    </Field>
                  </div>

                  <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                    <Field label="الوزن">
                      <TextInput
                        type="number"
                        min={1}
                        max={100}
                        value={prize.weight}
                        onChange={(event) =>
                          updatePrize(index, { weight: Number(event.target.value) || 1 })
                        }
                        className="mt-1 w-24 px-2 py-1 text-sm"
                      />
                    </Field>

                    <div>
                      <span className="text-base font-bold text-zinc-900 dark:text-white">
                        اللون
                      </span>
                      <ColorInput
                        value={prize.color}
                        onChange={(color) => updatePrize(index, { color })}
                        className="mt-2"
                      />
                    </div>

                    <Hint className="pb-2">
                      الاحتمالية: {chance}% ·{" "}
                      {prize.couponCode.trim() ? "كوبون" : "بدون كوبون"}
                    </Hint>
                  </div>
                </div>
              );
            })}
          </div>

          {config.prizes.length < MAX_PRIZES && (
            <LinkButton
              type="button"
              onClick={addPrize}
              className="mt-3 inline-flex items-center gap-1"
            >
              <HiPlus className="size-3.5" />
              إضافة جائزة
            </LinkButton>
          )}

          <div className="mt-5 flex items-center justify-end">
            <Button type="button" onClick={save}>
              حفظ
            </Button>
          </div>
        </Card>

        <Card title="طريقة الظهور والجمع">
          <div className="space-y-4">
            <div>
              <ToggleRow
                title="الظهور بعد تأخير"
                description="فتح العجلة تلقائيًا بعد مدة من تحميل الصفحة."
                checked={config.openOnDelay}
                onChange={(openOnDelay) => update({ ...config, openOnDelay })}
                label="الظهور بعد تأخير"
              />
              <Field label="بعد (ثانية)" className="mt-3">
                <TextInput
                  type="number"
                  min={MIN_DELAY_SECONDS}
                  max={MAX_DELAY_SECONDS}
                  value={config.delaySeconds}
                  disabled={!config.openOnDelay}
                  onChange={(event) =>
                    update({
                      ...config,
                      delaySeconds: Number(event.target.value) || DEFAULT_LUCK_WHEEL.delaySeconds,
                    })
                  }
                  className="mt-1 w-28 px-2 py-1 text-sm disabled:opacity-50"
                />
              </Field>
            </div>

            <ToggleRow
              title="عند محاولة الخروج"
              description="فتح العجلة عندما يخرج مؤشر الزائر من أعلى الصفحة."
              checked={config.openOnExit}
              onChange={(openOnExit) => update({ ...config, openOnExit })}
              label="عند محاولة الخروج"
            />

            <ToggleRow
              title="زر عائم في المتجر"
              description="زر صغير أسفل الصفحة يفتح العجلة في أي وقت."
              checked={config.openOnButton}
              onChange={(openOnButton) => update({ ...config, openOnButton })}
              label="زر عائم في المتجر"
            />

            <ToggleRow
              title="مرة واحدة لكل زائر"
              description="لا يظهر الطلب مرة أخرى بعد أن يدور الزائر ويحصل على جائزته."
              checked={config.oncePerVisitor}
              onChange={(oncePerVisitor) => update({ ...config, oncePerVisitor })}
              label="مرة واحدة لكل زائر"
            />

            <div>
              <ToggleRow
                title="طلب البريد الإلكتروني"
                description="لا يمكن الدوران قبل إدخال البريد، ويُحفظ البريد مع الجائزة."
                checked={config.requireEmail}
                onChange={(requireEmail) => update({ ...config, requireEmail })}
                label="طلب البريد الإلكتروني"
              />
              {config.requireEmail && (
                <Field label="نص حقل البريد" className="mt-3">
                  <TextInput
                    value={config.emailPlaceholder}
                    onChange={(event) =>
                      update({ ...config, emailPlaceholder: event.target.value })
                    }
                    className="mt-1"
                  />
                </Field>
              )}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end">
            <Button type="button" onClick={save}>
              حفظ
            </Button>
          </div>
        </Card>
      </div>

      <div className="space-y-5">
        <Card
          title="معاينة"
          action={
            <IconButton
              icon={<HiArrowPath className="size-4" />}
              label="تحديث المعاينة"
              onClick={refreshPreview}
            />
          }
        >
          <div className="mt-2 overflow-hidden border border-black/10 dark:border-white/10">
            {!config.enabled ? (
              <div className="bg-zinc-100 px-3 py-2 text-center text-sm text-zinc-400 dark:bg-zinc-800">
                عجلة الحظ معطّلة
              </div>
            ) : snippet ? (
              <iframe
                key={previewKey}
                ref={previewRef}
                title="معاينة عجلة الحظ"
                srcDoc={previewDoc}
                onLoad={pushPreview}
                style={{ height: 640, width: "100%", border: 0, display: "block" }}
              />
            ) : (
              <div className="bg-zinc-100 px-3 py-2 text-center text-sm text-zinc-400 dark:bg-zinc-800">
                جارٍ التحميل…
              </div>
            )}
          </div>
        </Card>

        <Card title="كيف تعمل الجوائز؟">
          <Hint className="text-sm leading-7">
            الجوائز الحالية بكوبونات يدوية: أنت تنشئ الكوبون في سلة وتكتب كوده هنا، ثم
            يظهر للزائر عند الفوز. هذا يعمل في أي متجر دون أي ربط إضافي.
          </Hint>
          <Hint className="mt-2 text-sm leading-7">
            التوليد التلقائي لكوبون جديد لكل زائر يحتاج ربط OAuth بمتجر كل تاجر
            (صلاحية الكوبونات)، وهو غير مفعّل بعد.
          </Hint>
        </Card>
      </div>
    </div>
  );
}
