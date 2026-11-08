"use client";

import { useEffect, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as HiIcons from "react-icons/hi2";
import { HexColorPicker } from "react-colorful";
import {
  DEFAULT_TOP_OFFERS_BAR,
  TOP_OFFERS_BAR_FONTS,
  type TopOffersBarConfig as Config,
  readTopOffersBar,
  writeTopOffersBar,
} from "@/lib/top-offers-bar";
import { isSupabaseConfigured } from "@/lib/supabase";
import { readModuleSettings, writeModuleSettings, readMerchantId } from "@/lib/settings";
import { moduleNumbers } from "@/lib/modules";

const OFFERS_MODULE_NUM = moduleNumbers["top-offers-bar"] ?? 1;
const ALL_ICONS = Object.entries(HiIcons)
  .filter(([name]) => name.startsWith("Hi"))
  .map(([name, Comp]) => ({ name, Comp: Comp as React.ComponentType<{ className?: string }> }));
const ICONS_PER_PAGE = 60;

export default function TopOffersBarConfig() {
  const [config, setConfig] = useState<Config>(DEFAULT_TOP_OFFERS_BAR);
  const editorRef = useRef<HTMLDivElement>(null);
  const [showIcons, setShowIcons] = useState(false);
  const [iconSearch, setIconSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setConfig(readTopOffersBar());
      if (isSupabaseConfigured()) {
        const remote = await readModuleSettings<Config>(readMerchantId(), OFFERS_MODULE_NUM);
        if (cancelled) return;
        if (remote) {
          const merged = { ...DEFAULT_TOP_OFFERS_BAR, ...remote };
          setConfig(merged);
          writeTopOffersBar(merged);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function update(next: Config) {
    setConfig(next);
  }

  function syncEditor() {
    if (!editorRef.current) return;
    update({ ...config, message: editorRef.current.innerHTML });
  }

  function insertLink() {
    const url = window.prompt("رابط:");
    if (url) {
      document.execCommand("createLink", false, url);
      syncEditor();
    }
  }

  function insertIcon(Icon: React.ComponentType<{ className?: string }>) {
    const svg = renderToStaticMarkup(<Icon className="inline size-4" />);
    document.execCommand("insertHTML", false, svg);
    syncEditor();
    setShowIcons(false);
  }

  function save() {
    writeTopOffersBar(config);
    if (isSupabaseConfigured()) {
      void writeModuleSettings(readMerchantId(), OFFERS_MODULE_NUM, config);
    }
    try {
      (window as any).embedded?.ui?.toast?.success?.("تم الحفظ", 2000);
    } catch {
      /* SDK not ready */
    }
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
      {/* Right column: settings */}
      <div className="space-y-5">
        <div className="rounded-xl border border-black/10 bg-white p-5 pt-4 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <h2 className="-mx-5 mb-4 border-b-2 border-zinc-200 px-5 pb-3 text-lg font-semibold tracking-tight dark:border-zinc-700">إعدادات الشريط</h2>

          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium">تفعيل الشريط</h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                إظهار شريط العروض أعلى واجهة المتجر.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={config.enabled}
              aria-label="تفعيل الشريط"
              onClick={() => update({ ...config, enabled: !config.enabled })}
              className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
              style={{ backgroundColor: config.enabled ? "#1781ae" : "#d4d4d8" }}
            >
              <span
                className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${
                  config.enabled ? "start-[22px]" : "start-0.5"
                }`}
              />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">ارتفاع الشريط (px)</label>
              <input
                type="number"
                min={24}
                max={80}
                value={config.height}
                onChange={(e) => update({ ...config, height: Number(e.target.value) || 46 })}
                className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-[#1781ae] dark:border-white/15 dark:bg-zinc-950"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">حجم الخط (px)</label>
              <input
                type="number"
                min={10}
                max={24}
                value={config.fontSize}
                onChange={(e) => update({ ...config, fontSize: Number(e.target.value) || 16 })}
                className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-[#1781ae] dark:border-white/15 dark:bg-zinc-950"
              />
            </div>
          </div>

          <div className="mt-5">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">الخط</label>
            <select
              value={config.fontFamily}
              onChange={(e) => update({ ...config, fontFamily: e.target.value })}
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-[#1781ae] dark:border-white/15 dark:bg-zinc-950"
            >
              {TOP_OFFERS_BAR_FONTS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div className="mt-5">
            <p className="text-sm font-medium">لون الشريط</p>
            <div className="mt-3">
              <HexColorPicker
                color={config.color}
                onChange={(color) => update({ ...config, color })}
                style={{ width: "100%", height: 140 }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{config.color}</span>
              <input
                type="text"
                value={config.color}
                onChange={(e) => update({ ...config, color: e.target.value })}
                className="w-24 rounded border border-black/10 bg-white px-2 py-1 text-xs dark:border-white/15 dark:bg-zinc-950"
              />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={save}
              className="btn-brand rounded-lg px-4 py-2 text-sm font-medium"
            >
              حفظ
            </button>
          </div>
        </div>

        {/* Card 2: the text */}
        <div className="rounded-xl border border-black/10 bg-white p-5 pt-4 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <h2 className="-mx-5 mb-4 border-b-2 border-zinc-200 px-5 pb-3 text-lg font-semibold tracking-tight dark:border-zinc-700">النص 1</h2>
          <div className="overflow-hidden rounded-lg border border-black/10 dark:border-white/15">
            <div className="flex flex-wrap items-center gap-1 border-b border-black/10 bg-zinc-50 px-2 py-1 dark:border-white/10 dark:bg-zinc-800 relative">
              <button type="button" onClick={() => { document.execCommand("bold"); syncEditor(); }} className="rounded px-2 py-1 text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700" title="Bold"><b>B</b></button>
              <button type="button" onClick={() => { document.execCommand("italic"); syncEditor(); }} className="rounded px-2 py-1 text-xs italic hover:bg-zinc-200 dark:hover:bg-zinc-700" title="Italic">I</button>
              <button type="button" onClick={() => insertLink()} className="rounded px-2 py-1 text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700" title="Link">🔗</button>
              <button type="button" onClick={() => setShowIcons((v) => !v)} className="rounded px-2 py-1 text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700" title="Icon">+</button>
              {showIcons && (
                <div className="absolute z-10 mt-1 w-64 rounded-lg border border-black/10 bg-white p-2 shadow-lg dark:border-white/10 dark:bg-zinc-800">
                  <input
                    type="text"
                    value={iconSearch}
                    onChange={(e) => setIconSearch(e.target.value)}
                    placeholder="بحث..."
                    className="mb-2 w-full rounded border border-black/10 bg-zinc-50 px-2 py-1 text-xs dark:border-white/15 dark:bg-zinc-900"
                  />
                  <div className="grid max-h-40 grid-cols-8 gap-1 overflow-y-auto">
                    {ALL_ICONS
                      .filter(({ name }) => name.toLowerCase().includes(iconSearch.toLowerCase()))
                      .slice(0, ICONS_PER_PAGE)
                      .map(({ name, Comp }) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => insertIcon(Comp)}
                          title={name}
                          className="grid size-7 place-items-center rounded hover:bg-zinc-100 dark:hover:bg-zinc-700"
                        >
                          <Comp className="size-4" />
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={syncEditor}
              className="min-h-[4rem] px-3 py-2 text-sm outline-none"
              style={{ fontFamily: config.fontFamily, fontSize: `${config.fontSize}px` }}
              dangerouslySetInnerHTML={{ __html: config.message }}
            />
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {(editorRef.current?.textContent ?? config.message.replace(/<[^>]*>/g, "")).length}/120
          </p>
        </div>
      </div>

      {/* Left column: preview */}
      <div className="space-y-5">
        <div className="rounded-xl border border-black/10 bg-white p-5 pt-4 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <h2 className="-mx-5 mb-4 border-b-2 border-zinc-200 px-5 pb-3 text-lg font-semibold tracking-tight dark:border-zinc-700">معاينة</h2>
          <div className="mt-2 overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
            {config.enabled ? (
              <div
                style={{
                  backgroundColor: config.color,
                  height: `${config.height}px`,
                  fontFamily: config.fontFamily,
                  fontSize: `${config.fontSize}px`,
                }}
                className="flex items-center justify-center px-3 text-center font-medium text-white"
                dangerouslySetInnerHTML={{ __html: config.message || "…" }}
              />
            ) : (
              <div className="bg-zinc-100 px-3 py-2 text-center text-xs text-zinc-400 dark:bg-zinc-800">
                الشريط معطّل
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function embeddedToast(msg: string) {
  try {
    (window as any).embedded?.ui?.toast?.success?.(msg, 2000);
  } catch {
    /* not available */
  }
}