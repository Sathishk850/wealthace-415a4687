import { createFileRoute, useBlocker } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, Upload, Trash2, X, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({
    meta: [
      { title: "My Profile · FinVista" },
      { name: "description", content: "View and edit your profile information." },
    ],
  }),
  component: ProfilePage,
});

type Profile = {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
};

function initial(name?: string | null, email?: string | null) {
  const n = (name || "").trim();
  if (n) return n[0]!.toUpperCase();
  const e = (email || "").trim();
  if (e) return e[0]!.toUpperCase();
  return "U";
}

const PHONE_RE = /^\+?[0-9\s\-().]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

function ProfilePage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", avatar_url: "" });
  const [baseline, setBaseline] = useState({ full_name: "", phone: "", avatar_url: "" });
  const [errors, setErrors] = useState<{ full_name?: string; phone?: string }>({});
  const [uploading, setUploading] = useState(false);
  const [signedAvatar, setSignedAvatar] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const userQuery = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user;
    },
  });

  const profileQuery = useQuery({
    queryKey: ["profile", userQuery.data?.id],
    enabled: !!userQuery.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, avatar_url")
        .eq("user_id", userQuery.data!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as Profile | null) ?? null;
    },
  });

  useEffect(() => {
    if (profileQuery.data) {
      const next = {
        full_name: profileQuery.data.full_name ?? "",
        phone: profileQuery.data.phone ?? "",
        avatar_url: profileQuery.data.avatar_url ?? "",
      };
      setForm(next);
      setBaseline(next);
    }
  }, [profileQuery.data]);

  // Resolve avatar_url (storage path) → signed URL for display
  useEffect(() => {
    let cancelled = false;
    const path = form.avatar_url;
    if (!path) {
      setSignedAvatar(null);
      return;
    }
    if (/^https?:\/\//i.test(path)) {
      setSignedAvatar(path);
      return;
    }
    (async () => {
      const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60);
      if (!cancelled) setSignedAvatar(error ? null : data?.signedUrl ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [form.avatar_url]);

  const dirty = useMemo(
    () =>
      form.full_name !== baseline.full_name ||
      form.phone !== baseline.phone ||
      form.avatar_url !== baseline.avatar_url,
    [form, baseline],
  );

  useBlocker({
    shouldBlockFn: () => {
      if (!dirty) return false;
      return !window.confirm("You have unsaved changes. Leave without saving?");
    },
  });

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function validate(next = form) {
    const errs: { full_name?: string; phone?: string } = {};
    if (!next.full_name.trim()) errs.full_name = "Full name is required";
    else if (next.full_name.trim().length > 100) errs.full_name = "Must be 100 characters or fewer";
    if (next.phone.trim() && !PHONE_RE.test(next.phone.trim())) errs.phone = "Enter a valid phone number";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const save = useMutation({
    mutationFn: async () => {
      const userId = userQuery.data?.id;
      if (!userId) throw new Error("Not signed in");
      const { error } = await supabase
        .from("profiles")
        .upsert({
          user_id: userId,
          full_name: form.full_name.trim() || null,
          phone: form.phone.trim() || null,
          avatar_url: form.avatar_url.trim() || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["profile"] });
      setBaseline(form);
      setEditing(false);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to save"),
  });

  async function handleFile(file: File) {
    const userId = userQuery.data?.id;
    if (!userId) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG, or WEBP images are allowed");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image must be 5MB or smaller");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      // Remove previous file if it was a storage path
      const prev = baseline.avatar_url;
      if (prev && !/^https?:\/\//i.test(prev)) {
        await supabase.storage.from("avatars").remove([prev]);
      }

      const { error: dbErr } = await supabase
        .from("profiles")
        .upsert({ user_id: userId, avatar_url: path });
      if (dbErr) throw dbErr;

      setForm((s) => ({ ...s, avatar_url: path }));
      setBaseline((s) => ({ ...s, avatar_url: path }));
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Photo updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removePhoto() {
    const userId = userQuery.data?.id;
    if (!userId) return;
    if (!window.confirm("Remove your profile photo?")) return;
    setUploading(true);
    try {
      const prev = baseline.avatar_url;
      if (prev && !/^https?:\/\//i.test(prev)) {
        await supabase.storage.from("avatars").remove([prev]);
      }
      const { error } = await supabase
        .from("profiles")
        .upsert({ user_id: userId, avatar_url: null });
      if (error) throw error;
      setForm((s) => ({ ...s, avatar_url: "" }));
      setBaseline((s) => ({ ...s, avatar_url: "" }));
      setSignedAvatar(null);
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Photo removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove photo");
    } finally {
      setUploading(false);
    }
  }

  const loading = userQuery.isLoading || profileQuery.isLoading;
  const user = userQuery.data;
  const email = user?.email ?? "";
  const displayName = form.full_name.trim() || profileQuery.data?.full_name || "";
  const hasPhoto = !!signedAvatar;

  return (
    <>
      <PageHeader title="My Profile" description="Your personal information and account details." />
      <Card className="glass-card border-[var(--border)] p-6">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading profile…</div>
        ) : !user ? (
          <div className="text-sm text-muted-foreground">You're not signed in.</div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-20 w-20 border border-border">
                    {hasPhoto ? <AvatarImage src={signedAvatar!} alt="Profile photo" /> : null}
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-semibold">
                      {initial(displayName, email)}
                    </AvatarFallback>
                  </Avatar>
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-lg font-semibold text-foreground">
                    {displayName || "Complete your profile"}
                  </div>
                  <div className="text-sm text-muted-foreground">{email}</div>
                  {editing && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void handleFile(f);
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploading}
                        onClick={() => fileRef.current?.click()}
                      >
                        <Upload className="mr-1.5 h-4 w-4" />
                        {hasPhoto ? "Change Photo" : "Upload Photo"}
                      </Button>
                      {hasPhoto && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={uploading}
                          onClick={removePhoto}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="mr-1.5 h-4 w-4" /> Remove
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {editing ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={save.isPending}
                      onClick={() => {
                        if (dirty && !window.confirm("Discard your unsaved changes?")) return;
                        setForm(baseline);
                        setErrors({});
                        setEditing(false);
                      }}
                    >
                      <X className="mr-1.5 h-4 w-4" /> Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!validate()) return;
                        save.mutate();
                      }}
                      disabled={save.isPending || !dirty}
                    >
                      {save.isPending ? (
                        <>
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving…
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <Pencil className="mr-1.5 h-4 w-4" /> Edit Profile
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full Name" required error={errors.full_name}>
                {editing ? (
                  <Input
                    value={form.full_name}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((s) => ({ ...s, full_name: v }));
                      if (errors.full_name) validate({ ...form, full_name: v });
                    }}
                    placeholder="Your name"
                    maxLength={100}
                    aria-invalid={!!errors.full_name}
                  />
                ) : (
                  <Value>{form.full_name || "—"}</Value>
                )}
              </Field>
              <Field label="Email" required>
                <Value>{email || "—"}</Value>
              </Field>
              <Field label="Phone Number" hint="Optional" error={errors.phone}>
                {editing ? (
                  <Input
                    value={form.phone}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((s) => ({ ...s, phone: v }));
                      if (errors.phone) validate({ ...form, phone: v });
                    }}
                    placeholder="+1 555 000 0000"
                    maxLength={32}
                    aria-invalid={!!errors.phone}
                  />
                ) : (
                  <Value>{form.phone || "—"}</Value>
                )}
              </Field>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

function Field({
  label,
  children,
  required,
  hint,
  error,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
        {hint && <span className="ml-1.5 text-muted-foreground/70">({hint})</span>}
      </Label>
      {children}
      {error && <p className="text-[0.75rem] font-medium text-destructive">{error}</p>}
    </div>
  );
}

function Value({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md border border-border bg-surface/40 px-3 py-2 text-sm text-foreground">{children}</div>;
}