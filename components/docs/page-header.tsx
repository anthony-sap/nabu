import { cn } from "@/lib/utils";

import { Icons } from "../shared/icons";

interface DocsPageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  heading: string;
  text?: string;
}

export function DocsPageHeader({
  heading,
  text,
  className,
  ...props
}: DocsPageHeaderProps) {
  return (
    <>
      <div className="text-muted-foreground mb-4 flex items-center space-x-1 text-sm">
        <div className="truncate">Docs</div>
        <Icons.chevronRight className="size-4" />
        <div className="font-medium text-purple-600/95 dark:text-purple-400">
          {heading}
        </div>
      </div>

      <div className={cn("space-y-2", className)} {...props}>
        <h1 className="font-heading inline-block scroll-m-20 text-4xl">
          {heading}
        </h1>
        {text && (
          <p className="text-muted-foreground text-lg text-balance">{text}</p>
        )}
      </div>
    </>
  );
}
