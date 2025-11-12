 "use client";

import Color from "color";
import { PipetteIcon } from "lucide-react";
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type PropsWithChildren,
} from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ColorPickerContextValue {
  hue: number;
  saturation: number;
  lightness: number;
  alpha: number;
  color: Color;
  setHue: (value: number) => void;
  setSaturation: (value: number) => void;
  setLightness: (value: number) => void;
  setAlpha: (value: number) => void;
}

const ColorPickerContext = createContext<ColorPickerContextValue | undefined>(
  undefined,
);

function useColorPickerContext() {
  const context = useContext(ColorPickerContext);
  if (!context) {
    throw new Error("ColorPicker components must be used within ColorPicker.");
  }
  return context;
}

export interface ColorPickerProps
  extends PropsWithChildren,
    HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onChange?: (hex: string) => void;
}

export function ColorPicker({
  value,
  defaultValue = "#00B3A6",
  onChange,
  className,
  children,
  ...props
}: ColorPickerProps) {
  const resolvedColor = useMemo(() => {
    try {
      return Color(value ?? defaultValue);
    } catch (error) {
      console.warn("Invalid colour provided to ColorPicker:", error);
      return Color("#00B3A6");
    }
  }, [value, defaultValue]);

  const initial = useMemo(() => resolvedColor.hsl().object(), [resolvedColor]);

  const [hue, setHue] = useState(initial.h ?? 0);
  const [saturation, setSaturation] = useState(initial.s ?? 100);
  const [lightness, setLightness] = useState(initial.l ?? 50);
  const [alpha, setAlpha] = useState(
    Math.round((resolvedColor.alpha() ?? 1) * 100),
  );

  useEffect(() => {
    if (!value) {
      return;
    }
    try {
      const next = Color(value);
      const hsl = next.hsl().object();
      setHue(hsl.h ?? 0);
      setSaturation(hsl.s ?? 100);
      setLightness(hsl.l ?? 50);
      setAlpha(Math.round((next.alpha() ?? 1) * 100));
    } catch (error) {
      console.warn("Failed to parse controlled colour:", error);
    }
  }, [value]);

  const color = useMemo(
    () => Color.hsl(hue, saturation, lightness).alpha(alpha / 100),
    [hue, saturation, lightness, alpha],
  );

  useEffect(() => {
    const hex =
      alpha >= 100
        ? color.hex().toUpperCase()
        : color.hexa().toUpperCase();
    onChange?.(hex);
  }, [color, alpha, onChange]);

  const contextValue = useMemo<ColorPickerContextValue>(
    () => ({
      hue,
      saturation,
      lightness,
      alpha,
      color,
      setHue,
      setSaturation,
      setLightness,
      setAlpha,
    }),
    [hue, saturation, lightness, alpha, color],
  );

  return (
    <ColorPickerContext.Provider value={contextValue}>
      <div
        className={cn("flex flex-col gap-4", className)}
        data-slot="color-picker"
        {...props}
      >
        {children}
      </div>
    </ColorPickerContext.Provider>
  );
}

export type ColorPickerSelectionProps = HTMLAttributes<HTMLDivElement>;

export const ColorPickerSelection = memo(
  ({ className, ...props }: ColorPickerSelectionProps) => {
    const {
      hue,
      saturation,
      lightness,
      setSaturation,
      setLightness,
    } = useColorPickerContext();
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [positionX, setPositionX] = useState(saturation / 100);
    const [positionY, setPositionY] = useState(1 - lightness / 100);

    useEffect(() => {
      setPositionX(saturation / 100);
      setPositionY(1 - lightness / 100);
    }, [saturation, lightness]);

    const updateFromPointer = useCallback(
      (event: PointerEvent) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(
          0,
          Math.min(1, (event.clientX - rect.left) / rect.width),
        );
        const y = Math.max(
          0,
          Math.min(1, (event.clientY - rect.top) / rect.height),
        );

        setPositionX(x);
        setPositionY(y);
        setSaturation(x * 100);
        setLightness((1 - y) * 100);
      },
      [setSaturation, setLightness],
    );

    const handlePointerUp = useCallback(() => setIsDragging(false), []);

    useEffect(() => {
      if (!isDragging) return;

      const handlePointerMove = (event: PointerEvent) => {
        updateFromPointer(event);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      return () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };
    }, [isDragging, updateFromPointer, handlePointerUp]);

    return (
      <div
        ref={containerRef}
        className={cn(
          "relative size-full cursor-crosshair rounded-md",
          className,
        )}
        style={{
          background: `linear-gradient(0deg, rgba(0,0,0,1), rgba(0,0,0,0)),
            linear-gradient(90deg, rgba(255,255,255,1), rgba(255,255,255,0)),
            hsl(${hue}, 100%, 50%)`,
        }}
        onPointerDown={(event) => {
          event.preventDefault();
          setIsDragging(true);
          updateFromPointer(event.nativeEvent);
        }}
        {...props}
      >
        <span
          className="pointer-events-none absolute block h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
          style={{
            left: `${positionX * 100}%`,
            top: `${positionY * 100}%`,
          }}
        />
      </div>
    );
  },
);
ColorPickerSelection.displayName = "ColorPickerSelection";

interface SliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  trackBackground?: string;
  overlay?: React.ReactNode;
}

function ColorSlider({
  trackBackground,
  overlay,
  className,
  ...props
}: SliderProps) {
  return (
    <SliderPrimitive.Root
      className={cn(
        "relative flex h-4 w-full select-none items-center",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        className="relative h-2 w-full grow overflow-hidden rounded-full"
        style={{
          background: trackBackground,
        }}
      >
        {overlay}
        <SliderPrimitive.Range className="absolute h-full" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="border-primary bg-background ring-offset-background focus-visible:ring-ring block h-5 w-5 rounded-full border-2 shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
    </SliderPrimitive.Root>
  );
}

export const ColorPickerHue = ({ className }: { className?: string }) => {
  const { hue, setHue } = useColorPickerContext();
  return (
    <ColorSlider
      value={[hue]}
      max={360}
      step={1}
      onValueChange={([value]) => setHue(value)}
      trackBackground="linear-gradient(90deg, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)"
      className={className}
    />
  );
};

export const ColorPickerAlpha = ({ className }: { className?: string }) => {
  const { hue, saturation, lightness, alpha, setAlpha } = useColorPickerContext();
  const opaque = useMemo(
    () => Color.hsl(hue, saturation, lightness).alpha(1).hex(),
    [hue, saturation, lightness],
  );

  return (
    <ColorSlider
      value={[alpha]}
      max={100}
      step={1}
      onValueChange={([value]) => setAlpha(value)}
      className={className}
      trackBackground={`linear-gradient(90deg, rgba(0,0,0,0) 0%, ${opaque} 100%), url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==")`}
    />
  );
};

export const ColorPickerOutput = ({ className }: { className?: string }) => {
  const { color, alpha } = useColorPickerContext();
  const hex =
    alpha >= 100
      ? color.hex().toUpperCase()
      : color.hexa().toUpperCase();
  return (
    <Input
      readOnly
      value={hex}
      className={cn("h-9 font-mono text-xs", className)}
    />
  );
};

export const ColorPickerEyeDropper = () => {
  const { setHue, setSaturation, setLightness, setAlpha } =
    useColorPickerContext();

  const handleEyeDropper = async () => {
    try {
      // @ts-expect-error EyeDropper is experimental
      const eyeDropper = new EyeDropper();
      const { sRGBHex } = await eyeDropper.open();
      const picked = Color(sRGBHex);
      const hsl = picked.hsl().object();
      setHue(hsl.h ?? 0);
      setSaturation(hsl.s ?? 100);
      setLightness(hsl.l ?? 50);
      setAlpha(Math.round((picked.alpha() ?? 1) * 100));
    } catch (error) {
      console.warn("EyeDropper unavailable:", error);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={handleEyeDropper}
      title="Pick colour from screen"
    >
      <PipetteIcon className="h-4 w-4" />
    </Button>
  );
};

