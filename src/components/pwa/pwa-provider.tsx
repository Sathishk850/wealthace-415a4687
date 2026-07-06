import { OfflineBanner } from "./offline-banner";
import { PwaUpdatePrompt } from "./update-prompt";

export function PwaProvider() {
  return (
    <>
      <OfflineBanner />
      <PwaUpdatePrompt />
    </>
  );
}