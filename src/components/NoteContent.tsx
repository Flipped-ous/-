import React, { useEffect, useMemo, useRef } from "react";
import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  type NodeViewProps,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import Placeholder from "@tiptap/extension-placeholder";
import MarkdownIt from "markdown-it";
import type { NoteDocument } from "../types/index.ts";
import { addAttachment, readAttachment } from "../services/notesRepository.ts";

const markdown = new MarkdownIt({ html: false, linkify: false, breaks: true });
function useImage(id?: string, remote?: string) {
  const [src, setSrc] = React.useState(
    id ? "" : /^https?:\/\//i.test(remote || "") ? remote! : "",
  );
  useEffect(() => {
    let active = true,
      url = "";
    if (id)
      readAttachment(id)
        .then((row) => {
          if (active && row) {
            url = URL.createObjectURL(row.blob);
            setSrc(url);
          }
        })
        .catch(() => {});
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, remote]);
  return src;
}
export function useNoteExtensions(onPreview?: (src: string) => void) {
  const preview = useRef(onPreview);
  preview.current = onPreview;
  return useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, protocols: ["http", "https", "mailto"] },
      }),
      TableKit.configure({ table: { resizable: false } }),
      Placeholder.configure({
        placeholder: "粘贴聊天总结，或写下值得记住的内容……",
      }),
      Image.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            attachmentId: {
              default: null,
              parseHTML: () => null,
              renderHTML: () => ({}),
            },
          };
        },
        addNodeView() {
          return ReactNodeViewRenderer(function NoteImage({
            node,
            editor,
            selected,
          }: NodeViewProps) {
            const src = useImage(node.attrs.attachmentId, node.attrs.src);
            return (
              <NodeViewWrapper
                className={`note-image ${selected ? "selected" : ""}`}
                contentEditable={false}
              >
                {src ? (
                  <img
                    src={src}
                    alt={node.attrs.alt || "笔记图片"}
                    draggable={false}
                    onClick={() => {
                      if (!editor.isEditable) preview.current?.(src);
                    }}
                  />
                ) : (
                  <span>图片读取中，若未显示请检查本机附件</span>
                )}
                {!node.attrs.attachmentId && <small>外部图片 · 联网查看</small>}
              </NodeViewWrapper>
            );
          });
        },
      }).configure({ allowBase64: false }),
    ],
    [],
  );
}
export function NoteContent({
  document,
  onPreview,
}: {
  document: NoteDocument;
  onPreview: (src: string) => void;
}) {
  const extensions = useNoteExtensions(onPreview);
  const editor = useEditor({
    extensions,
    content: document,
    editable: false,
    editorProps: {
      attributes: { class: "note-prose", role: "document" },
      handleClick(_view, _pos, event) {
        const link = (event.target as Element).closest("a");
        if (link) {
          const url = link.getAttribute("href") || "";
          if (/^https?:\/\//i.test(url)) window.open(url, "_blank", "noopener");
          return true;
        }
        return false;
      },
    },
  });
  useEffect(() => {
    if (editor && JSON.stringify(editor.getJSON()) !== JSON.stringify(document))
      editor.commands.setContent(document, { emitUpdate: false });
  }, [document, editor]);
  return <EditorContent editor={editor} />;
}
export function useNoteEditor(
  document: NoteDocument,
  onChange: (doc: NoteDocument) => void,
  onError: (msg: string) => void,
  onBusy: (busy: boolean) => void,
) {
  const update = useRef(onChange);
  update.current = onChange;
  const error = useRef(onError);
  error.current = onError;
  const busy = useRef(onBusy);
  busy.current = onBusy;
  const extensions = useNoteExtensions();
  const editor = useEditor({
    extensions,
    content: document,
    editorProps: {
      attributes: {
        class: "note-prose note-editable",
        "aria-label": "笔记正文",
        role: "textbox",
        "aria-multiline": "true",
      },
      handlePaste(_view, event) {
        const images = Array.from(event.clipboardData?.files || []).filter(
          (f) => f.type.startsWith("image/"),
        );
        if (images.length) {
          void insertImages(images);
          return true;
        }
        const text = event.clipboardData?.getData("text/plain") || "";
        if (
          !event.clipboardData?.getData("text/html") &&
          /(^|\n)(#{1,6} |[-*] |\d+\. |>|```)|\*\*[^*]+\*\*/.test(text)
        ) {
          editor?.commands.insertContent(markdown.render(text));
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => update.current(editor.getJSON() as NoteDocument),
  });
  async function insertImages(files: File[]) {
    if (!editor) return;
    busy.current(true);
    try {
      for (const file of files) {
        const a = await addAttachment(file);
        if (!editor.isDestroyed)
          editor
            .chain()
            .focus()
            .insertContent({
              type: "image",
              attrs: { attachmentId: a.id, alt: a.name },
            })
            .run();
      }
    } catch (e) {
      error.current(e instanceof Error ? e.message : "图片保存失败");
    } finally {
      busy.current(false);
    }
  }
  return { editor, insertImages };
}
