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
import StoreLinkCard from "@/components/store-link-card";
import { isSupabaseConfigured } from "@/lib/supabase";
import { readMerchantId, readModuleSettings, writeModuleSettings } from "@/lib/settings";
import { moduleNumbers } from "@/lib/modules";
import {
  Button,
  Card,
  ColorField,
  ColorInput,
  DangerButton,
  Field,
  FontSelect,
  GhostButton,
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
  const [config, setConfig] = useState<Config>(DEFAULT_LUCK_WHEEL);
  const [snippet, setSnippet] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const previewRef = useRef<HTMLIFrameElement | null>(null);
  const { show } = useToast();

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isSupabaseConfigured()) return;
      const remote = await readModuleSettings<Config>(readMerchantId(), LUCK_WHEEL_MODULE_NUM);
      if (cancelled || !remote) return;
      const merged = normalizeLuckWheel(remote);
      setConfig(merged);
    })();
    return () => { cancelled = true; };
  }, []);

  function update(next: Config) {
    setConfig(next);
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
          id: `prize-${Date.now()}`,
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

  function save() {
    const next = normalizeLuckWheel(config);
    setConfig(next);
    if (isSupabaseConfigured()) {
      void writeModuleSettings(readMerchantId(), LUCK_WHEEL_MODULE_NUM, next);
    }
    refreshPreview();
    show("ØªÙ… Ø§Ù„Ø­ÙØ¸");
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
      <div className="space-y-5">
        <StoreLinkCard />

        <Card title="Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ø¹Ø¬Ù„Ø©">
          <ToggleRow
            title="ØªÙØ¹ÙŠÙ„ Ø¹Ø¬Ù„Ø© Ø§Ù„Ø­Ø¸"
            description="Ø¥Ø¸Ù‡Ø§Ø± Ù†Ø§ÙØ°Ø© Ø§Ù„Ø¹Ø¬Ù„Ø© ÙÙŠ ÙˆØ§Ø¬Ù‡Ø© Ø§Ù„Ù…ØªØ¬Ø±."
            checked={config.enabled}
            onChange={(enabled) => update({ ...config, enabled })}
            label="ØªÙØ¹ÙŠÙ„ Ø¹Ø¬Ù„Ø© Ø§Ù„Ø­Ø¸"
          />

          <Field label="Ø§Ù„Ø¹Ù†ÙˆØ§Ù†" className="mt-5">
            <TextInput
              value={config.headline}
              onChange={(event) => update({ ...config, headline: event.target.value })}
              className="mt-1"
            />
          </Field>

          <Field label="Ø§Ù„ÙˆØµÙ" className="mt-4">
            <TextInput
              value={config.description}
              onChange={(event) => update({ ...config, description: event.target.value })}
              className="mt-1"
            />
          </Field>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <Field label="Ù†Øµ Ø²Ø± Ø§Ù„Ø¹Ø¬Ù„Ø©">
              <TextInput
                value={config.buttonText}
                onChange={(event) => update({ ...config, buttonText: event.target.value })}
                className="mt-1"
              />
            </Field>
            <Field label="Ù…Ø¯Ø© Ø§Ù„Ø¯ÙˆØ±Ø§Ù† (ms)">
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

          <Field label="Ø±Ø³Ø§Ù„Ø© Ø§Ù„ÙÙˆØ²" className="mt-4">
            <TextInput
              value={config.successText}
              onChange={(event) => update({ ...config, successText: event.target.value })}
              className="mt-1"
            />
          </Field>

          <Field label="Ø§Ù„Ø®Ø·" className="mt-5">
            <FontSelect
              value={config.fontFamily}
              options={FONT_OPTIONS}
              onChange={(fontFamily) => update({ ...config, fontFamily })}
              className="mt-1"
            />
          </Field>

          <ColorField
            label="Ù„ÙˆÙ† Ø§Ù„ØªÙ…ÙŠÙŠØ²"
            value={config.accentColor}
            onChange={(accentColor) => update({ ...config, accentColor })}
            pickerHeight={140}
          />

          <div className="mt-5 flex items-center justify-end">
            <Button type="button" onClick={save}>
              Ø­ÙØ¸
            </Button>
          </div>
        </Card>

        <Card title="Ø§Ù„Ø¬ÙˆØ§Ø¦Ø²">
          <Hint>
            Ø§Ø­ØªÙ…Ø§Ù„ÙŠØ© ÙƒÙ„ Ø¬Ø§Ø¦Ø²Ø© ØªÙØ­Ø³Ø¨ Ù…Ù† Ù…Ø¬Ù…ÙˆØ¹ Ø§Ù„Ø£ÙˆØ²Ø§Ù†. Ø§ØªØ±Ùƒ ÙƒÙˆØ¯ Ø§Ù„ÙƒÙˆØ¨ÙˆÙ† ÙØ§Ø±ØºÙ‹Ø§ Ù„Ø¬Ø§Ø¦Ø²Ø©
            Â«Ø­Ø¸ Ø£ÙˆÙØ±Â» Ø¨Ø¯ÙˆÙ† ÙƒÙˆØ¨ÙˆÙ†.
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
                      Ø§Ù„Ø¬Ø§Ø¦Ø²Ø© {index + 1}
                    </span>
                    <DangerButton
                      type="button"
                      disabled={config.prizes.length <= MIN_PRIZES}
                      onClick={() => removePrize(index)}
                      className="inline-flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <HiTrash className="size-3.5" />
                      Ø­Ø°Ù
                    </DangerButton>
                  </div>

                  <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Ø§Ø³Ù… Ø§Ù„Ø¬Ø§Ø¦Ø²Ø©">
                      <TextInput
                        value={prize.label}
                        onChange={(event) => updatePrize(index, { label: event.target.value })}
                        placeholder="Ø®ØµÙ… 10%"
                        className="mt-1"
                      />
                    </Field>
                    <Field label="ÙƒÙˆØ¯ Ø§Ù„ÙƒÙˆØ¨ÙˆÙ†">
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
                    <Field label="Ø§Ù„ÙˆØ²Ù†">
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
                        Ø§Ù„Ù„ÙˆÙ†
                      </span>
                      <ColorInput
                        value={prize.color}
                        onChange={(color) => updatePrize(index, { color })}
                        className="mt-2"
                      />
                    </div>

                    <Hint className="pb-2">
                      Ø§Ù„Ø§Ø­ØªÙ…Ø§Ù„ÙŠØ©: {chance}% Â·{" "}
                      {prize.couponCode.trim() ? "ÙƒÙˆØ¨ÙˆÙ†" : "Ø¨Ø¯ÙˆÙ† ÙƒÙˆØ¨ÙˆÙ†"}
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
              Ø¥Ø¶Ø§ÙØ© Ø¬Ø§Ø¦Ø²Ø©
            </LinkButton>
          )}

          <div className="mt-5 flex items-center justify-end">
            <Button type="button" onClick={save}>
              Ø­ÙØ¸
            </Button>
          </div>
        </Card>

        <Card title="Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„Ø¸Ù‡ÙˆØ± ÙˆØ§Ù„Ø¬Ù…Ø¹">
          <div className="space-y-4">
            <div>
              <ToggleRow
                title="Ø§Ù„Ø¸Ù‡ÙˆØ± Ø¨Ø¹Ø¯ ØªØ£Ø®ÙŠØ±"
                description="ÙØªØ­ Ø§Ù„Ø¹Ø¬Ù„Ø© ØªÙ„Ù‚Ø§Ø¦ÙŠÙ‹Ø§ Ø¨Ø¹Ø¯ Ù…Ø¯Ø© Ù…Ù† ØªØ­Ù…ÙŠÙ„ Ø§Ù„ØµÙØ­Ø©."
                checked={config.openOnDelay}
                onChange={(openOnDelay) => update({ ...config, openOnDelay })}
                label="Ø§Ù„Ø¸Ù‡ÙˆØ± Ø¨Ø¹Ø¯ ØªØ£Ø®ÙŠØ±"
              />
              <Field label="Ø¨Ø¹Ø¯ (Ø«Ø§Ù†ÙŠØ©)" className="mt-3">
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
              title="Ø¹Ù†Ø¯ Ù…Ø­Ø§ÙˆÙ„Ø© Ø§Ù„Ø®Ø±ÙˆØ¬"
              description="ÙØªØ­ Ø§Ù„Ø¹Ø¬Ù„Ø© Ø¹Ù†Ø¯Ù…Ø§ ÙŠØ®Ø±Ø¬ Ù…Ø¤Ø´Ø± Ø§Ù„Ø²Ø§Ø¦Ø± Ù…Ù† Ø£Ø¹Ù„Ù‰ Ø§Ù„ØµÙØ­Ø©."
              checked={config.openOnExit}
              onChange={(openOnExit) => update({ ...config, openOnExit })}
              label="Ø¹Ù†Ø¯ Ù…Ø­Ø§ÙˆÙ„Ø© Ø§Ù„Ø®Ø±ÙˆØ¬"
            />

            <ToggleRow
              title="Ø²Ø± Ø¹Ø§Ø¦Ù… ÙÙŠ Ø§Ù„Ù…ØªØ¬Ø±"
              description="Ø²Ø± ØµØºÙŠØ± Ø£Ø³ÙÙ„ Ø§Ù„ØµÙØ­Ø© ÙŠÙØªØ­ Ø§Ù„Ø¹Ø¬Ù„Ø© ÙÙŠ Ø£ÙŠ ÙˆÙ‚Øª."
              checked={config.openOnButton}
              onChange={(openOnButton) => update({ ...config, openOnButton })}
              label="Ø²Ø± Ø¹Ø§Ø¦Ù… ÙÙŠ Ø§Ù„Ù…ØªØ¬Ø±"
            />

            <ToggleRow
              title="Ù…Ø±Ø© ÙˆØ§Ø­Ø¯Ø© Ù„ÙƒÙ„ Ø²Ø§Ø¦Ø±"
              description="Ù„Ø§ ÙŠØ¸Ù‡Ø± Ø§Ù„Ø·Ù„Ø¨ Ù…Ø±Ø© Ø£Ø®Ø±Ù‰ Ø¨Ø¹Ø¯ Ø£Ù† ÙŠØ¯ÙˆØ± Ø§Ù„Ø²Ø§Ø¦Ø± ÙˆÙŠØ­ØµÙ„ Ø¹Ù„Ù‰ Ø¬Ø§Ø¦Ø²ØªÙ‡."
              checked={config.oncePerVisitor}
              onChange={(oncePerVisitor) => update({ ...config, oncePerVisitor })}
              label="Ù…Ø±Ø© ÙˆØ§Ø­Ø¯Ø© Ù„ÙƒÙ„ Ø²Ø§Ø¦Ø±"
            />

            <div>
              <ToggleRow
                title="Ø·Ù„Ø¨ Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ"
                description="Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø§Ù„Ø¯ÙˆØ±Ø§Ù† Ù‚Ø¨Ù„ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ù„Ø¨Ø±ÙŠØ¯ØŒ ÙˆÙŠÙØ­ÙØ¸ Ø§Ù„Ø¨Ø±ÙŠØ¯ Ù…Ø¹ Ø§Ù„Ø¬Ø§Ø¦Ø²Ø©."
                checked={config.requireEmail}
                onChange={(requireEmail) => update({ ...config, requireEmail })}
                label="Ø·Ù„Ø¨ Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ"
              />
              {config.requireEmail && (
                <Field label="Ù†Øµ Ø­Ù‚Ù„ Ø§Ù„Ø¨Ø±ÙŠØ¯" className="mt-3">
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
              Ø­ÙØ¸
            </Button>
          </div>
        </Card>
      </div>

      <div className="space-y-5">
        <Card
          title="Ù…Ø¹Ø§ÙŠÙ†Ø©"
          action={
            <GhostButton
              type="button"
              size="sm"
              onClick={refreshPreview}
              aria-label="ØªØ­Ø¯ÙŠØ« Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø©"
              title="ØªØ­Ø¯ÙŠØ« Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø©"
              className="!px-2 !py-1"
            >
              <HiArrowPath className="size-4" />
            </GhostButton>
          }
        >
          <div className="mt-2 overflow-hidden border border-black/10 dark:border-white/10">
            {!config.enabled ? (
              <div className="bg-zinc-100 px-3 py-2 text-center text-sm text-zinc-400 dark:bg-zinc-800">
                Ø¹Ø¬Ù„Ø© Ø§Ù„Ø­Ø¸ Ù…Ø¹Ø·Ù‘Ù„Ø©
              </div>
            ) : snippet ? (
              <iframe
                key={previewKey}
                ref={previewRef}
                title="Ù…Ø¹Ø§ÙŠÙ†Ø© Ø¹Ø¬Ù„Ø© Ø§Ù„Ø­Ø¸"
                srcDoc={previewDoc}
                onLoad={pushPreview}
                style={{ height: 640, width: "100%", border: 0, display: "block" }}
              />
            ) : (
              <div className="bg-zinc-100 px-3 py-2 text-center text-sm text-zinc-400 dark:bg-zinc-800">
                Ø¬Ø§Ø±Ù Ø§Ù„ØªØ­Ù…ÙŠÙ„â€¦
              </div>
            )}
          </div>
        </Card>

        <Card title="ÙƒÙŠÙ ØªØ¹Ù…Ù„ Ø§Ù„Ø¬ÙˆØ§Ø¦Ø²ØŸ">
          <Hint className="text-sm leading-7">
            Ø§Ù„Ø¬ÙˆØ§Ø¦Ø² Ø§Ù„Ø­Ø§Ù„ÙŠØ© Ø¨ÙƒÙˆØ¨ÙˆÙ†Ø§Øª ÙŠØ¯ÙˆÙŠØ©: Ø£Ù†Øª ØªÙ†Ø´Ø¦ Ø§Ù„ÙƒÙˆØ¨ÙˆÙ† ÙÙŠ Ø³Ù„Ø© ÙˆØªÙƒØªØ¨ ÙƒÙˆØ¯Ù‡ Ù‡Ù†Ø§ØŒ Ø«Ù…
            ÙŠØ¸Ù‡Ø± Ù„Ù„Ø²Ø§Ø¦Ø± Ø¹Ù†Ø¯ Ø§Ù„ÙÙˆØ². Ù‡Ø°Ø§ ÙŠØ¹Ù…Ù„ ÙÙŠ Ø£ÙŠ Ù…ØªØ¬Ø± Ø¯ÙˆÙ† Ø£ÙŠ Ø±Ø¨Ø· Ø¥Ø¶Ø§ÙÙŠ.
          </Hint>
          <Hint className="mt-2 text-sm leading-7">
            Ø§Ù„ØªÙˆÙ„ÙŠØ¯ Ø§Ù„ØªÙ„Ù‚Ø§Ø¦ÙŠ Ù„ÙƒÙˆØ¨ÙˆÙ† Ø¬Ø¯ÙŠØ¯ Ù„ÙƒÙ„ Ø²Ø§Ø¦Ø± ÙŠØ­ØªØ§Ø¬ Ø±Ø¨Ø· OAuth Ø¨Ù…ØªØ¬Ø± ÙƒÙ„ ØªØ§Ø¬Ø±
            (ØµÙ„Ø§Ø­ÙŠØ© Ø§Ù„ÙƒÙˆØ¨ÙˆÙ†Ø§Øª)ØŒ ÙˆÙ‡Ùˆ ØºÙŠØ± Ù…ÙØ¹Ù‘Ù„ Ø¨Ø¹Ø¯.
          </Hint>
        </Card>
      </div>
    </div>
  );
}
