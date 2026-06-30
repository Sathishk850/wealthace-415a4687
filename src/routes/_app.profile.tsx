import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, X } from "lucide-react";

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

function initials(name?: string | null, email?: string | null) {
  const src = (name || email || "").trim();
  if (!src) return "U";
  const parts = src.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || src[0]!.toUpperCase();
}

function ProfilePage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", avatar_url: "" });

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
      setForm({
        full_name: profileQuery.data.full_name ?? "",
        phone: profileQuery.data.phone ?? "",
        avatar_url: profileQuery.data.avatar_url ?? "",
      });
    }
  }, [profileQuery.data]);

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
      setEditing(false);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to save"),
  });

  const loading = userQuery.isLoading || profileQuery.isLoading;
  const user = userQuery.data;
  const email = user?.email ?? "";

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
                <Avatar className="h-20 w-20 border border-border">
                  <AvatarImage src={form.avatar_url || profileQuery.data?.avatar_url || ""} alt="Profile photo" />
                  <AvatarFallback className="text-lg font-semibold">
                    {initials(form.full_name || profileQuery.data?.full_name, email)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-lg font-semibold text-foreground">
                    {form.full_name || profileQuery.data?.full_name || "Unnamed"}
                  </div>
                  <div className="text-sm text-muted-foreground">{email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {editing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => { setEditing(false); profileQuery.refetch(); }}>
                      <X className="mr-1.5 h-4 w-4" /> Cancel
                    </Button>
                    <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
                      {save.isPending ? "Saving…" : "Save changes"}
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
              <Field label="Full Name">
                {editing ? (
                  <Input
                    value={form.full_name}
                    onChange={(e) => setForm((s) => ({ ...s, full_name: e.target.value }))}
                    placeholder="Your name"
                    maxLength={100}
                  />
                ) : (
                  <Value>{form.full_name || "—"}</Value>
                )}
              </Field>
              <Field label="Email">
                <Value>{email || "—"}</Value>
              </Field>
              <Field label="Phone Number">
                {editing ? (
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                    placeholder="+1 555 000 0000"
                    maxLength={32}
                  />
                ) : (
                  <Value>{form.phone || "—"}</Value>
                )}
              </Field>
              <Field label="Profile Photo URL">
                {editing ? (
                  <Input
                    value={form.avatar_url}
                    onChange={(e) => setForm((s) => ({ ...s, avatar_url: e.target.value }))}
                    placeholder="https://…"
                    maxLength={500}
                  />
                ) : (
                  <Value>{form.avatar_url || "—"}</Value>
                )}
              </Field>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Value({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md border border-border bg-surface/40 px-3 py-2 text-sm text-foreground">{children}</div>;
}