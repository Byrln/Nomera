"use client";
import Image from "next/image";
import { useState } from "react";
// Tenant media hosts are not proxied through a wildcard image optimizer.
export function TravelImage({
  src,
  alt,
  priority = false,
  className = "",
  sizes = "(max-width: 767px) 100vw, 50vw",
}: {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
  sizes?: string;
}) {
  const [failed, setFailed] = useState("");
  return (
    <span
      className={`sf-media ${className}`}
      data-failed={failed === src || !src}
    >
      {src && failed !== src && (
        <Image
          src={src}
          alt={alt}
          fill
          unoptimized
          sizes={sizes}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          onError={() => setFailed(src)}
        />
      )}
    </span>
  );
}
