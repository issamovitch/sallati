"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HiArrowPath } from "react-icons/hi2";
import {
  DEFAULT_TOP_OFFERS_BAR,
  MAX_ANIMATION_SPEED,
  MIN_ANIMATION_SPEED,
  TOP_OFFERS_BAR_FONT_OPTIONS,
  clampAnimationSpeed,
  normalizeTopOffersBar,
  type TopOffersBarConfig as Config,
} from "@/lib/top-offers-bar";
import { readMerchantId, writeModuleSettings } from "@/lib/settings";
import { useModuleConfig } from "@/components/settings-provider";
import { moduleNumbers } from "@/lib/modules";
import {
  Button,
  Card,
  ColorField,
  DangerButton,
  Field,
  FontSelect,
  GhostButton,
  LinkButton,
  TextInput,
  ToggleRow,
  Wysiwyg,
  useToast,
} from "@/components/ui";

const OFFERS_MODULE_NUM = moduleNumbers["top-offers-bar"] ?? 1;
const MAX_TEXTS = 5;

/**
 * Isolated document that loads the real storefront snippet. Nothing is fetched
 * from the database: the parent page pushes the live (unsaved) config in.
 */
function buildPreviewDoc(snippet: string) {
  const js = snippet.replace(/<\/script/gi, "<\\/script");
  return [
    "<!doctype html><html lang=\"ar\" dir=\"rtl\"><head><meta charset=\"utf-8\" />",
    "<style>html,body{margin:0;padding:0;overflow:hidden;background:transparent;}</style>",
    "</head><body>",
    "<script>window.__SALLATI_PREVIEW__=true;</script>",
    "<script>" + js + "</script>",
    "<script>",
    "window.addEventListener('message',function(event){",
    "var data=event.data;",
    "if(!data||data.type!=='sallati:preview')return;",
    "window.SallatiOffersBar.render(data.config);",
    "});",
    "</script>",
    "</body></html>",
  ].join("");
}

export default function TopOffersBarConfig() {
  const { settings: remote, reload } = useModuleConfig(OFFERS_MODULE_NUM);
  const [draft, setDraft] = useState<Config | null>(null);
  const [snippet, setSnippet] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const previewRef = useRef<HTMLIFrameElement | null>(null);
  const { show } = useToast();

  // Server row is the source of truth until the merchant edits something.
  const config = useMemo(
    () =>
      draft ??
      (remote === undefined ? DEFAULT_TOP_OFFERS_BAR : normalizeTopOffersBar(remote)),
    [draft, remote],
  );

  const previewDoc = useMemo(() => (snippet ? buildPreviewDoc(snippet) : ""), [snippet]);

  function loadSnippet() {
    fetch("/storefront-offers-bar.js", { cache: "no-store" })
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

  function updateText(index: number, message: string) {
    const texts = [...config.texts];
    texts[index] = { ...texts[index], message };
    update({ ...config, texts });
  }

  function addText() {
    if (config.texts.length >= MAX_TEXTS) return;
    update({ ...config, texts: [...config.texts, { message: "", duration: 5 }] });
  }

  function removeText(index: number) {
    if (index === 0) return;
    update({ ...config, texts: config.texts.filter((_, i) => i !== index) });
  }

  async function save() {
    const next = normalizeTopOffersBar(config);
    const ok = await writeModuleSettings(readMerchantId(), OFFERS_MODULE_NUM, next);
    if (!ok) {
      setDraft(next);
      show("تعذّر الحفظ، حاول مرة أخرى", "warning", 4000);
      return;
    }
    await reload();
    setDraft(null);
    refreshPreview();
    show("تم الحفظ");
  }

  const showDuration = config.texts.length > 1;

  return (
    <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
      <div className="space-y-5">
        <Card title="إعدادات الشريط">
          <ToggleRow
            title="تفعيل الشريط"
            description="إظهار شريط العروض أعلى واجهة المتجر."
            checked={config.enabled}
            onChange={(enabled) => update({ ...config, enabled })}
            label="تفعيل الشريط"
          />

          <div className="mt-5 grid grid-cols-2 gap-4">
            <Field label="ارتفاع الشريط (px)">
              <TextInput
                type="number"
                min={24}
                max={80}
                value={config.height}
                onChange={(event) =>
                  update({ ...config, height: Number(event.target.value) || DEFAULT_TOP_OFFERS_BAR.height })
                }
                className="mt-1"
              />
            </Field>
            <Field label="حجم الخط (px)">
              <TextInput
                type="number"
                min={10}
                max={24}
                value={config.fontSize}
                onChange={(event) =>
                  update({ ...config, fontSize: Number(event.target.value) || DEFAULT_TOP_OFFERS_BAR.fontSize })
                }
                className="mt-1"
              />
            </Field>
          </div>

          <Field label="الخط" className="mt-5">
            <FontSelect
              value={config.fontFamily}
              options={TOP_OFFERS_BAR_FONT_OPTIONS}
              onChange={(fontFamily) => update({ ...config, fontFamily })}
              className="mt-1"
            />
          </Field>

          <ColorField
            label="لون الشريط"
            value={config.color}
            onChange={(color) => update({ ...config, color })}
            pickerHeight={140}
          />

          <div className="mt-5 flex items-center justify-end gap-3">
            <Button type="button" onClick={save}>
              حفظ
            </Button>
          </div>
        </Card>

        <Card title="النصوص">
          <div className="space-y-4">
            {config.texts.map((text, index) => (
              <div key={index}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-base font-bold text-zinc-900 dark:text-white">
                    نص {index + 1}
                  </span>
                  {index > 0 && (
                    <DangerButton type="button" onClick={() => removeText(index)}>
                      حذف
                    </DangerButton>
                  )}
                </div>
                <Wysiwyg
                  value={text.message}
                  onChange={(message) => updateText(index, message)}
                  fontFamily={config.fontFamily}
                  fontSize={config.fontSize}
                />
              </div>
            ))}
          </div>

          {showDuration && (
            <div className="mt-3 grid grid-cols-2 gap-4">
              <Field label="المدة (ثانية)">
                <TextInput
                  type="number"
                  min={1}
                  max={3600}
                  value={config.texts[0]?.duration ?? 5}
                  onChange={(event) => {
                    const duration = Math.max(1, Math.min(3600, Number(event.target.value) || 5));
                    update({ ...config, texts: config.texts.map((text) => ({ ...text, duration })) });
                  }}
                  className="mt-1 w-24 px-2 py-1 text-sm"
                />
              </Field>
              <Field label="سرعة الحركة (ms)">
                <TextInput
                  type="number"
                  min={MIN_ANIMATION_SPEED}
                  max={MAX_ANIMATION_SPEED}
                  step={50}
                  value={config.animationSpeed}
                  onChange={(event) =>
                    update({
                      ...config,
                      animationSpeed: clampAnimationSpeed(Number(event.target.value)),
                    })
                  }
                  className="mt-1 w-24 px-2 py-1 text-sm"
                />
              </Field>
            </div>
          )}

          {config.texts.length < MAX_TEXTS && (
            <LinkButton type="button" onClick={addText} className="mt-3">
              + إضافة نص
            </LinkButton>
          )}

          <div className="mt-5 flex items-center justify-end gap-3">
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
            <GhostButton
              type="button"
              size="sm"
              onClick={refreshPreview}
              aria-label="تحديث المعاينة"
              title="تحديث المعاينة"
              className="!px-2 !py-1"
            >
              <HiArrowPath className="size-4" />
            </GhostButton>
          }
        >
          <div className="mt-2 overflow-hidden border border-black/10 dark:border-white/10">
            {!config.enabled ? (
              <div className="bg-zinc-100 px-3 py-2 text-center text-sm text-zinc-400 dark:bg-zinc-800">
                الشريط معطّل
              </div>
            ) : snippet ? (
              <iframe
                key={previewKey}
                ref={previewRef}
                title="معاينة شريط العروض"
                srcDoc={previewDoc}
                onLoad={pushPreview}
                style={{
                  height: `${config.height}px`,
                  width: "100%",
                  border: 0,
                  display: "block",
                }}
              />
            ) : (
              <div className="bg-zinc-100 px-3 py-2 text-center text-sm text-zinc-400 dark:bg-zinc-800">
                جارٍ التحميل…
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
