import { ReactNode } from "react";

export default function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="border-b bg-card">
      <div className="flex items-start justify-between gap-4 px-8 py-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{description}</p>}
        </div>
        {actions}
      </div>
    </div>
  );
}
