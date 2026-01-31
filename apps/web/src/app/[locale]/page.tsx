// @file: apps/web/src/app/[locale]/page.tsx
import { Button } from "@/components/ui/Button";
export default function Page() {
  return (


    <div className="p-6 space-y-3">
      <Button className="px-4 py-2 rounded border border-border">Normal</Button>
      <br />
      <Button theme="success" className="px-4 py-2 rounded border border-border">Login</Button>
      <br />
      <Button theme="danger" className="px-4 py-2 rounded border border-border">Logout</Button>
    </div>


  );
}
