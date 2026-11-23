import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoVariant = "clair" | "sombre" | "icone" | "mono" | "vertical";

const SRC: Record<LogoVariant, string> = {
  clair: "/brand/logo-clair.svg",
  sombre: "/brand/logo-sombre.svg",
  icone: "/brand/icone.svg",
  mono: "/brand/logo-mono.svg",
  vertical: "/brand/logo-vertical.svg",
};

const DEFAULT_SIZE: Record<LogoVariant, { width: number; height: number }> = {
  clair: { width: 200, height: 40 },
  sombre: { width: 200, height: 40 },
  icone: { width: 40, height: 40 },
  mono: { width: 180, height: 36 },
  vertical: { width: 120, height: 120 },
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
  const size = DEFAULT_SIZE[variant];
  return (
    <Image
      src={SRC[variant]}
      alt="CardioConsult"
      width={width ?? size.width}
      height={height ?? size.height}
      className={cn("h-auto w-auto", className)}
      priority={priority}
    />
  );
}
