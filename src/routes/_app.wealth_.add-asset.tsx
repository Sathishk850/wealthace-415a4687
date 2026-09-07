import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AddAssetForm } from "@/components/wealth/add-asset-form";

const searchSchema = z.object({
  type: z.string().optional(),
});

export const Route = createFileRoute("/_app/wealth_/add-asset")({
  head: () => ({
    meta: [
      { title: "Add Asset · Wealth Ace" },
      {
        name: "description",
        content:
          "Add an asset with type-specific fields, live price linking, and gain/loss tracking.",
      },
      { property: "og:title", content: "Add Asset · Wealth Ace" },
      {
        property: "og:description",
        content: "Record any asset type with the right fields and live price linking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (search) => searchSchema.parse(search),
  component: AddAssetPage,
});

function AddAssetPage() {
  const { type } = Route.useSearch();
  return <AddAssetForm typeKey={type ?? ""} />;
}
