// @file: apps/web/src/components/ui/SignOutButton.tsx
import { Button } from "./Button";
export function SignOutButton() {
  return (
    <form action="/api/auth/logout" method="post">
      <Button className="bg-red-500 text-white border-red-600" type="submit">LOGOUT</Button>
    </form>
  );
}