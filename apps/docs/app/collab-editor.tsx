"use client";

import { useEffect, useMemo, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import Mention from "@tiptap/extension-mention";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { Bold, CheckCircle2, Code2, Heading2, Italic, Link2, List, MessageSquareText, Redo2, Send, Underline, Undo2, X } from "lucide-react";

const DEFAULT_CONTENT = `
  <p>좋은 제품은 더 많은 기능이 아니라, 팀이 <strong>같은 방향을 보게 하는 명확한 선택</strong>에서 시작합니다.</p>
  <h2>우리가 해결하려는 것</h2>
  <p>Flora는 흩어진 문서와 결정 기록을 하나의 흐름으로 연결합니다. 누구나 맥락을 빠르게 찾고, 필요한 사람을 부르고, 다음 행동으로 이어갈 수 있어야 합니다.</p>
  <blockquote><p><strong>✦ 2027 North Star</strong></p><p>팀의 모든 결정이 발견 가능하고, 설명 가능하며, 실행으로 연결된다.</p></blockquote>
  <h2>핵심 원칙</h2>
  <ol><li><p><strong>맥락은 한곳에.</strong> 결정, 근거, 후속 작업을 문서와 함께 둡니다.</p></li><li><p><strong>협업은 자연스럽게.</strong> 필요한 팀원을 멘션해 바로 연결합니다.</p></li><li><p><strong>형식은 열려 있게.</strong> 기존 Markdown과 HTML 자료를 가져올 수 있습니다.</p></li></ol>
  <h2>이번 분기 집중 영역</h2>
  <ul><li><p><strong>Onboarding</strong> — 첫 문서 작성까지 3분 안에</p></li><li><p><strong>Discovery</strong> — 검색에서 답까지 한 번에</p></li><li><p><strong>Rituals</strong> — 회의와 회고를 지식으로</p></li></ul>`;

type Person = { name: string; handle: string; color: string };
type DocComment = { id: string; body: string; quote: string | null; author: string; authorId: string; createdAt: string; resolved: boolean };

export function CollabEditor({ docId, user, people, onDirty }: {
  docId: string;
  user: Person;
  people: Person[];
  onDirty: () => void;
}) {
  const [mentionOpen, setMentionOpen] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [embedType, setEmbedType] = useState<"markdown" | "html">("markdown");
  const [embedValue, setEmbedValue] = useState("## 참고 자료\n- 2027년 핵심 목표\n- 고객 피드백 요약");
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<DocComment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);
  const [connection, setConnection] = useState<"local" | "connecting" | "connected" | "offline">("local");
  const roomName = `flora:${docId}`;
  const ydoc = useMemo(() => new Y.Doc(), [roomName]);
  const commentStore = useMemo(() => ydoc.getArray<DocComment>("comments"), [ydoc]);
  const hocuspocusUrl = process.env.NEXT_PUBLIC_HOCUSPOCUS_URL;
  const provider = useMemo(() => hocuspocusUrl ? new HocuspocusProvider({
    url: hocuspocusUrl,
    name: roomName,
    document: ydoc,
    token: async () => {
      const response = await fetch("/api/collaboration-token", { cache: "no-store" });
      if (!response.ok) throw new Error("Collaboration authentication failed");
      return ((await response.json()) as { token: string }).token;
    },
    flushDelay: 250,
  }) : null, [hocuspocusUrl, roomName, ydoc]);

  useEffect(() => {
    const persistence = new IndexeddbPersistence(roomName, ydoc);
    if (provider) {
      provider.awareness?.setLocalStateField("user", user);
      provider.on("status", ({ status }: { status: string }) => setConnection(status === "connected" ? "connected" : status === "connecting" ? "connecting" : "offline"));
    }
    return () => { persistence.destroy(); provider?.destroy(); ydoc.destroy(); };
  }, [provider, roomName, user, ydoc]);

  useEffect(() => {
    const syncComments = () => setComments(commentStore.toArray());
    commentStore.observe(syncComments);
    syncComments();
    return () => commentStore.unobserve(syncComments);
  }, [commentStore]);

  const extensions = useMemo(() => {
    const base = [
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ document: ydoc }),
      Mention.configure({
        HTMLAttributes: { class: "mention-chip" },
        renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
        suggestion: { items: () => [] },
      }),
    ];
    if (provider) base.push(CollaborationCaret.configure({ provider, user }) as never);
    return base;
  }, [provider, user, ydoc]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    editorProps: { attributes: { class: "prose-editor", "aria-label": "문서 본문" } },
    onUpdate: onDirty,
  }, [roomName]);

  useEffect(() => {
    if (!editor) return;
    const initialize = () => {
      if (ydoc.getXmlFragment("default").length === 0 && editor.isEmpty) editor.commands.setContent(DEFAULT_CONTENT);
    };
    const timer = window.setTimeout(initialize, 120);
    return () => window.clearTimeout(timer);
  }, [editor, ydoc]);

  const mention = (person: Person) => {
    editor?.chain().focus().insertContent([{ type: "mention", attrs: { id: person.handle, label: person.name } }, { type: "text", text: " " }]).run();
    setMentionOpen(false);
  };

  const embed = () => {
    editor?.chain().focus().insertContent({ type: "codeBlock", attrs: { language: embedType }, content: [{ type: "text", text: embedValue }] }).run();
    setEmbedOpen(false);
  };

  const askLink = () => {
    const href = window.prompt("링크 주소를 입력하세요");
    if (href) editor?.chain().focus().setLink({ href }).run();
  };

  const openComments = () => {
    if (editor) {
      const { from, to } = editor.state.selection;
      const quote = from === to ? "" : editor.state.doc.textBetween(from, to, " ").trim();
      setSelectedQuote(quote || null);
    }
    setCommentsOpen(true);
  };

  const addComment = () => {
    const body = commentBody.trim();
    if (!body) return;
    commentStore.push([{ id: crypto.randomUUID(), body, quote: selectedQuote, author: user.name, authorId: user.handle, createdAt: new Date().toISOString(), resolved: false }]);
    setCommentBody("");
    setSelectedQuote(null);
  };

  const toggleResolved = (comment: DocComment) => {
    const index = comments.findIndex((item) => item.id === comment.id);
    if (index < 0) return;
    ydoc.transact(() => {
      commentStore.delete(index, 1);
      commentStore.insert(index, [{ ...comment, resolved: !comment.resolved }]);
    });
  };

  return <>
    <div className="collab-status"><span className={connection} />{connection === "connected" ? "실시간 연결됨" : connection === "connecting" ? "연결 중" : connection === "offline" ? "오프라인" : "이 기기에 저장됨"}<small>Yjs</small></div>
    <div className="editor-toolbar" role="toolbar" aria-label="텍스트 서식">
      <button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className={editor?.isActive("heading", { level: 2 }) ? "active" : ""} aria-label="제목 2"><Heading2 size={17} /></button>
      <i />
      <button onClick={() => editor?.chain().focus().toggleBold().run()} className={editor?.isActive("bold") ? "active" : ""} aria-label="굵게"><Bold size={17} /></button>
      <button onClick={() => editor?.chain().focus().toggleItalic().run()} className={editor?.isActive("italic") ? "active" : ""} aria-label="기울임"><Italic size={17} /></button>
      <button onClick={() => editor?.chain().focus().toggleStrike().run()} aria-label="취소선"><Underline size={17} /></button>
      <button onClick={() => editor?.chain().focus().toggleBulletList().run()} className={editor?.isActive("bulletList") ? "active" : ""} aria-label="목록"><List size={17} /></button>
      <button onClick={askLink} aria-label="링크"><Link2 size={17} /></button>
      <i />
      <button onClick={() => editor?.chain().focus().undo().run()} aria-label="실행 취소"><Undo2 size={17} /></button>
      <button onClick={() => editor?.chain().focus().redo().run()} aria-label="다시 실행"><Redo2 size={17} /></button>
      <div className="toolbar-spacer" />
      <div className="popover-anchor"><button onClick={() => setMentionOpen((v) => !v)} aria-label="사용자 멘션"><b>@</b><span className="toolbar-label">멘션</span></button>{mentionOpen && <div className="mention-menu"><small>팀원 멘션</small>{people.map((person) => <button key={person.handle} onClick={() => mention(person)}><span className="person-dot" style={{ background: person.color }}>{person.name[0]}</span><span><strong>{person.name}</strong><small>@{person.handle}</small></span></button>)}</div>}</div>
      <button onClick={openComments} aria-label="선택한 내용에 댓글 달기"><MessageSquareText size={16} /><span className="toolbar-label">댓글</span>{comments.length > 0 && <span className="toolbar-count">{comments.filter((comment) => !comment.resolved).length}</span>}</button>
      <button onClick={() => setEmbedOpen(true)} aria-label="Markdown 또는 HTML 임베드"><Code2 size={16} /><span className="toolbar-label">임베드</span></button>
    </div>
    <EditorContent editor={editor} />
    {commentsOpen && <>
      <button className="comment-scrim" onClick={() => setCommentsOpen(false)} aria-label="댓글 패널 닫기" />
      <aside className="comments-drawer" aria-label="문서 댓글">
        <header><div><MessageSquareText size={18} /><strong>댓글</strong><span>{comments.filter((comment) => !comment.resolved).length}</span></div><button onClick={() => setCommentsOpen(false)} aria-label="댓글 닫기"><X size={19} /></button></header>
        <div className="comments-list">
          {comments.length === 0 ? <div className="comments-empty"><MessageSquareText size={25} /><strong>첫 댓글을 남겨보세요</strong><p>문서 전체 또는 선택한 내용에 의견을 기록할 수 있습니다.</p></div> : comments.map((comment) => <article className={`doc-comment ${comment.resolved ? "resolved" : ""}`} key={comment.id}>
            <div className="comment-author"><Avatar name={comment.author} size="sm" /><div><strong>{comment.author}</strong><time>{new Date(comment.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</time></div></div>
            {comment.quote && <blockquote>“{comment.quote}”</blockquote>}
            <p>{comment.body}</p>
            <button className="resolve-comment" onClick={() => toggleResolved(comment)}><CheckCircle2 size={14} />{comment.resolved ? "다시 열기" : "완료 처리"}</button>
          </article>)}
        </div>
        <div className="comment-composer">
          {selectedQuote && <div className="selected-quote"><span>선택한 내용</span><p>{selectedQuote}</p><button onClick={() => setSelectedQuote(null)} aria-label="인용 취소"><X size={14} /></button></div>}
          <textarea value={commentBody} onChange={(event) => setCommentBody(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") addComment(); }} placeholder="댓글을 입력하세요. @로 팀원을 언급할 수 있어요." />
          <div><span>⌘ Enter로 등록</span><Button label="댓글 등록" variant="primary" size="sm" icon={<Send size={14} />} isDisabled={!commentBody.trim()} onClick={addComment} /></div>
        </div>
      </aside>
    </>}
    {embedOpen && <div className="modal-backdrop" onMouseDown={() => setEmbedOpen(false)}><section className="import-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}><div className="modal-symbol"><Code2 size={20} /></div><h2>콘텐츠 임베드</h2><p>Markdown 또는 HTML을 원본 형식이 보존되는 코드 블록으로 추가합니다.</p><div className="segment"><button className={embedType === "markdown" ? "active" : ""} onClick={() => setEmbedType("markdown")}>Markdown</button><button className={embedType === "html" ? "active" : ""} onClick={() => setEmbedType("html")}>HTML</button></div><textarea value={embedValue} onChange={(e) => setEmbedValue(e.target.value)} spellCheck={false} /><label className="drop-file"><Code2 size={18} /><span><strong>.md 또는 .html 파일 선택</strong><small>파일 내용이 편집기에 삽입됩니다</small></span><input type="file" accept=".md,.markdown,.html,.htm" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { setEmbedValue(await file.text()); setEmbedType(file.name.match(/\.html?$/) ? "html" : "markdown"); } }} /></label><div className="modal-actions"><button onClick={() => setEmbedOpen(false)}>취소</button><button className="primary-action" onClick={embed}>문서에 추가</button></div></section></div>}
  </>;
}
