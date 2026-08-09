import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bug, Lightbulb, MessageCircle, Paperclip, Clock, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/feedback")({
  head: () => ({
    meta: [
      { title: "Feedback · Wealth Ace" },
      { name: "description", content: "Share feedback, report bugs, or request features." },
    ],
  }),
  component: FeedbackPage,
});

type FeedbackType = "bug" | "feature" | "other";
type FeedbackStatus = "open" | "in_progress" | "resolved";
type FeedbackRow = {
  id: string;
  type: FeedbackType;
  message: string;
  attachment_url: string | null;
  status: FeedbackStatus;
  created_at: string;
};

const MAX_LEN = 2000;
const ALLOWED_FEEDBACK_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
];
const MAX_FEEDBACK_BYTES = 10 * 1024 * 1024;
const TYPE_OPTIONS: { id: FeedbackType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "bug", label: "Bug Report", icon: Bug },
  { id: "feature", label: "Feature Request", icon: Lightbulb },
  { id: "other", label: "Other", icon: MessageCircle },
];

function FeedbackPage() {
  return (
    <>
      <PageHeader title="Feedback" description="Share feedback, report bugs, or suggest new features." />
      <Card className="glass-card mx-auto max-w-3xl border-[var(--border)] p-5 md:p-6">
        <Tabs defaultValue="submit" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="submit">Submit</TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Clock className="h-3.5 w-3.5" /> History
            </TabsTrigger>
          </TabsList>
          <TabsContent value="submit" className="mt-5">
            <SubmitForm />
          </TabsContent>
          <TabsContent value="history" className="mt-5">
            <HistoryList />
          </TabsContent>
        </Tabs>
      </Card>
    </>
  );
}

function SubmitForm() {
  const qc = useQueryClient();
  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const submit = useMutation({
    mutationFn: async () => {
      const trimmed = message.trim();
      if (!trimmed) throw new Error("Please enter your feedback message.");
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userRes.user) throw new Error("You must be signed in to submit feedback.");
      const userId = userRes.user.id;

      let attachmentUrl: string | null = null;
      if (file) {
        if (!ALLOWED_FEEDBACK_TYPES.includes(file.type)) {
          throw new Error("Unsupported file type. Allowed: JPEG, PNG, GIF, WEBP, PDF, TXT.");
        }
        if (file.size > MAX_FEEDBACK_BYTES) {
          throw new Error("File must be 10 MB or smaller.");
        }
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("feedback-attachments")
          .upload(path, file, { upsert: false, contentType: file.type || undefined });
        if (upErr) throw upErr;
        attachmentUrl = path;
      }

      const { error } = await supabase.from("feedback").insert({
        user_id: userId,
        type,
        message: trimmed,
        attachment_url: attachmentUrl,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Feedback sent. Thank you!");
      setMessage("");
      setFile(null);
      setType("bug");
      if (fileInputRef.current) fileInputRef.current.value = "";
      qc.invalidateQueries({ queryKey: ["feedback", "history"] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Failed to send feedback");
    },
  });

  const remaining = MAX_LEN - message.length;
  const canSend = message.trim().length > 0 && !submit.isPending;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {TYPE_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = type === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setType(opt.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 rounded-lg border px-3 py-4 text-sm font-medium transition-all duration-200",
                active
                  ? "border-[#21DBD2]/60 bg-[rgba(33,219,210,0.10)] text-[#21DBD2]"
                  : "border-border bg-surface/40 text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
              aria-pressed={active}
            >
              <Icon className="h-5 w-5" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

      <div className="relative">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
          placeholder="Tell us anything..."
          maxLength={MAX_LEN}
          className="min-h-[160px] resize-y"
        />
        <div className="mt-1 text-right text-xs text-muted-foreground">
          {message.length}/{MAX_LEN}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <Paperclip className="h-4 w-4" />
          <span>Attach screenshot or file</span>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,application/pdf,.txt,.log,.json,.csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {file && (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface/40 px-2 py-1 text-xs">
            <span className="max-w-[180px] truncate">{file.name}</span>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              aria-label="Remove attachment"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setMessage("");
              setFile(null);
              setType("bug");
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            disabled={submit.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => submit.mutate()}
            disabled={!canSend}
          >
            {submit.isPending ? "Sending..." : "Send Feedback"}
          </Button>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">Remaining {remaining} characters.</p>
    </div>
  );
}

function HistoryList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["feedback", "history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback")
        .select("id,type,message,attachment_url,status,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FeedbackRow[];
    },
  });

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Loading history...</div>;
  }
  if (error) {
    return <div className="py-8 text-center text-sm text-destructive">Failed to load feedback history.</div>;
  }
  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        You haven't submitted any feedback yet.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {data.map((f) => (
        <FeedbackItem key={f.id} item={f} />
      ))}
    </ul>
  );
}

function FeedbackItem({ item }: { item: FeedbackRow }) {
  const typeMeta = useMemo(() => TYPE_OPTIONS.find((t) => t.id === item.type)!, [item.type]);
  const Icon = typeMeta.icon;
  return (
    <li className="rounded-lg border border-border bg-surface/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Icon className="h-4 w-4 text-[#21DBD2]" />
          <span>{typeMeta.label}</span>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{item.message}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>{formatDate(item.created_at)}</span>
        {item.attachment_url && <AttachmentLink path={item.attachment_url} />}
      </div>
    </li>
  );
}

function AttachmentLink({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const load = async () => {
    const { data, error } = await supabase.storage
      .from("feedback-attachments")
      .createSignedUrl(path, 60 * 10);
    if (error) {
      toast.error("Could not open attachment");
      return;
    }
    setUrl(data.signedUrl);
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };
  return (
    <button
      type="button"
      onClick={() => (url ? window.open(url, "_blank", "noopener,noreferrer") : load())}
      className="inline-flex items-center gap-1 text-[#21DBD2] hover:underline"
    >
      <Paperclip className="h-3 w-3" /> View attachment
    </button>
  );
}

function StatusBadge({ status }: { status: FeedbackStatus }) {
  const map: Record<FeedbackStatus, { label: string; cls: string }> = {
    open: { label: "Open", cls: "border-amber-500/40 bg-amber-500/10 text-amber-400" },
    in_progress: { label: "In Progress", cls: "border-sky-500/40 bg-sky-500/10 text-sky-400" },
    resolved: { label: "Resolved", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" },
  };
  const s = map[status];
  return (
    <Badge variant="outline" className={cn("border text-[11px] font-medium", s.cls)}>
      {s.label}
    </Badge>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}