"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  Disc3,
  Download,
  Flame,
  History,
  ImageIcon,
  Mail,
  Music,
  Radio,
  Send,
  ShieldAlert,
  Video,
} from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { PageHeader } from "@/components/page-header";
import { PdlActionModal } from "@/components/pdl-action-modal";
import { PdlHistoryModal } from "@/components/pdl-history-modal";
import { Badge, Dot } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { FormMessage } from "@/components/ui/form";
import { api } from "@/lib/api";
import { formatDate, formatINR, formatNumber } from "@/lib/format";
import type { PDLActionType, PDLEmailLog } from "@/lib/types";
import { cn } from "@/lib/utils";

type Track = {
  id: string;
  trackNumber: number;
  title: string;
  version: string | null;
  isrc: string | null;
  dolbyIsrc: string | null;
  durationSeconds: number | null;
  explicit: boolean;
  isInstrumental: boolean;
  parentalAdvisory: string | null;
  primaryArtist: string;
  featuring: string[];
  songwriters: string[];
  producers: string[];
  remixer: string | null;
  composer: string | null;
  composerIprsMember: string | null;
  composerIpi: string | null;
  lyricist: string | null;
  lyricistIprsMember: string | null;
  lyricistIpi: string | null;
  musicDirector: string | null;
  musicProducer: string | null;
  filmDirector: string | null;
  filmProducer: string | null;
  filmStarCast: string | null;
  language: string;
  lyrics: string | null;
  audioUrl: string | null;
  audioFilename: string | null;
  audioSizeBytes: number | null;
  audioFormat: string | null;
  spotifyMainArtistId: string | null;
  spotifyFeaturedArtistId: string | null;
  appleMainArtistId: string | null;
  appleRemixerId: string | null;
  appleComposerId: string | null;
  appleLyricistId: string | null;
  appleFilmProducerId: string | null;
  appleFilmDirectorId: string | null;
  appleStarcastId: string | null;
  facebookUrl: string | null;
  instagramHandle: string | null;
  crbtCutName: string | null;
  crbtCutTime: string | null;
};

type SongDetail = {
  id: string;
  title: string;
  albumTitle: string | null;
  primaryArtist: string;
  albumMainArtist: string | null;
  type: string;
  albumType: string | null;
  catalogVersion: string | null;
  genre: string;
  subGenre: string | null;
  mood: string | null;
  description: string | null;
  language: string;
  label: string | null;
  labelIprsMember: string | null;
  labelIpi: string | null;
  pLine: string | null;
  cLine: string | null;
  upc: string | null;
  artworkUrl: string | null;
  lineArtUrl: string | null;
  releaseDate: string | null;
  originalReleaseDate: string | null;
  goLiveDate: string | null;
  goLiveTimeUtc: string | null;
  payToRights: string;
  copyrightYear: number;
  copyrightHolder: string;
  explicit: boolean;
  parentalAdvisory: string | null;
  status: string;
  distributionTier: string;
  composer: string | null;
  lyricist: string | null;
  producer: string | null;
  featuring: string[];
  reviewNotes: string | null;
  totalStreams: number;
  earningsPaise: number;
  userId: string;
  userName?: string;
  userEmail?: string;
  accountType?: string;
  tracks: Track[];
  stores: { name: string; status: string }[];
  createdAt: string;
  updatedAt: string;
};

type DspField = {
  label: string;
  value: string;
  /** Highlight when empty — needed for most DSP sheets */
  required?: boolean;
  mono?: boolean;
};

type DspSection = {
  id: string;
  title: string;
  hint?: string;
  fields: DspField[];
};

function display(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return String(value);
}

function joinList(items?: string[] | null) {
  if (!items?.length) return "";
  return items.filter(Boolean).join(", ");
}

/** Prefer YYYY-MM-DD for DSP paste; fall back to raw string. */
function isoDate(value: string | null | undefined): string {
  if (!value) return "";
  const raw = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toISOString().slice(0, 10);
}

async function writeClipboard(text: string) {
  const value = text.trim();
  if (!value) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function CopyButton({
  text,
  label = "Copy",
  size = "sm",
}: {
  text: string;
  label?: string;
  size?: "sm" | "icon";
}) {
  const [done, setDone] = useState(false);
  const empty = !text.trim();

  async function onCopy(e?: React.MouseEvent) {
    e?.stopPropagation();
    if (empty) return;
    const ok = await writeClipboard(text);
    if (!ok) return;
    setDone(true);
    window.setTimeout(() => setDone(false), 1400);
  }

  if (size === "icon") {
    return (
      <button
        type="button"
        disabled={empty}
        onClick={(e) => void onCopy(e)}
        title={empty ? "Nothing to copy" : `Copy ${label}`}
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-md border border-transparent text-ink-subtle transition-colors",
          empty
            ? "cursor-not-allowed opacity-30"
            : "hover:border-line hover:bg-surface-2 hover:text-ink",
          done && "border-success/30 bg-success-soft text-success",
        )}
      >
        {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={empty}
      onClick={(e) => void onCopy(e)}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
        empty
          ? "cursor-not-allowed border-line text-ink-subtle opacity-50"
          : done
            ? "border-success/30 bg-success-soft text-success"
            : "border-line-strong bg-surface text-ink hover:bg-surface-2",
      )}
    >
      {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {done ? "Copied" : label}
    </button>
  );
}

function sectionSheet(fields: DspField[], mode: "tsv" | "values" | "labeled") {
  const rows = fields.filter((f) => f.value.trim());
  if (mode === "values") return rows.map((f) => f.value).join("\n");
  if (mode === "labeled") return rows.map((f) => `${f.label}: ${f.value}`).join("\n");
  return rows.map((f) => `${f.label}\t${f.value}`).join("\n");
}

function DspRow({ field }: { field: DspField }) {
  const [done, setDone] = useState(false);
  const empty = !field.value.trim();
  const missing = empty && field.required;

  async function copyRow() {
    if (empty) return;
    const ok = await writeClipboard(field.value);
    if (!ok) return;
    setDone(true);
    window.setTimeout(() => setDone(false), 1200);
  }

  return (
    <button
      type="button"
      onClick={() => void copyRow()}
      disabled={empty}
      title={empty ? "Empty" : `Click to copy ${field.label}`}
      className={cn(
        "grid w-full grid-cols-[minmax(8.5rem,13rem)_minmax(0,1fr)_2rem] items-start gap-x-3 border-b border-line px-3 py-2.5 text-left text-[0.8125rem] transition-colors last:border-b-0 sm:grid-cols-[minmax(11rem,15rem)_minmax(0,1fr)_2rem] sm:px-4",
        empty
          ? missing
            ? "bg-danger-soft/40"
            : "bg-surface-2/40"
          : done
            ? "bg-success-soft/50"
            : "hover:bg-surface-2",
      )}
    >
      <span
        className={cn(
          "pt-0.5 font-medium",
          missing ? "text-danger" : "text-ink-subtle",
        )}
      >
        {field.label}
        {field.required ? <span className="text-danger"> *</span> : null}
      </span>
      <span
        className={cn(
          "min-w-0 break-words leading-relaxed",
          empty ? "text-ink-subtle" : field.mono ? "font-mono text-[0.8rem] text-ink" : "text-ink",
        )}
      >
        {empty ? (missing ? "Missing — fill before DSP upload" : "—") : field.value}
      </span>
      <span className="flex justify-end pt-0.5">
        {done ? (
          <Check className="size-3.5 text-success" />
        ) : empty ? (
          missing ? (
            <AlertCircle className="size-3.5 text-danger" />
          ) : null
        ) : (
          <Copy className="size-3.5 text-ink-subtle" />
        )}
      </span>
    </button>
  );
}

function DspSectionCard({
  section,
  copyMode,
}: {
  section: DspSection;
  copyMode: "tsv" | "values" | "labeled";
}) {
  const filled = section.fields.filter((f) => f.value.trim()).length;
  const missingReq = section.fields.filter((f) => f.required && !f.value.trim()).length;
  const sheet = sectionSheet(section.fields, copyMode);

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{section.title}</CardTitle>
            <Badge tone={missingReq ? "danger" : "neutral"}>
              {filled}/{section.fields.length} filled
            </Badge>
            {missingReq ? (
              <Badge tone="danger">{missingReq} required missing</Badge>
            ) : null}
          </div>
          {section.hint ? (
            <p className="mt-1 text-xs text-ink-muted">{section.hint}</p>
          ) : null}
        </div>
        <CopyButton text={sheet} label="Copy section" />
      </CardHeader>
      <CardBody className="p-0">
        <div className="min-w-0">
          {section.fields.map((field) => (
            <DspRow key={field.label} field={field} />
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

export default function SongDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [song, setSong] = useState<SongDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedBanner, setCopiedBanner] = useState<string | null>(null);
  const [upcBusy, setUpcBusy] = useState(false);
  const [copyMode, setCopyMode] = useState<"tsv" | "values" | "labeled">("tsv");
  const [hideEmpty, setHideEmpty] = useState(false);
  const [pdlModalOpen, setPdlModalOpen] = useState(false);
  const [pdlAction, setPdlAction] = useState<PDLActionType>("urgent_dsp_upload");
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [recentLogs, setRecentLogs] = useState<PDLEmailLog[]>([]);

  async function loadLogs() {
    const res = await api<{ items: PDLEmailLog[] }>(`/admin/pdl/logs?releaseId=${id}&limit=5`);
    if (res.ok && res.data.items) {
      setRecentLogs(res.data.items);
    }
  }

  async function reload() {
    const res = await api<SongDetail>(`/admin/releases/${id}`);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    setSong(res.data);
    void loadLogs();
  }

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const res = await api<SongDetail>(`/admin/releases/${id}`);
      setLoading(false);
      if (!res.ok) {
        setError(res.error);
        setSong(null);
        return;
      }
      setError(null);
      setSong(res.data);
      void loadLogs();
    })();
  }, [id]);

  function triggerPdlAction(action: PDLActionType) {
    setPdlAction(action);
    setPdlModalOpen(true);
  }

  async function assignUPC() {
    if (!song) return;
    const entered = window.prompt(
      `UPC for “${song.title}”\n\nLeave empty to auto-allocate the next Sonic & Co UPC (after internal approval).`,
      song.upc ?? "",
    );
    if (entered === null) return;
    setUpcBusy(true);
    const res = await api<{ ok: true; upc: string }>(`/admin/releases/upc`, {
      method: "POST",
      body: { releaseId: song.id, upc: entered.trim() },
    });
    setUpcBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (res.data.upc) window.alert(`UPC set to ${res.data.upc}`);
    await reload();
  }

  const track = song?.tracks?.[0] ?? null;

  const sections: DspSection[] = useMemo(() => {
    if (!song) return [];
    const t = track;

    const identity: DspField[] = [
      { label: "Song / Track Title", value: display(song.title), required: true },
      { label: "Version", value: display(song.catalogVersion || t?.version) },
      { label: "Album / Film Name", value: display(song.albumTitle), required: true },
      { label: "Release Type", value: display(song.type) },
      { label: "Album Type", value: display(song.albumType) },
      { label: "Primary Artist", value: display(song.primaryArtist), required: true },
      { label: "Album Main Artist", value: display(song.albumMainArtist) },
      { label: "Featuring", value: joinList(song.featuring) },
      { label: "Language", value: display(song.language || t?.language), required: true },
      { label: "Genre", value: display(song.genre), required: true },
      { label: "Sub-Genre", value: display(song.subGenre) },
      { label: "Mood", value: display(song.mood) },
      { label: "Description", value: display(song.description) },
    ];

    const catalog: DspField[] = [
      { label: "ISRC", value: display(t?.isrc), required: true, mono: true },
      { label: "Dolby ISRC", value: display(t?.dolbyIsrc), mono: true },
      { label: "UPC", value: display(song.upc), required: true, mono: true },
      { label: "Track Number", value: display(t?.trackNumber) },
      {
        label: "Duration (seconds)",
        value: t?.durationSeconds != null ? String(t.durationSeconds) : "",
        mono: true,
      },
      { label: "Audio filename", value: display(t?.audioFilename), mono: true },
      { label: "Audio format", value: display(t?.audioFormat) },
      { label: "Audio URL", value: display(t?.audioUrl), mono: true },
      { label: "Artwork URL", value: display(song.artworkUrl), mono: true },
      { label: "Line art URL", value: display(song.lineArtUrl), mono: true },
    ];

    const credits: DspField[] = [
      { label: "Track Main Artist", value: display(t?.primaryArtist), required: true },
      { label: "Track Featuring", value: joinList(t?.featuring) },
      { label: "Remixer", value: display(t?.remixer) },
      { label: "Composer", value: display(t?.composer || song.composer), required: true },
      { label: "Composer IPRS member", value: display(t?.composerIprsMember) },
      { label: "Composer IPI", value: display(t?.composerIpi), mono: true },
      { label: "Lyricist", value: display(t?.lyricist || song.lyricist), required: true },
      { label: "Lyricist IPRS member", value: display(t?.lyricistIprsMember) },
      { label: "Lyricist IPI", value: display(t?.lyricistIpi), mono: true },
      { label: "Songwriters", value: joinList(t?.songwriters) },
      { label: "Producers", value: joinList(t?.producers) },
      { label: "Music Director", value: display(t?.musicDirector) },
      { label: "Music Producer", value: display(t?.musicProducer || song.producer) },
      { label: "Film Director", value: display(t?.filmDirector) },
      { label: "Film Producer", value: display(t?.filmProducer) },
      { label: "Film Star Cast", value: display(t?.filmStarCast) },
    ];

    const platformIds: DspField[] = [
      { label: "Spotify Main Artist ID", value: display(t?.spotifyMainArtistId), mono: true },
      { label: "Spotify Featured Artist ID", value: display(t?.spotifyFeaturedArtistId), mono: true },
      { label: "Apple Main Artist ID", value: display(t?.appleMainArtistId), mono: true },
      { label: "Apple Remixer ID", value: display(t?.appleRemixerId), mono: true },
      { label: "Apple Composer ID", value: display(t?.appleComposerId), mono: true },
      { label: "Apple Lyricist ID", value: display(t?.appleLyricistId), mono: true },
      { label: "Apple Film Producer ID", value: display(t?.appleFilmProducerId), mono: true },
      { label: "Apple Film Director ID", value: display(t?.appleFilmDirectorId), mono: true },
      { label: "Apple Starcast ID", value: display(t?.appleStarcastId), mono: true },
      { label: "Facebook URL", value: display(t?.facebookUrl), mono: true },
      { label: "Instagram handle", value: display(t?.instagramHandle), mono: true },
    ];

    const rights: DspField[] = [
      { label: "Label Name", value: display(song.label), required: true },
      { label: "Label IPRS member", value: display(song.labelIprsMember) },
      { label: "Label IPI", value: display(song.labelIpi), mono: true },
      { label: "P-Line", value: display(song.pLine), required: true },
      { label: "C-Line", value: display(song.cLine), required: true },
      { label: "Pay To Rights", value: display(song.payToRights) },
      {
        label: "Copyright",
        value: `${song.copyrightYear} ${song.copyrightHolder}`.trim(),
        required: true,
      },
      { label: "Parental Advisory", value: display(song.parentalAdvisory || t?.parentalAdvisory) },
      { label: "Explicit", value: song.explicit || t?.explicit ? "Yes" : "No" },
      { label: "Instrumental", value: t?.isInstrumental ? "Yes" : "No" },
    ];

    const dates: DspField[] = [
      { label: "Original Release Date", value: isoDate(song.originalReleaseDate), mono: true },
      { label: "Release Date", value: isoDate(song.releaseDate), mono: true },
      { label: "Go Live Date", value: isoDate(song.goLiveDate), required: true, mono: true },
      { label: "Go Live Time (UTC)", value: display(song.goLiveTimeUtc), mono: true },
      { label: "CRBT Cut Name", value: display(t?.crbtCutName) },
      { label: "CRBT Cut Time", value: display(t?.crbtCutTime), mono: true },
    ];

    const filterEmpty = (fields: DspField[]) =>
      hideEmpty ? fields.filter((f) => f.value.trim() || f.required) : fields;

    return [
      {
        id: "identity",
        title: "1. Title & identity",
        hint: "Core metadata most DSPs ask first.",
        fields: filterEmpty(identity),
      },
      {
        id: "catalog",
        title: "2. Catalog codes & files",
        hint: "ISRC / UPC and media links for delivery.",
        fields: filterEmpty(catalog),
      },
      {
        id: "credits",
        title: "3. Credits & cast",
        hint: "Writers, producers, film credits.",
        fields: filterEmpty(credits),
      },
      {
        id: "platforms",
        title: "4. Platform artist IDs",
        hint: "Paste into Spotify / Apple / Meta worksheets.",
        fields: filterEmpty(platformIds),
      },
      {
        id: "rights",
        title: "5. Label & rights",
        hint: "P/C lines and ownership for ingestion.",
        fields: filterEmpty(rights),
      },
      {
        id: "dates",
        title: "6. Dates & CRBT",
        hint: "ISO dates (YYYY-MM-DD) for store schedulers.",
        fields: filterEmpty(dates),
      },
    ];
  }, [song, track, hideEmpty]);

  const allFields = useMemo(
    () => sections.flatMap((s) => s.fields),
    [sections],
  );

  const missingRequired = useMemo(
    () => allFields.filter((f) => f.required && !f.value.trim()),
    [allFields],
  );

  const fullSheet = useMemo(() => {
    return sections
      .map((s) => {
        const body = sectionSheet(s.fields, copyMode);
        if (!body) return "";
        return `${s.title}\n${body}`;
      })
      .filter(Boolean)
      .join("\n\n");
  }, [sections, copyMode]);

  const filledOnlySheet = useMemo(() => {
    const rows = allFields.filter((f) => f.value.trim());
    if (copyMode === "values") return rows.map((f) => f.value).join("\n");
    if (copyMode === "labeled") return rows.map((f) => `${f.label}: ${f.value}`).join("\n");
    return rows.map((f) => `${f.label}\t${f.value}`).join("\n");
  }, [allFields, copyMode]);

  const flash = useCallback((msg: string) => {
    setCopiedBanner(msg);
    window.setTimeout(() => setCopiedBanner(null), 1600);
  }, []);

  async function copyText(text: string, msg: string) {
    const ok = await writeClipboard(text);
    if (ok) flash(msg);
  }

  return (
    <AuthGate>
      <PageHeader
        title={song?.title ?? "Song details"}
        description="DSP upload worksheet — click any row to copy its value. Use section or full-sheet copy for paste into store portals."
        breadcrumbs={[
          { label: "Songs", href: "/songs" },
          { label: song?.title ?? "Details" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ButtonLink href="/songs" size="sm" variant="ghost">
              <ArrowLeft className="size-4" />
              Back
            </ButtonLink>
            <ButtonLink href={`/distribution/${id}`} size="sm" variant="secondary">
              Distribution
            </ButtonLink>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setHistoryModalOpen(true)}
            >
              <History className="size-4" />
              PDL History
            </Button>
            {song ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={upcBusy}
                onClick={() => void assignUPC()}
              >
                {song.upc?.trim() ? "Update UPC" : "Assign UPC"}
              </Button>
            ) : null}
          </div>
        }
      />

      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      {copiedBanner ? <FormMessage tone="success">{copiedBanner}</FormMessage> : null}
      {loading ? <p className="text-sm text-ink-muted">Loading…</p> : null}

      {song ? (
        <div className="space-y-6">
          {/* Sticky DSP toolbar */}
          <div className="sticky top-0 z-20 -mx-1 space-y-3 rounded-xl border border-line bg-canvas/95 p-3 shadow-sm backdrop-blur sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">
                  {song.title}
                  <span className="font-normal text-ink-muted"> · {song.primaryArtist}</span>
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Badge tone={song.distributionTier === "premium" ? "brand" : "neutral"}>
                    <Dot tone={song.distributionTier === "premium" ? "brand" : "neutral"} />
                    {song.distributionTier === "premium" ? "Premium" : "Free"}
                  </Badge>
                  <Badge tone="neutral">{song.status.replaceAll("_", " ")}</Badge>
                  <Badge tone={missingRequired.length ? "danger" : "success"}>
                    {missingRequired.length
                      ? `${missingRequired.length} required missing`
                      : "Ready for DSP copy"}
                  </Badge>
                  <Badge tone="info">
                    {formatNumber(song.totalStreams)} streams
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  onClick={() => triggerPdlAction("urgent_dsp_upload")}
                >
                  <Flame className="size-3.5" />
                  1. Urgent DSP Email
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-amber-400/40 text-amber-700 hover:bg-amber-50"
                  onClick={() => triggerPdlAction("youtube_claim_release")}
                >
                  <ShieldAlert className="size-3.5" />
                  2. YouTube Claim
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-sky-400/40 text-sky-700 hover:bg-sky-50"
                  onClick={() => triggerPdlAction("youtube_topic")}
                >
                  <Video className="size-3.5" />
                  3. YouTube Topic
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={() => void copyText(fullSheet, "Full DSP sheet copied")}
                >
                  <Copy className="size-3.5" />
                  Copy full sheet
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void copyText(filledOnlySheet, "Filled fields copied")}
                >
                  Copy filled only
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
              <span className="font-medium text-ink-subtle">Copy format</span>
              {(
                [
                  ["tsv", "Label + value (TSV)"],
                  ["labeled", "Label: value"],
                  ["values", "Values only"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCopyMode(id)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 transition-colors",
                    copyMode === id
                      ? "border-brand bg-brand-soft text-brand"
                      : "border-line hover:bg-surface-2",
                  )}
                >
                  {label}
                </button>
              ))}
              <label className="ml-auto inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={hideEmpty}
                  onChange={(e) => setHideEmpty(e.target.checked)}
                  className="size-3.5 rounded border-line"
                />
                Hide empty optional fields
              </label>
            </div>
            {missingRequired.length ? (
              <p className="text-xs text-danger">
                Missing for typical DSP upload:{" "}
                {missingRequired.map((f) => f.label).join(" · ")}
              </p>
            ) : null}
          </div>

          {/* Media strip — still easy to grab URLs/files */}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="flex-row items-center justify-between gap-2">
                <CardTitle>Artwork</CardTitle>
                {song.artworkUrl ? <CopyButton text={song.artworkUrl} label="URL" size="icon" /> : null}
              </CardHeader>
              <CardBody className="space-y-3">
                <div className="aspect-square overflow-hidden rounded-lg border border-line bg-surface-2">
                  {song.artworkUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={song.artworkUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="grid size-full place-items-center text-ink-subtle">
                      <ImageIcon className="size-8" />
                    </div>
                  )}
                </div>
                {song.artworkUrl ? (
                  <a
                    href={song.artworkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-brand"
                  >
                    <Download className="size-3.5" /> Open / download art
                  </a>
                ) : null}
                {song.lineArtUrl ? (
                  <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
                    <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                      <Disc3 className="size-3.5" /> Line art
                    </span>
                    <CopyButton text={song.lineArtUrl} label="URL" size="icon" />
                  </div>
                ) : null}
              </CardBody>
            </Card>

            <Card className="min-w-0">
              <CardHeader className="flex-row items-center justify-between gap-2">
                <CardTitle>Audio master</CardTitle>
                {track?.audioUrl ? (
                  <div className="flex gap-1">
                    <CopyButton text={track.audioUrl} label="URL" size="icon" />
                    {track.audioFilename ? (
                      <CopyButton text={track.audioFilename} label="Filename" size="icon" />
                    ) : null}
                  </div>
                ) : null}
              </CardHeader>
              <CardBody className="space-y-3">
                {track?.audioUrl ? (
                  <>
                    <audio controls className="w-full" src={track.audioUrl} preload="metadata" />
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge tone="success">
                        <Music className="size-3.5" />
                        {(track.audioFormat || "wav").toUpperCase()}
                      </Badge>
                      <span className="min-w-0 truncate font-mono text-xs text-ink-muted">
                        {track.audioFilename || "master"}
                      </span>
                      {track.audioSizeBytes ? (
                        <span className="text-xs text-ink-subtle">
                          {(track.audioSizeBytes / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      ) : null}
                    </div>
                    <a
                      href={track.audioUrl}
                      download={track.audioFilename || `${song.title}.wav`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 text-xs font-medium text-ink hover:bg-surface-2"
                    >
                      <Download className="size-3.5" /> Download audio
                    </a>
                  </>
                ) : (
                  <p className="text-sm text-ink-muted">No audio uploaded.</p>
                )}
                {song.userEmail || song.userName ? (
                  <div className="border-t border-line pt-3 text-xs text-ink-muted">
                    Submitted by{" "}
                    <button
                      type="button"
                      className="font-medium text-ink underline-offset-2 hover:underline"
                      onClick={() =>
                        void copyText(
                          [song.userName, song.userEmail].filter(Boolean).join(" · "),
                          "Submitter copied",
                        )
                      }
                    >
                      {song.userName}
                      {song.userEmail ? ` · ${song.userEmail}` : ""}
                    </button>
                    <span className="ml-2 text-ink-subtle">
                      · {formatINR(song.earningsPaise)} earnings
                    </span>
                  </div>
                ) : null}
              </CardBody>
            </Card>
          </div>

          {/* DSP sections */}
          <div className="grid gap-5 xl:grid-cols-2">
            {sections.map((section) => (
              <DspSectionCard key={section.id} section={section} copyMode={copyMode} />
            ))}
          </div>

          {/* Lyrics — full width, easy copy */}
          {track?.lyrics?.trim() ? (
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>Lyrics</CardTitle>
                  <p className="mt-1 text-xs text-ink-muted">
                    Click copy for full lyrics paste into DSP / lyrics partners.
                  </p>
                </div>
                <CopyButton text={track.lyrics} label="Copy lyrics" />
              </CardHeader>
              <CardBody>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-surface-2 p-4 text-[0.8125rem] leading-relaxed text-ink">
                  {track.lyrics}
                </pre>
              </CardBody>
            </Card>
          ) : null}

          {song.tracks.length > 1 ? (
            <Card>
              <CardHeader>
                <CardTitle>All tracks on this release</CardTitle>
              </CardHeader>
              <CardBody className="p-0">
                <ul className="divide-y divide-line">
                  {song.tracks.map((t) => (
                    <li
                      key={t.id}
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-5 py-3 text-sm"
                    >
                      <span className="w-6 text-ink-subtle tabular-nums">{t.trackNumber}.</span>
                      <span className="min-w-0 truncate">{t.title}</span>
                      {t.isrc ? (
                        <button
                          type="button"
                          className="font-mono text-xs text-brand"
                          onClick={() => void copyText(t.isrc!, "ISRC copied")}
                        >
                          {t.isrc}
                        </button>
                      ) : (
                        <span className="text-xs text-ink-subtle">No ISRC</span>
                      )}
                      {t.audioUrl ? (
                        <a href={t.audioUrl} className="text-xs text-brand" download>
                          Audio
                        </a>
                      ) : (
                        <span className="text-xs text-ink-subtle">—</span>
                      )}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}

          {song.stores?.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Store delivery status</CardTitle>
              </CardHeader>
              <CardBody className="p-0">
                <ul className="divide-y divide-line">
                  {song.stores.map((s) => (
                    <li
                      key={s.name}
                      className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-5 py-2.5 text-sm"
                    >
                      <button
                        type="button"
                        className="truncate text-left hover:text-brand"
                        onClick={() => void copyText(s.name, "Store name copied")}
                      >
                        {s.name}
                      </button>
                      <span className="capitalize text-ink-muted">{s.status}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}

          {song.reviewNotes ? (
            <Card>
              <CardBody>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold text-ink">Review notes</p>
                  <CopyButton text={song.reviewNotes} label="Copy" />
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-ink-muted">
                  {song.reviewNotes}
                </p>
              </CardBody>
            </Card>
          ) : null}

          {/* PDL Email Actions & History */}
          <Card id="pdl-actions">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="size-4.5 text-brand" />
                  PDL Ingestion &amp; Rights Actions
                </CardTitle>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Send official automated operations emails to PDL for DSP upload, YouTube claims, or Topic channel ingestion.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  onClick={() => triggerPdlAction("urgent_dsp_upload")}
                >
                  <Flame className="size-3.5" />
                  1. Urgent DSP
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-amber-400/40 text-amber-700 hover:bg-amber-50"
                  onClick={() => triggerPdlAction("youtube_claim_release")}
                >
                  <ShieldAlert className="size-3.5" />
                  2. YouTube Claim
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-sky-400/40 text-sky-700 hover:bg-sky-50"
                  onClick={() => triggerPdlAction("youtube_topic")}
                >
                  <Video className="size-3.5" />
                  3. YouTube Topic
                </Button>
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              {recentLogs.length > 0 ? (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                      Recent Sent Emails for this Song
                    </span>
                    <button
                      type="button"
                      onClick={() => setHistoryModalOpen(true)}
                      className="text-xs font-semibold text-brand hover:underline"
                    >
                      View All History &rarr;
                    </button>
                  </div>
                  <div className="divide-y divide-line rounded-lg border border-line bg-surface-2/40 overflow-hidden">
                    {recentLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between gap-3 p-3 text-xs">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge
                              tone={
                                log.actionType === "urgent_dsp_upload"
                                  ? "danger"
                                  : log.actionType === "youtube_claim_release"
                                    ? "warning"
                                    : "info"
                              }
                            >
                              {log.actionType === "urgent_dsp_upload"
                                ? "Urgent DSP"
                                : log.actionType === "youtube_claim_release"
                                  ? "YouTube Claim"
                                  : "YouTube Topic"}
                            </Badge>
                            <span className="truncate font-medium text-ink">{log.subject}</span>
                          </div>
                          <p className="mt-0.5 text-[0.6875rem] text-ink-muted">
                            To: {log.recipientEmail} · {formatDate(log.createdAt)}
                            {log.senderName ? ` · By ${log.senderName}` : ""}
                          </p>
                        </div>
                        <Badge tone={log.status === "sent" ? "success" : "danger"}>
                          {log.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-line bg-surface-2/30 p-4 text-center">
                  <p className="text-xs text-ink-muted">
                    No PDL action emails have been sent for this song yet. Use the buttons above to trigger automated emails.
                  </p>
                </div>
              )}
            </CardBody>
          </Card>

          <p className="text-xs text-ink-subtle">
            Fields follow PDL Advance Metadata Ingestion. Click any row to copy the value only.{" "}
            <Link href="/songs" className="text-brand">
              Back to songs
            </Link>
          </p>
        </div>
      ) : null}

      {/* PDL Action Modal */}
      {song ? (
        <PdlActionModal
          open={pdlModalOpen}
          onClose={() => setPdlModalOpen(false)}
          initialAction={pdlAction}
          songs={[
            {
              id: song.id,
              title: song.title,
              primaryArtist: song.primaryArtist,
              isrc: song.tracks?.[0]?.isrc ?? null,
              upc: song.upc ?? null,
            },
          ]}
          onSuccess={() => void reload()}
        />
      ) : null}

      {/* PDL History Modal */}
      <PdlHistoryModal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        releaseId={song?.id}
        releaseTitle={song?.title}
      />
    </AuthGate>
  );
}
