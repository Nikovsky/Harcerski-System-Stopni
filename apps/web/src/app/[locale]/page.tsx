// @file: apps/web/src/app/[locale]/page.tsx
import { Button } from "@/components/ui/Button";
import { BtnOutlined } from "@/components/ui/BtnOutlined";

export default function Page() {
  return (
    <div className="p-6 space-y-3">
      <Button>Normal</Button>
      <Button disabled>Normal (disabled)</Button>
      <BtnOutlined>Normal (outlined)</BtnOutlined>
      <BtnOutlined disabled>Normal (outlined disabled)</BtnOutlined>

      <br />

      <Button theme="primary">Primary</Button>
      <Button theme="primary" disabled>
        Primary (disabled)
      </Button>
      <BtnOutlined theme="primary">Primary (outlined)</BtnOutlined>
      <BtnOutlined theme="primary" disabled>
        Primary (outlined disabled)
      </BtnOutlined>

      <br />

      <Button theme="secondary">Secondary</Button>
      <Button theme="secondary" disabled>
        Secondary (disabled)
      </Button>
      <BtnOutlined theme="secondary">Secondary (outlined)</BtnOutlined>
      <BtnOutlined theme="secondary" disabled>
        Secondary (outlined disabled)
      </BtnOutlined>

      <br />

      <Button theme="success">Success</Button>
      <Button theme="success" disabled>
        Success (disabled)
      </Button>
      <BtnOutlined theme="success">Success (outlined)</BtnOutlined>
      <BtnOutlined theme="success" disabled>
        Success (outlined disabled)
      </BtnOutlined>

      <br />

      <Button theme="info">Info</Button>
      <Button theme="info" disabled>
        Info (disabled)
      </Button>
      <BtnOutlined theme="info">Info (outlined)</BtnOutlined>
      <BtnOutlined theme="info" disabled>
        Info (outlined disabled)
      </BtnOutlined>

      <br />

      <Button theme="warning">Warning</Button>
      <Button theme="warning" disabled>
        Warning (disabled)
      </Button>
      <BtnOutlined theme="warning">Warning (outlined)</BtnOutlined>
      <BtnOutlined theme="warning" disabled>
        Warning (outlined disabled)
      </BtnOutlined>

      <br />

      <Button theme="danger">Danger</Button>
      <Button theme="danger" disabled>
        Danger (disabled)
      </Button>
      <BtnOutlined theme="danger">Danger (outlined)</BtnOutlined>
      <BtnOutlined theme="danger" disabled>
        Danger (outlined disabled)
      </BtnOutlined>

      <br />

      <Button theme="light">Light</Button>
      <Button theme="light" disabled>
        Light (disabled)
      </Button>
      <BtnOutlined theme="light">Light (outlined)</BtnOutlined>
      <BtnOutlined theme="light" disabled>
        Light (outlined disabled)
      </BtnOutlined>

      <br />

      <Button theme="dark">Dark</Button>
      <Button theme="dark" disabled>
        Dark (disabled)
      </Button>
      <BtnOutlined theme="dark">Dark (outlined)</BtnOutlined>
      <BtnOutlined theme="dark" disabled>
        Dark (outlined disabled)
      </BtnOutlined>
    </div>
  );
}