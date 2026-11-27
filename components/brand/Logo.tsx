import Image from "next/image";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

type LogoVariant = "clair" | "sombre" | "icone" | "mono" | "vertical";

const SRC: Record<LogoVariant, string> = {
  clair: "/brand/logo-clair.svg",
  sombre: "/brand/logo-sombre.svg",
  icone: "/brand/icone.svg",
  mono: "/brand/logo-mono.svg",
  vertical: "/brand/logo-vertical.svg",
};

/** Intrinsic aspect ratios from SVG viewBoxes. */
const ASPECT: Record<LogoVariant, number> = {
  clair: 232 / 64,
  sombre: 232 / 64,
  icone: 1,
  mono: 232 / 64,
  vertical: 180 / 188,
};

const DEFAULT_HEIGHT: Record<LogoVariant, number> = {
  clair: 32,
  sombre: 32,
  icone: 40,
  mono: 28,
  vertical: 120,
};

export function Logo({
  variant = "clair",
  className,
  width,
  height,
  priority,
}: {
  variant?: LogoVariant;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}) {
  const aspect = ASPECT[variant];
  const h = height ?? (width ? Math.round(width / aspect) : DEFAULT_HEIGHT[variant]);
  const w = width ?? Math.round(h * aspect);

  return (
    <Image
      src={SRC[variant]}
      alt={APP_NAME}
      width={w}
      height={h}
      priority={priority}
      className={cn("block max-w-full object-contain object-left", className)}
      style={{ width: w, height: h }}
    />
  );
}
