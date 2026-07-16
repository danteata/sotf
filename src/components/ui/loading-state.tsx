import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingStateProps {
  message?: string
  className?: string
}

/**
 * Centered spinner + message for query-loading sections. Consolidates the
 * repeated inline "animate-spin + muted text" loading markup.
 */
export function LoadingState({ message = "Loading...", className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        "w-full flex flex-col items-center justify-center py-20 gap-4 animate-in fade-in duration-500",
        className,
      )}
    >
      <RefreshCw className="h-10 w-10 animate-spin text-primary/50" />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  )
}
