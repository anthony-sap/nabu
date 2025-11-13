import { ChevronRight } from "lucide-react";

/**
 * Props for BreadcrumbNav component
 */
interface BreadcrumbNavProps {
  items: Array<{
    label: string;
    onClick?: () => void;
  }>;
  className?: string;
}

/**
 * Breadcrumb navigation component with glassy premium styling
 * Displays hierarchical navigation path
 */
export function BreadcrumbNav({ items, className = "" }: BreadcrumbNavProps) {
  return (
    <nav className={`flex items-center gap-2 text-sm ${className}`} aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <div key={index} className="flex items-center gap-2">
            {item.onClick ? (
              <button
                onClick={item.onClick}
                className="text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium"
              >
                {item.label}
              </button>
            ) : (
              <span
                className={`font-medium ${
                  isLast ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </span>
            )}
            
            {!isLast && (
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            )}
          </div>
        );
      })}
    </nav>
  );
}

