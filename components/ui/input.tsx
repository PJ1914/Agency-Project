import * as React from "react"
import { ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    const [value, setValue] = React.useState<string>("");
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(ref, () => inputRef.current!);

    const isNumberInput = type === "number";

    const handleIncrement = () => {
      if (inputRef.current) {
        const step = parseFloat(inputRef.current.step || "1");
        const max = inputRef.current.max ? parseFloat(inputRef.current.max) : Infinity;
        const currentValue = parseFloat(inputRef.current.value || "0");
        const newValue = Math.min(currentValue + step, max);
        inputRef.current.value = newValue.toString();
        inputRef.current.dispatchEvent(new Event('input', { bubbles: true }));
        inputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };

    const handleDecrement = () => {
      if (inputRef.current) {
        const step = parseFloat(inputRef.current.step || "1");
        const min = inputRef.current.min ? parseFloat(inputRef.current.min) : -Infinity;
        const currentValue = parseFloat(inputRef.current.value || "0");
        const newValue = Math.max(currentValue - step, min);
        inputRef.current.value = newValue.toString();
        inputRef.current.dispatchEvent(new Event('input', { bubbles: true }));
        inputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };

    if (isNumberInput) {
      return (
        <div className="relative">
          <input
            type={type}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-8",
              "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
              className
            )}
            ref={inputRef}
            {...props}
          />
          <div className="absolute right-0 top-0 h-full flex flex-col border-l border-input">
            <button
              type="button"
              onClick={handleIncrement}
              className="flex-1 px-2 hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-center group rounded-tr-md"
              tabIndex={-1}
            >
              <ChevronUp className="w-3 h-3 text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
            </button>
            <button
              type="button"
              onClick={handleDecrement}
              className="flex-1 px-2 hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-center group border-t border-input rounded-br-md"
              tabIndex={-1}
            >
              <ChevronDown className="w-3 h-3 text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
            </button>
          </div>
        </div>
      )
    }

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
