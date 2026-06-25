export function DashboardHeader({ name = "there" }: { name?: string }) {
  const hour = new Date().getHours();
  const greet =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return (
    <div className="space-y-1">
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
        {greet}, <span className="text-mint">{name}</span> 👋
      </h1>
      <p className="text-sm text-muted-foreground">
        Here's your financial overview · {today}
      </p>
    </div>
  );
}