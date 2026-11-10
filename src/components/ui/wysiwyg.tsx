"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as HiIcons from "react-icons/hi2";
import Hint from "./hint";
import { TextInput } from "./input";

const ALL_ICONS = Object.entries(HiIcons)
  .filter(([name]) => name.startsWith("Hi"))
  .map(([name, Comp]) => ({
    name,
    Comp: Comp as React.ComponentType<{ className?: string }>,
  }));

const ICONS_PER_PAGE = 60;

export default function Wysiwyg({
  value,
  onChange,
  fontFamily,
  fontSize,
  maxLength = 120,
  minHeight = "2.5rem",
}: {
  value: string;
  onChange: (html: string) => void;
  fontFamily?: string;
  fontSize?: number;
  maxLength?: number;
  minHeight?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showIcons, setShowIcons] = useState(false);
  const [iconSearch, setIconSearch] = useState("");

  // Keep the DOM in sync when the value changes from outside (e.g. remote load).
  useEffect(() => {
    const el = editorRef.current;
    if (!el || document.activeElement === el) return;
    if (el.innerHTML !== value) el.innerHTML = value;
  }, [value]);

  const icons = useMemo(
    () =>
      ALL_ICONS.filter(({ name }) =>
        name.toLowerCase().includes(iconSearch.toLowerCase()),
      ).slice(0, ICONS_PER_PAGE),
    [iconSearch],
  );

  function sync() {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }

  function exec(command: string, arg?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    sync();
  }

  function insertLink() {
    const url = window.prompt("رابط:");
    if (url) exec("createLink", url);
  }

  function insertIcon(Icon: React.ComponentType<{ className?: string }>) {
    const svg = renderToStaticMarkup(<Icon className="inline size-4" />);
    exec("insertHTML", svg);
    setShowIcons(false);
  }

  const textLength =
    editorRef.current?.textContent?.length ?? value.replace(/<[^>]*>/g, "").length;

  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-black/10 dark:border-white/15">
        <div className="relative flex flex-wrap items-center gap-1 border-b border-black/10 bg-zinc-50 px-2 py-1 dark:border-white/10 dark:bg-zinc-800">
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => exec("bold")}
            className="rounded px-2 py-1 text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700"
            title="Bold"
          >
            <b>B</b>
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => exec("italic")}
            className="rounded px-2 py-1 text-xs italic hover:bg-zinc-200 dark:hover:bg-zinc-700"
            title="Italic"
          >
            I
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={insertLink}
            className="rounded px-2 py-1 text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700"
            title="Link"
          >
            🔗
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setShowIcons((open) => !open)}
            className="rounded px-2 py-1 text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700"
            title="Icon"
          >
            +
          </button>

          {showIcons && (
            <div className="absolute z-10 mt-1 w-64 rounded-lg border border-black/10 bg-white p-2 shadow-lg dark:border-white/10 dark:bg-zinc-800">
              <TextInput
                type="text"
                value={iconSearch}
                onChange={(event) => setIconSearch(event.target.value)}
                placeholder="بحث..."
                className="mb-2 px-2 py-1 text-xs"
              />
              <div className="grid max-h-40 grid-cols-8 gap-1 overflow-y-auto">
                {icons.map(({ name, Comp }) => (
                  <button
                    key={name}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
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
          onInput={sync}
          className="px-3 py-2 text-sm outline-none"
          style={{ minHeight, fontFamily, fontSize: fontSize ? `${fontSize}px` : undefined }}
          dangerouslySetInnerHTML={{ __html: value }}
        />
      </div>

      {maxLength > 0 && (
        <Hint className="mt-1">
          {textLength}/{maxLength}
        </Hint>
      )}
    </div>
  );
}
