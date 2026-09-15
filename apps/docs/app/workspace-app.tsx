"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Bookmark, BookOpen, Check, ChevronDown, ChevronRight, ClipboardCheck, Compass, FileText, FolderKanban, Menu, NotebookPen, PanelLeftClose, Plus, Search, Share2, Star, Target, Trash2, Users, X } from "lucide-react";
import { CollabEditor } from "./collab-editor";

type User = { id: string; email: string; name?: string | null };
const documentIcons = { file: FileText, book: BookOpen, checklist: ClipboardCheck, target: Target, compass: Compass, bookmark: Bookmark, notes: NotebookPen, project: FolderKanban };
type DocumentIcon = keyof typeof documentIcons;
type Doc = { id: string; title: string; icon: DocumentIcon; group: string; updated: string };

const iconOptions: { id: DocumentIcon; label: string }[] = [
  { id: "file", label: "문서" }, { id: "book", label: "가이드" },
  { id: "checklist", label: "체크리스트" }, { id: "target", label: "목표" },
  { id: "compass", label: "방향" }, { id: "bookmark", label: "북마크" },
  { id: "notes", label: "노트" }, { id: "project", label: "프로젝트" },
];

function DocIcon({ name, size = 16 }: { name: DocumentIcon; size?: number }) {
  const Icon = documentIcons[name];
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />;
}

const initialDocs: Doc[] = [
  { id: "strategy-2027", title: "2027 제품 전략", icon: "target", group: "제품", updated: "방금" },
  { id: "spring-launch", title: "봄 출시 체크리스트", icon: "checklist", group: "제품", updated: "12분" },
  { id: "user-research", title: "사용자 리서치", icon: "compass", group: "제품", updated: "어제" },
  { id: "brand-voice", title: "브랜드 보이스", icon: "book", group: "디자인", updated: "2일" },
];

const people = [
  { name: "지민 김", handle: "jimin", color: "#f05b40" },
  { name: "민수 박", handle: "minsoo", color: "#6b63d9" },
  { name: "서연 이", handle: "seoyeon", color: "#328a73" },
];

export function WorkspaceApp({ user }: { user: User }) {
  const [docs, setDocs] = useState(initialDocs);
  const [activeId, setActiveId] = useState(initialDocs[0].id);
  const [saved, setSaved] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const active = useMemo(() => docs.find((doc) => doc.id === activeId) ?? docs[0], [activeId, docs]);
  const displayName = user.name || user.email.split("@")[0];
  const editorUser = useMemo(() => ({ name: displayName, handle: user.id, color: "#f05b40" }), [displayName, user.id]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool?: (tool: unknown, options?: unknown) => unknown } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = async () => {
      await context.registerTool?.({
        name: "create_document", title: "새 문서 만들기", description: "현재 Flora 워크스페이스에 새 문서를 만듭니다.",
        inputSchema: { type: "object", properties: { title: { type: "string" } }, required: ["title"], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: (input: unknown) => { const title = (input as { title?: string }).title?.trim(); if (!title) throw new Error("title is required"); const id = `doc-${Date.now()}`; setDocs((items) => [...items, { id, title, icon: "file", group: "개인 문서", updated: "방금" }]); setActiveId(id); return { id, title, workspace: "Flora" }; },
      }, { signal: lifecycle.signal });
    };
    void register().catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  const addDoc = () => {
    const id = `doc-${Date.now()}`;
    setDocs((items) => [...items, { id, title: "제목 없는 문서", icon: "file", group: "개인 문서", updated: "방금" }]);
    setActiveId(id);
    setMobileNavOpen(false);
    setToast("새 문서를 만들었어요");
  };

  const save = () => {
    setSaved(true);
    setDocs((items) => items.map((doc) => doc.id === activeId ? { ...doc, updated: "방금" } : doc));
    setToast("변경사항을 저장했어요");
  };

  const setDocumentIcon = (icon: DocumentIcon) => {
    setDocs((items) => items.map((doc) => doc.id === activeId ? { ...doc, icon, updated: "방금" } : doc));
    setIconPickerOpen(false);
    setSaved(false);
  };

  const deleteDoc = () => {
    if (docs.length === 1) return;
    const remaining = docs.filter((doc) => doc.id !== activeId);
    setDocs(remaining);
    setActiveId(remaining[0].id);
    setShowDelete(false);
    setToast("문서를 삭제했어요");
  };

  return <main className={`app-shell ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
    <header className="mobile-topbar">
      <button className="mobile-icon-button" onClick={() => setMobileNavOpen(true)} aria-label="문서 탐색 열기"><Menu size={21} /></button>
      <button className="mobile-brand" aria-label="Loom Docs 홈">L</button>
      <strong>{active.title}</strong>
      <button className="mobile-icon-button mobile-delete" onClick={() => setShowDelete(true)} aria-label="문서 삭제"><Trash2 size={19} /></button>
      <button className="mobile-save" onClick={save} disabled={saved}>{saved ? <><Check size={14} /> 저장됨</> : "저장"}</button>
    </header>
    <aside className="workspace-rail" aria-label="워크스페이스">
      <button className="brand-mark" aria-label="Loom Docs 홈">L</button>
      <button className="workspace-dot selected" aria-label="Flora 워크스페이스">F</button>
      <button className="workspace-dot" aria-label="개인 워크스페이스">Y</button>
      <button className="workspace-dot add" aria-label="워크스페이스 추가"><Plus size={17} /></button>
      <span className="rail-fill" />
      <Avatar name={displayName} size="md" tooltip={user.email} />
    </aside>

    <aside className={`doc-sidebar ${mobileNavOpen ? "mobile-open" : ""}`}>
      <div className="sidebar-head"><button className="team-switcher"><span>F</span><strong>Flora</strong><ChevronDown size={15} /></button><button className="icon-button desktop-sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="사이드바 닫기"><PanelLeftClose size={18} /></button><button className="icon-button mobile-sidebar-close" onClick={() => setMobileNavOpen(false)} aria-label="문서 탐색 닫기"><X size={20} /></button></div>
      <button className="search-row"><Search size={16} /><span>문서 검색</span><kbd>⌘ K</kbd></button>
      <nav className="side-nav"><button><BookOpen size={17} />최근 문서</button><button><Star size={17} />즐겨찾기</button><button><Users size={17} />팀 멤버 <span>8</span></button></nav>
      <div className="pages-title"><span>문서</span><button onClick={addDoc} aria-label="새 문서"><Plus size={16} /></button></div>
      <div className="page-tree">
        <p><ChevronDown size={14} />제품</p>
        {docs.filter((doc) => doc.group === "제품").map((doc) => <button className={activeId === doc.id ? "active" : ""} key={doc.id} onClick={() => { setActiveId(doc.id); setMobileNavOpen(false); setIconPickerOpen(false); }}><span><DocIcon name={doc.icon} size={15} /></span>{doc.title}</button>)}
        <p><ChevronRight size={14} />디자인</p><p><ChevronRight size={14} />운영</p>
        {docs.filter((doc) => doc.group === "개인 문서").map((doc) => <button className={activeId === doc.id ? "active" : ""} key={doc.id} onClick={() => { setActiveId(doc.id); setMobileNavOpen(false); setIconPickerOpen(false); }}><span><DocIcon name={doc.icon} size={15} /></span>{doc.title}</button>)}
      </div>
    </aside>

    <section className="document-area">
      <header className="topbar">
        {!sidebarOpen && <button className="icon-button" onClick={() => setSidebarOpen(true)} aria-label="사이드바 열기"><PanelLeftClose className="flip" size={18} /></button>}
        <div className="breadcrumbs"><span>Flora</span><ChevronRight size={13} /><span>제품</span><ChevronRight size={13} /><strong>{active.title}</strong></div>
        <div className="top-actions"><span className={`save-status ${saved ? "" : "dirty"}`}>{saved ? <><Check size={14} /> 모든 변경사항 저장됨</> : "저장하지 않은 변경사항"}</span><div className="facepile"><Avatar name="지민 김" size="sm" /><Avatar name="민수 박" size="sm" /><Avatar name="서연 이" size="sm" /></div><Button label="공유" variant="secondary" size="sm" icon={<Share2 size={15} />} onClick={() => setToast("공유 링크를 복사했어요")} /><Button label={saved ? "저장됨" : "저장"} variant={saved ? "secondary" : "primary"} size="sm" icon={saved ? <Check size={14} /> : undefined} onClick={save} /><button className="icon-button delete-trigger" title="문서 삭제" onClick={() => setShowDelete(true)} aria-label="문서 삭제"><Trash2 size={17} /></button></div>
      </header>
      <div className="editor-scroll"><article className="editor-page">
        <div className="doc-overline"><span className="doc-symbol"><DocIcon name={active.icon} size={20} /></span><div className="icon-picker-anchor"><button onClick={() => setIconPickerOpen((open) => !open)} aria-expanded={iconPickerOpen}>아이콘 변경</button>{iconPickerOpen && <div className="icon-picker" role="menu" aria-label="문서 아이콘 선택">{iconOptions.map((option) => <button key={option.id} role="menuitem" className={active.icon === option.id ? "selected" : ""} onClick={() => setDocumentIcon(option.id)}><DocIcon name={option.id} size={20} /><span>{option.label}</span>{active.icon === option.id && <Check size={14} />}</button>)}</div>}</div><span>·</span><span>{active.updated} 전 수정</span></div>
        <input className="title-input" aria-label="문서 제목" value={active.title} onChange={(event) => { const title = event.target.value; setDocs((items) => items.map((doc) => doc.id === activeId ? { ...doc, title } : doc)); setSaved(false); }} />
        <div className="doc-meta"><Badge label="제품" variant="blue" /><span>소유자 지민 김</span><span>읽는 시간 4분</span></div>
        <CollabEditor key={active.id} docId={active.id} user={editorUser} people={people} onDirty={() => setSaved(false)} />
      </article></div>
    </section>

    {mobileNavOpen && <button className="mobile-scrim" onClick={() => setMobileNavOpen(false)} aria-label="모바일 패널 닫기" />}
    {showDelete && <div className="modal-backdrop" onMouseDown={() => setShowDelete(false)}><section className="delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" onMouseDown={(event) => event.stopPropagation()}><h2 id="delete-title">“{active.title}” 문서를 삭제할까요?</h2><p>문서 목록에서 제거됩니다. 이 작업은 되돌릴 수 없습니다.</p><div><Button label="취소" variant="secondary" onClick={() => setShowDelete(false)} /><Button label="문서 삭제" variant="destructive" onClick={deleteDoc} /></div></section></div>}
    {toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}
  </main>;
}
