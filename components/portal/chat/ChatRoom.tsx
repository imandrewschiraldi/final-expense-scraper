"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  GripVertical,
  Hash,
  ImagePlus,
  Lock,
  Pin,
  PinOff,
  Plus,
  Send,
  SmilePlus,
  Trash2,
  X,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/cn";
import {
  CHAT_IMAGE_MAX_BYTES,
  CHAT_IMAGE_TYPES,
  CHAT_MESSAGE_MAX,
  CHAT_POLL_ACTIVE_MS,
  CHAT_POLL_HIDDEN_MS,
  CHAT_REACTIONS,
} from "@/lib/chat";

/** The "no category" bucket at the top of the rail — not a real category id. */
const LOOSE = "loose";

/**
 * The team room.
 *
 * Polls rather than sockets, and slows right down when the tab is hidden —
 * which matters, because the normal state of a team chat is "open on a second
 * monitor all day". A backgrounded tab at 30s costs an agency's database
 * almost nothing; the same tab at 3s, times thirty agents, does not.
 */

type Category = { id: string; name: string };

type Channel = {
  id: string;
  slug: string;
  name: string;
  topic: string | null;
  minRole: "ADMIN" | "MANAGER" | "AGENT";
  restricted: boolean;
  memberIds?: string[];
  categoryId: string | null;
  unread: boolean;
};

type Member = { id: string; name: string; role: "ADMIN" | "MANAGER" | "AGENT" };

// "SPECIFIC" is this app's own audience option, layered on top of the two
// role tiers the server already understands — it maps to restricted:true
// with an explicit member list instead of a minRole.
type Audience = "AGENT" | "MANAGER" | "SPECIFIC";

type ModalState =
  | { kind: "category" }
  | { kind: "channel"; categoryId: string | null }
  | { kind: "renameChannel"; channel: Channel }
  | { kind: "archiveChannel"; channel: Channel }
  | { kind: "deleteMessage"; id: string }
  | null;

type Reaction = { emoji: string; count: number; mine: boolean };

type Message = {
  id: string;
  authorId: string | null;
  authorName: string;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  editedAt: string | null;
  pinnedAt: string | null;
  reactions: Reaction[];
};

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

// A response without a JSON {error} body (a raw 500/404 page, a network
// hiccup) previously collapsed into one indistinguishable generic string.
// Falling back to the status code instead means the next failure is
// diagnosable from the UI alone, not just from server logs.
async function errorFrom(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return data.error ?? `${fallback} (HTTP ${res.status})`;
}

/** A container's drop target — the raw area a channel can land on, including
 *  the empty space below an existing list (or the whole area when there are
 *  no channels in it yet, since an empty SortableContext has no item to be
 *  "over"). */
function DroppableContainer({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  );
}

function SortableChannel({
  channel,
  active,
  canManage,
  onSelect,
  onRename,
  onArchive,
}: {
  channel: Channel;
  active: boolean;
  canManage: boolean;
  onSelect: () => void;
  onRename: () => void;
  onArchive: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `chan:${channel.id}`,
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="group/chan relative">
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "font-condensed flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-bold tracking-[0.04em] uppercase transition-colors",
          active ? "bg-copper text-black" : "text-muted hover:bg-surface2 hover:text-foreground",
        )}
      >
        {canManage && (
          // Always visible (not hover-only) — a drag handle only agents can
          // find on hover is useless on a touchscreen, which has no hover.
          <span
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Reorder ${channel.name}`}
            className={cn(
              "shrink-0 cursor-grab touch-none active:cursor-grabbing",
              active ? "text-black/50" : "text-muted/60",
            )}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </span>
        )}
        {channel.restricted || channel.minRole !== "AGENT" ? (
          <Lock className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <Hash className="h-3.5 w-3.5 shrink-0" />
        )}
        <span className="truncate">{channel.name}</span>
        {channel.unread && !active && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-copper" />}
      </button>
      {canManage && (
        <div className="absolute top-1/2 right-2 hidden -translate-y-1/2 gap-1 group-hover/chan:flex">
          <button
            type="button"
            onClick={onRename}
            aria-label={`Rename ${channel.name}`}
            className={cn("text-xs", active ? "text-black/70" : "text-muted hover:text-foreground")}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onArchive}
            aria-label={`Remove ${channel.name}`}
            className={cn(active ? "text-black/70" : "text-muted hover:text-red-light")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function SortableCategoryGroup({
  category,
  canManage,
  onAddChannel,
  children,
}: {
  category: Category;
  canManage: boolean;
  onAddChannel: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `cat:${category.id}`,
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="mt-4">
      <div className="mb-1 flex items-center gap-1 px-1">
        {canManage && (
          <span
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${category.name}`}
            className="shrink-0 cursor-grab touch-none text-muted/60 active:cursor-grabbing"
          >
            <GripVertical className="h-3 w-3" />
          </span>
        )}
        <ChevronDown className="h-3 w-3 text-muted" />
        <p className="font-condensed flex-1 text-[10px] font-extrabold tracking-[0.18em] text-muted uppercase">
          {category.name}
        </p>
        {canManage && (
          <button
            type="button"
            onClick={onAddChannel}
            aria-label={`New channel in ${category.name}`}
            className="text-muted hover:text-copper"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

export function ChatRoom({ me, canManage }: { me: string; canManage: boolean }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pins, setPins] = useState<Message[]>([]);
  const [showPins, setShowPins] = useState(false);
  const [picker, setPicker] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);

  // Admin actions below use an in-app modal rather than window.prompt/confirm:
  // this app is used as an installed PWA, and native dialogs are unreliable
  // (often silent no-ops) in a standalone display, not just a plain browser tab.
  const [modal, setModal] = useState<ModalState>(null);
  const [modalInput, setModalInput] = useState("");
  const [modalAudience, setModalAudience] = useState<Audience>("AGENT");
  const [modalMemberIds, setModalMemberIds] = useState<string[]>([]);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalBusy, setModalBusy] = useState(false);
  const [members, setMembers] = useState<Member[] | null>(null);

  // Drag-and-drop reordering, admin-only. `containers` maps a container key
  // (LOOSE, or a category id) to its channel ids in display order, and
  // `categoryOrder` is the categories themselves in display order — both are
  // real state (not derived) so a drag can move ids between them live. The
  // sync effects below keep them following the server's data whenever a
  // drag isn't actually in progress; `dragging` guards against a poll
  // landing mid-drag and clobbering the gesture the admin is mid-way through.
  const [containers, setContainers] = useState<Record<string, string[]>>({ [LOOSE]: [] });
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const dragging = useRef(false);

  useEffect(() => {
    if (dragging.current) return;
    const next: Record<string, string[]> = { [LOOSE]: [] };
    for (const cat of categories) next[cat.id] = [];
    for (const ch of channels) {
      const key = ch.categoryId && next[ch.categoryId] ? ch.categoryId : LOOSE;
      next[key].push(ch.id);
    }
    setContainers(next);
  }, [channels, categories]);

  useEffect(() => {
    if (dragging.current) return;
    setCategoryOrder(categories.map((c) => c.id));
  }, [categories]);

  const channelById = useMemo(() => new Map(channels.map((c) => [c.id, c])), [channels]);

  const sensors = useSensors(
    // A small activation distance so a plain click/tap still selects a
    // channel instead of every tap being interpreted as a drag start.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  function containerOf(channelId: string): string | null {
    for (const [key, ids] of Object.entries(containers)) {
      if (ids.includes(channelId)) return key;
    }
    return null;
  }

  function handleDragStart() {
    dragging.current = true;
  }

  // Live-previews a channel moving into a different category while it's
  // still being dragged, so the rail visibly reshapes before the drop —
  // the standard multi-container drag-and-drop pattern.
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (!activeId.startsWith("chan:")) return;

    const activeChannelId = activeId.slice(5);
    const fromContainer = containerOf(activeChannelId);
    const toContainer = overId.startsWith("chan:") ? containerOf(overId.slice(5)) : overId;
    if (!fromContainer || !toContainer || fromContainer === toContainer) return;

    setContainers((prev) => {
      const from = prev[fromContainer].filter((id) => id !== activeChannelId);
      const overIndex = overId.startsWith("chan:") ? prev[toContainer].indexOf(overId.slice(5)) : prev[toContainer].length;
      const to = [...prev[toContainer]];
      to.splice(overIndex === -1 ? to.length : overIndex, 0, activeChannelId);
      return { ...prev, [fromContainer]: from, [toContainer]: to };
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    dragging.current = false;
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith("cat:")) {
      const from = categoryOrder.indexOf(activeId.slice(4));
      const to = overId.startsWith("cat:") ? categoryOrder.indexOf(overId.slice(4)) : -1;
      if (from === -1 || to === -1 || from === to) return;
      const next = [...categoryOrder];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      setCategoryOrder(next);
      await fetch("/api/portal/chat/categories/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryIds: next }),
      });
      return;
    }

    if (!activeId.startsWith("chan:")) return;
    const activeChannelId = activeId.slice(5);
    const container = containerOf(activeChannelId);
    if (!container) return;

    // Same-container reorder: dragOver already handled any cross-container
    // move, so this just repositions within the (possibly already-updated)
    // container's own id list.
    let finalContainers = containers;
    if (overId.startsWith("chan:")) {
      const overChannelId = overId.slice(5);
      const ids = containers[container];
      const from = ids.indexOf(activeChannelId);
      const to = ids.indexOf(overChannelId);
      if (from !== -1 && to !== -1 && from !== to) {
        const next = [...ids];
        next.splice(from, 1);
        next.splice(to, 0, activeChannelId);
        finalContainers = { ...containers, [container]: next };
        setContainers(finalContainers);
      }
    }

    const payload = Object.entries(finalContainers).flatMap(([key, ids]) =>
      ids.map((id, order) => ({ id, categoryId: key === LOOSE ? null : key, order })),
    );
    await fetch("/api/portal/chat/channels/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channels: payload }),
    });
  }

  const scroller = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const cursor = useRef<string | null>(null);

  const loadRail = useCallback(async () => {
    const res = await fetch("/api/portal/chat/channels");
    if (!res.ok) return;
    const data = (await res.json()) as { categories: Category[]; channels: Channel[] };
    setCategories(data.categories);
    setChannels(data.channels);
    setActiveId((current) => current ?? data.channels[0]?.id ?? null);
  }, []);

  const loadPins = useCallback(async (channelId: string) => {
    const res = await fetch(`/api/portal/chat/messages?pinned=1&channelId=${channelId}`);
    if (res.ok) setPins(((await res.json()) as { messages: Message[] }).messages);
  }, []);

  const loadMessages = useCallback(async (channelId: string, incremental: boolean) => {
    const url = new URL("/api/portal/chat/messages", window.location.origin);
    url.searchParams.set("channelId", channelId);
    if (incremental && cursor.current) url.searchParams.set("after", cursor.current);

    const res = await fetch(url);
    if (!res.ok) return;
    const data = (await res.json()) as { messages: Message[]; touched?: Message[] };

    setMessages((prev) => {
      if (!incremental) return data.messages;
      // Reactions and pins do not move createdAt, so `touched` re-states the
      // visible window; new arrivals are appended after it.
      const patched = data.touched?.length
        ? prev.map((m) => data.touched!.find((t) => t.id === m.id) ?? m)
        : prev;
      if (data.messages.length === 0) return patched;
      const seen = new Set(patched.map((m) => m.id));
      return [...patched, ...data.messages.filter((m) => !seen.has(m.id))];
    });

    if (data.messages.length > 0) cursor.current = data.messages.at(-1)!.createdAt;
    else if (!incremental) cursor.current = data.messages.at(-1)?.createdAt ?? cursor.current;
  }, []);

  useEffect(() => {
    loadRail();
  }, [loadRail]);

  useEffect(() => {
    if (!activeId) return;
    cursor.current = null;
    setMessages([]);
    setShowPins(false);
    atBottom.current = true;
    loadMessages(activeId, false);
    loadPins(activeId);
    setChannels((prev) => prev.map((c) => (c.id === activeId ? { ...c, unread: false } : c)));
  }, [activeId, loadMessages, loadPins]);

  useEffect(() => {
    if (!activeId) return;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const wait = document.visibilityState === "visible" ? CHAT_POLL_ACTIVE_MS : CHAT_POLL_HIDDEN_MS;
      timer = setTimeout(async () => {
        await loadMessages(activeId, true);
        await loadRail();
        tick();
      }, wait);
    };

    // A tab coming back into focus catches up at once, not on the next beat.
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      clearTimeout(timer);
      loadMessages(activeId, true);
      loadRail();
      tick();
    };

    tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [activeId, loadMessages, loadRail]);

  // Follow new messages only if you were already at the bottom — yanking the
  // view while somebody reads back is the classic chat annoyance.
  useEffect(() => {
    if (atBottom.current) scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages]);

  function pickImage(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!CHAT_IMAGE_TYPES.includes(file.type as (typeof CHAT_IMAGE_TYPES)[number])) {
      setError("Only PNG, JPEG, GIF, or WebP images are allowed.");
      return;
    }
    if (file.size > CHAT_IMAGE_MAX_BYTES) {
      setError("That image is too large (8MB max).");
      return;
    }
    setPendingImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return { file, previewUrl: URL.createObjectURL(file) };
    });
  }

  function clearPendingImage() {
    setPendingImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }

  async function send() {
    const body = draft.trim();
    if ((!body && !pendingImage) || !activeId || sending) return;
    setSending(true);
    setError(null);
    const image = pendingImage;
    setDraft("");
    // Cleared without revoking yet — a failed send below restores this same
    // object (and its still-valid preview URL) rather than re-picking.
    setPendingImage(null);
    atBottom.current = true;

    let imageUrl: string | undefined;
    if (image) {
      const form = new FormData();
      form.append("file", image.file);
      const uploadRes = await fetch("/api/portal/chat/upload", { method: "POST", body: form });
      if (!uploadRes.ok) {
        setDraft(body);
        setPendingImage(image);
        setError(await errorFrom(uploadRes, "That image didn't upload."));
        setSending(false);
        return;
      }
      imageUrl = ((await uploadRes.json()) as { url: string }).url;
    }

    const res = await fetch("/api/portal/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: activeId, body, imageUrl }),
    });

    if (res.ok) {
      if (image) URL.revokeObjectURL(image.previewUrl);
      const { message } = (await res.json()) as { message: Message };
      cursor.current = message.createdAt;
      setMessages((prev) => [...prev, message]);
    } else {
      setDraft(body);
      setPendingImage(image);
      setError(await errorFrom(res, "That didn't send."));
    }
    setSending(false);
  }

  async function react(messageId: string, emoji: string) {
    setPicker(null);
    // Optimistic: a reaction should feel instant, and the next poll corrects
    // it if the write lost a race.
    const apply = (list: Message[]) =>
      list.map((m) => {
        if (m.id !== messageId) return m;
        const existing = m.reactions.find((r) => r.emoji === emoji);
        if (!existing) return { ...m, reactions: [...m.reactions, { emoji, count: 1, mine: true }] };
        const count = existing.count + (existing.mine ? -1 : 1);
        const reactions =
          count === 0
            ? m.reactions.filter((r) => r.emoji !== emoji)
            : m.reactions.map((r) => (r.emoji === emoji ? { ...r, count, mine: !r.mine } : r));
        return { ...m, reactions };
      });

    setMessages(apply);
    setPins(apply);
    await fetch("/api/portal/chat/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, emoji }),
    });
  }

  async function togglePin(message: Message) {
    const pinned = Boolean(message.pinnedAt);
    await fetch(`/api/portal/chat/messages/${message.id}/pin`, {
      method: pinned ? "DELETE" : "POST",
    });
    setMessages((prev) =>
      prev.map((m) => (m.id === message.id ? { ...m, pinnedAt: pinned ? null : new Date().toISOString() } : m)),
    );
    if (activeId) loadPins(activeId);
  }

  function closeModal() {
    setModal(null);
    setModalInput("");
    setModalAudience("AGENT");
    setModalMemberIds([]);
    setModalError(null);
    setModalBusy(false);
  }

  // The member picker is admin-only and rarely needed, so it's fetched lazily
  // the first time a channel/audience modal opens rather than on every mount.
  async function ensureMembersLoaded() {
    if (members !== null) return;
    const res = await fetch("/api/portal/chat/members");
    if (res.ok) setMembers(((await res.json()) as { users: Member[] }).users);
    else setMembers([]);
  }

  function openDeleteMessageModal(id: string) {
    setModal({ kind: "deleteMessage", id });
    setModalError(null);
  }

  function openCategoryModal() {
    setModal({ kind: "category" });
    setModalInput("");
    setModalError(null);
  }

  function openChannelModal(categoryId: string | null) {
    setModal({ kind: "channel", categoryId });
    setModalInput("");
    setModalAudience("AGENT");
    setModalMemberIds([]);
    setModalError(null);
    ensureMembersLoaded();
  }

  function openRenameModal(channel: Channel) {
    setModal({ kind: "renameChannel", channel });
    setModalInput(channel.name);
    setModalAudience(channel.restricted ? "SPECIFIC" : channel.minRole === "MANAGER" ? "MANAGER" : "AGENT");
    setModalMemberIds(channel.memberIds ?? []);
    setModalError(null);
    ensureMembersLoaded();
  }

  function openArchiveModal(channel: Channel) {
    setModal({ kind: "archiveChannel", channel });
    setModalError(null);
  }

  async function submitModal() {
    if (!modal) return;
    setModalBusy(true);
    setModalError(null);

    if (modal.kind === "deleteMessage") {
      const res = await fetch(`/api/portal/chat/messages?id=${modal.id}`, { method: "DELETE" });
      if (!res.ok) {
        setModalError(await errorFrom(res, "Could not delete that message."));
        setModalBusy(false);
        return;
      }
      setMessages((prev) => prev.filter((m) => m.id !== modal.id));
      setPins((prev) => prev.filter((m) => m.id !== modal.id));
      closeModal();
      return;
    }

    if (modal.kind === "category") {
      const name = modalInput.trim();
      if (!name) {
        setModalBusy(false);
        return;
      }
      const res = await fetch("/api/portal/chat/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        setModalError(await errorFrom(res, "Could not create that category."));
        setModalBusy(false);
        return;
      }
      await loadRail();
      closeModal();
      return;
    }

    if (modal.kind === "channel") {
      const name = modalInput.trim();
      if (!name) {
        setModalBusy(false);
        return;
      }
      if (modalAudience === "SPECIFIC" && modalMemberIds.length === 0) {
        setModalError("Select at least one person.");
        setModalBusy(false);
        return;
      }
      const res = await fetch("/api/portal/chat/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          categoryId: modal.categoryId,
          ...(modalAudience === "SPECIFIC"
            ? { restricted: true, memberIds: modalMemberIds }
            : { restricted: false, minRole: modalAudience }),
        }),
      });
      if (!res.ok) {
        setModalError(await errorFrom(res, "Could not create that channel."));
        setModalBusy(false);
        return;
      }
      const { channel } = (await res.json()) as { channel: Channel };
      await loadRail();
      setActiveId(channel.id);
      closeModal();
      return;
    }

    if (modal.kind === "renameChannel") {
      const name = modalInput.trim();
      if (!name) {
        setModalBusy(false);
        return;
      }
      if (modalAudience === "SPECIFIC" && modalMemberIds.length === 0) {
        setModalError("Select at least one person.");
        setModalBusy(false);
        return;
      }
      const res = await fetch(`/api/portal/chat/channels/${modal.channel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          ...(modalAudience === "SPECIFIC"
            ? { restricted: true, memberIds: modalMemberIds }
            : { restricted: false, minRole: modalAudience }),
        }),
      });
      if (!res.ok) {
        setModalError(await errorFrom(res, "Could not save that channel."));
        setModalBusy(false);
        return;
      }
      await loadRail();
      closeModal();
      return;
    }

    if (modal.kind === "archiveChannel") {
      const res = await fetch(`/api/portal/chat/channels/${modal.channel.id}`, { method: "DELETE" });
      if (!res.ok) {
        setModalError(await errorFrom(res, "Could not remove that channel."));
        setModalBusy(false);
        return;
      }
      setActiveId(null);
      await loadRail();
      closeModal();
    }
  }

  const active = channels.find((c) => c.id === activeId) ?? null;

  function messageRow(message: Message, prev: Message | undefined, inPinList: boolean) {
    const newDay = !inPinList && (!prev || dayLabel(prev.createdAt) !== dayLabel(message.createdAt));
    // Consecutive messages from one person in a short window read as one turn,
    // so only the first carries a name and a timestamp.
    const isGrouped =
      !inPinList &&
      !newDay &&
      prev?.authorName === message.authorName &&
      new Date(message.createdAt).getTime() - new Date(prev.createdAt).getTime() < 300_000;

    return (
      <div key={message.id}>
        {newDay && (
          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="font-condensed text-[11px] font-bold tracking-[0.16em] text-muted uppercase">
              {dayLabel(message.createdAt)}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
        )}
        <div className={cn("group relative", isGrouped ? "mt-0.5" : "mt-3")}>
          {!isGrouped && (
            <div className="flex items-baseline gap-2">
              <span className="font-condensed text-sm font-extrabold tracking-wide text-copper uppercase">
                {message.authorName}
              </span>
              <span className="text-xs text-muted">{timeLabel(message.createdAt)}</span>
              {message.pinnedAt && !inPinList && <Pin className="h-3 w-3 text-copper" />}
            </div>
          )}

          {message.body && (
            <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground">
              {message.body}
            </p>
          )}

          {message.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={message.imageUrl}
              alt=""
              onClick={() => setLightbox(message.imageUrl)}
              className="mt-1.5 max-h-72 max-w-full cursor-zoom-in rounded-lg border border-border object-contain"
            />
          )}

          {message.reactions.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {message.reactions.map((r) => (
                <button
                  key={r.emoji}
                  type="button"
                  onClick={() => react(message.id, r.emoji)}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
                    r.mine
                      ? "border-copper bg-copper/15 text-foreground"
                      : "border-border bg-surface2 text-muted hover:border-copper",
                  )}
                >
                  <span className="text-[13px] leading-none">{r.emoji}</span>
                  <span className="tabular-nums">{r.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Hover actions, pinned to the right of the row. */}
          <div className="absolute -top-2 right-0 hidden items-center gap-1 rounded-md border border-border bg-surface2 px-1.5 py-1 group-hover:flex">
            <button
              type="button"
              onClick={() => setPicker(picker === message.id ? null : message.id)}
              aria-label="Add reaction"
              className="text-muted hover:text-copper"
            >
              <SmilePlus className="h-3.5 w-3.5" />
            </button>
            {canManage && (
              <button
                type="button"
                onClick={() => togglePin(message)}
                aria-label={message.pinnedAt ? "Unpin" : "Pin"}
                className={cn("hover:text-copper", message.pinnedAt ? "text-copper" : "text-muted")}
              >
                {message.pinnedAt ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              </button>
            )}
            {(message.authorId === me || canManage) && (
              <button
                type="button"
                onClick={() => openDeleteMessageModal(message.id)}
                aria-label="Delete message"
                className="text-muted hover:text-red-light"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {picker === message.id && (
            <div className="absolute -top-9 right-0 z-10 flex gap-1 rounded-lg border border-border bg-surface2 px-2 py-1.5 shadow-lg">
              {CHAT_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => react(message.id, emoji)}
                  className="text-lg leading-none transition-transform hover:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[236px_minmax(0,1fr)]">
      {/* Rail ---------------------------------------------------------- */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <aside className="rounded-[10px] border-2 border-copper/50 bg-surface p-3 shadow-[0_0_60px_8px_color-mix(in_srgb,var(--copper)_20%,transparent)]">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="font-condensed text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
              Channels
            </p>
            {canManage && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openCategoryModal}
                  className="font-condensed text-[10px] font-bold tracking-[0.1em] text-muted uppercase hover:text-copper"
                >
                  + Category
                </button>
                <button
                  type="button"
                  onClick={() => openChannelModal(null)}
                  aria-label="New channel"
                  className="text-muted hover:text-copper"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <DroppableContainer id={LOOSE} className="min-h-[8px] space-y-1">
            <SortableContext items={containers[LOOSE].map((id) => `chan:${id}`)} strategy={verticalListSortingStrategy}>
              {containers[LOOSE].map((id) => {
                const channel = channelById.get(id);
                if (!channel) return null;
                return (
                  <SortableChannel
                    key={id}
                    channel={channel}
                    active={channel.id === activeId}
                    canManage={canManage}
                    onSelect={() => setActiveId(channel.id)}
                    onRename={() => openRenameModal(channel)}
                    onArchive={() => openArchiveModal(channel)}
                  />
                );
              })}
            </SortableContext>
          </DroppableContainer>

          <SortableContext items={categoryOrder.map((id) => `cat:${id}`)} strategy={verticalListSortingStrategy}>
            {categoryOrder.map((catId) => {
              const category = categories.find((c) => c.id === catId);
              if (!category) return null;
              const ids = containers[catId] ?? [];
              return (
                <SortableCategoryGroup
                  key={catId}
                  category={category}
                  canManage={canManage}
                  onAddChannel={() => openChannelModal(catId)}
                >
                  <DroppableContainer id={catId} className="min-h-[8px] space-y-1">
                    <SortableContext items={ids.map((id) => `chan:${id}`)} strategy={verticalListSortingStrategy}>
                      {ids.map((id) => {
                        const channel = channelById.get(id);
                        if (!channel) return null;
                        return (
                          <SortableChannel
                            key={id}
                            channel={channel}
                            active={channel.id === activeId}
                            canManage={canManage}
                            onSelect={() => setActiveId(channel.id)}
                            onRename={() => openRenameModal(channel)}
                            onArchive={() => openArchiveModal(channel)}
                          />
                        );
                      })}
                    </SortableContext>
                  </DroppableContainer>
                </SortableCategoryGroup>
              );
            })}
          </SortableContext>

          {channels.length === 0 && <p className="px-1 py-2 text-sm text-muted">No channels yet.</p>}
        </aside>
      </DndContext>

      {/* Room ---------------------------------------------------------- */}
      <section className="flex h-[calc(100vh-260px)] min-h-[420px] flex-col rounded-[10px] border-2 border-copper/50 bg-surface shadow-[0_0_60px_8px_color-mix(in_srgb,var(--copper)_20%,transparent)]">
        {active && (
          <header className="shrink-0 border-b-2 border-copper/25 px-5 py-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-condensed text-lg font-extrabold tracking-wide text-white uppercase">
                  {active.restricted || active.minRole !== "AGENT" ? "🔒 " : "#"}
                  {active.name}
                </h2>
                {active.topic && <p className="mt-0.5 text-sm text-muted">{active.topic}</p>}
                {active.restricted ? (
                  <p className="mt-0.5 text-xs text-muted">
                    {active.memberIds
                      ? `Visible to ${active.memberIds.length} selected ${active.memberIds.length === 1 ? "person" : "people"} only.`
                      : "Visible to specific people only."}
                  </p>
                ) : (
                  active.minRole !== "AGENT" && (
                    <p className="mt-0.5 text-xs text-muted">
                      Visible to {active.minRole === "MANAGER" ? "managers and admins" : "admins"} only.
                    </p>
                  )
                )}
              </div>
              {pins.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPins((v) => !v)}
                  className={cn(
                    "font-condensed flex shrink-0 items-center gap-1.5 rounded-md border-[1.5px] px-3 py-1.5 text-xs font-bold tracking-[0.08em] uppercase transition-colors",
                    showPins ? "border-copper bg-copper text-black" : "border-copper text-copper hover:bg-copper hover:text-black",
                  )}
                >
                  <Pin className="h-3 w-3" />
                  {pins.length} pinned
                </button>
              )}
            </div>
          </header>
        )}

        {showPins && (
          <div className="max-h-56 shrink-0 overflow-y-auto border-b border-border bg-surface2/60 px-5 py-3">
            <p className="font-condensed mb-2 text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
              Pinned
            </p>
            {pins.map((m) => messageRow(m, undefined, true))}
          </div>
        )}

        <div
          ref={scroller}
          onScroll={(e) => {
            const el = e.currentTarget;
            atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          }}
          className="flex-1 space-y-1 overflow-y-auto px-5 py-4"
        >
          {messages.length === 0 && (
            <p className="text-sm text-muted">
              Nothing here yet. Say something and it shows up for the whole team.
            </p>
          )}
          {messages.map((m, i) => messageRow(m, messages[i - 1], false))}
        </div>

        <div className="shrink-0 border-t-2 border-copper/25 p-3">
          {error && <p className="mb-2 px-1 text-sm text-red-light">{error}</p>}
          {pendingImage && (
            <div className="relative mb-2 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pendingImage.previewUrl}
                alt=""
                className="max-h-28 rounded-lg border border-border object-contain"
              />
              <button
                type="button"
                onClick={clearPendingImage}
                aria-label="Remove image"
                className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-black text-white hover:bg-red-light"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={imageInput}
              type="file"
              accept={CHAT_IMAGE_TYPES.join(",")}
              onChange={(e) => {
                pickImage(e.target.files?.[0]);
                e.target.value = "";
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => imageInput.current?.click()}
              disabled={!active}
              aria-label="Attach image"
              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-copper hover:text-copper disabled:opacity-40"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, CHAT_MESSAGE_MAX))}
              onKeyDown={(e) => {
                // Enter sends, Shift+Enter is a new line — the same as every
                // chat anyone on the team has already used.
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder={active ? `Message ${active.name}` : "Pick a channel"}
              disabled={!active}
              className="max-h-40 min-h-[42px] flex-1 resize-y rounded-lg border border-border bg-surface2 px-3 py-2.5 text-[15px] text-foreground placeholder:text-muted focus:border-copper focus:outline-none"
            />
            <button
              type="button"
              onClick={send}
              disabled={(!draft.trim() && !pendingImage) || sending || !active}
              aria-label="Send"
              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg border-[1.5px] border-copper text-copper transition-colors hover:bg-copper hover:text-black disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-copper"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Close"
            className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-sm rounded-[10px] border border-border bg-surface p-5"
            onClick={(e) => e.stopPropagation()}
          >
            {modal.kind === "category" && (
              <>
                <h3 className="font-condensed mb-3 text-sm font-extrabold tracking-[0.1em] text-white uppercase">
                  New category
                </h3>
                <input
                  autoFocus
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitModal()}
                  placeholder="Category name"
                  className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-copper focus:outline-none"
                />
              </>
            )}

            {(modal.kind === "channel" || modal.kind === "renameChannel") && (
              <>
                <h3 className="font-condensed mb-3 text-sm font-extrabold tracking-[0.1em] text-white uppercase">
                  {modal.kind === "channel" ? "New channel" : "Edit channel"}
                </h3>
                <input
                  autoFocus
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  placeholder="Channel name"
                  className="mb-3 w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-copper focus:outline-none"
                />

                <p className="font-condensed mb-1.5 text-[10px] font-bold tracking-[0.14em] text-muted uppercase">
                  Who can see this channel
                </p>
                <div className="mb-3 flex flex-col gap-1.5 text-sm text-muted">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="modalAudience"
                      checked={modalAudience === "AGENT"}
                      onChange={() => setModalAudience("AGENT")}
                    />
                    Everyone
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="modalAudience"
                      checked={modalAudience === "MANAGER"}
                      onChange={() => setModalAudience("MANAGER")}
                    />
                    Managers &amp; admins only
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="modalAudience"
                      checked={modalAudience === "SPECIFIC"}
                      onChange={() => setModalAudience("SPECIFIC")}
                    />
                    Specific people
                  </label>
                </div>

                {modalAudience === "SPECIFIC" && (
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-surface2 p-2">
                    {members === null && <p className="px-1 py-1 text-sm text-muted">Loading people…</p>}
                    {members?.length === 0 && <p className="px-1 py-1 text-sm text-muted">No one to pick from.</p>}
                    {members?.map((person) => (
                      <label
                        key={person.id}
                        className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-sm text-foreground hover:bg-surface"
                      >
                        <input
                          type="checkbox"
                          checked={modalMemberIds.includes(person.id)}
                          onChange={() =>
                            setModalMemberIds((prev) =>
                              prev.includes(person.id) ? prev.filter((id) => id !== person.id) : [...prev, person.id],
                            )
                          }
                        />
                        <span className="truncate">{person.name}</span>
                        <span className="ml-auto text-xs text-muted">{person.role}</span>
                      </label>
                    ))}
                  </div>
                )}
              </>
            )}

            {modal.kind === "archiveChannel" && (
              <p className="text-sm text-foreground">
                Remove <span className="font-bold text-copper">#{modal.channel.name}</span> from the rail? Its
                messages are kept.
              </p>
            )}

            {modal.kind === "deleteMessage" && (
              <p className="text-sm text-foreground">Delete this message for everyone?</p>
            )}

            {modalError && <p className="mt-2 text-sm text-red-light">{modalError}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="font-condensed rounded-md px-3 py-1.5 text-xs font-bold tracking-[0.08em] text-muted uppercase hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitModal}
                disabled={
                  modalBusy ||
                  (["category", "channel", "renameChannel"].includes(modal.kind) && !modalInput.trim()) ||
                  ((modal.kind === "channel" || modal.kind === "renameChannel") &&
                    modalAudience === "SPECIFIC" &&
                    modalMemberIds.length === 0)
                }
                className="font-condensed rounded-md border-[1.5px] border-copper px-3 py-1.5 text-xs font-bold tracking-[0.08em] text-copper uppercase transition-colors hover:bg-copper hover:text-black disabled:opacity-40"
              >
                {modal.kind === "archiveChannel" || modal.kind === "deleteMessage" ? "Delete" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
