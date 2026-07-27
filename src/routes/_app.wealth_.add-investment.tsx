import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AddInvestmentForm } from "@/components/wealth/add-investment-form";

const searchSchema = z.object({
  id: z.string().optional(),
});

export const Route = createFileRoute("/_app/wealth/add-investment")({
  head: () => ({
    meta: [
      { title: "Add Investment · FinVista" },
      {
        name: "description",
        content:
          "Add a new investment with intelligent search, auto-classification, and live market pricing.",
      },
    ],
  }),
  validateSearch: (search) => searchSchema.parse(search),
  component: AddInvestmentPage,
});

function AddInvestmentPage() {
  const { id } = Route.useSearch();
  return <AddInvestmentForm investmentId={id} />;
}
