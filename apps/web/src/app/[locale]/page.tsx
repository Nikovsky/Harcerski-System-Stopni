// @file: apps/web/src/app/[locale]/page.tsx
import { Button } from "@/components/ui/Button";

export default function Page() {
  return (
    <div className="flex flex-wrap gap-3 p-6 bg-background text-foreground">
      <div className="p-6">
        <Button>Click me</Button>
        <br />
        <Button colorClass="bg-red-600 text-white border-red-700">
          Deploy
        </Button>
      </div>
    </div>
  );
}