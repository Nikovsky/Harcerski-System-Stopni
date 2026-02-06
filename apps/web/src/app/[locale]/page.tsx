// @file: apps/web/src/app/[locale]/page.tsx
import { Button } from "@/components/ui/Button";
export default function Page() {
  return (


    <div className="p-6 space-y-3">
      <Button>Normal</Button>
      <br />
      <Button theme="success">Login</Button>
      <br />
      <Button theme="danger">Logout</Button>
      <br />
      <Button theme="warning">Logout</Button>
    </div>


  );
}
