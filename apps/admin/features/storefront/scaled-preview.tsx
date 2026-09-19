"use client";
import { PortalHost } from "@nomera/ui/components/portal-host";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
export function ScaledPreview({
  children,
  device,
  title,
}: {
  children: ReactNode;
  device: "desktop" | "mobile";
  title: string;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [width, setWidth] = useState(500);
  const target = device === "mobile" ? 390 : 1440;
  const height = device === "mobile" ? 844 : 1000;
  const scale = Math.min(1, width / target);
  const load = useCallback(() => {
    const doc = frame.current?.contentDocument;
    if (doc) setHost(doc.body);
  }, []);
  useEffect(load, [load]);
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (viewport.current) setWidth(viewport.current.clientWidth);
    });
    if (viewport.current) observer.observe(viewport.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!host) return;
    const doc = host.ownerDocument;
    const sync = () => {
      doc.head.querySelectorAll("[data-preview-style]").forEach((node) => {
        node.remove();
      });
      document.head
        .querySelectorAll('style,link[rel="stylesheet"]')
        .forEach((node) => {
          const clone = node.cloneNode(true) as HTMLElement;
          clone.setAttribute("data-preview-style", "");
          doc.head.append(clone);
        });
      // Only font variables are inherited; admin layout and theme selectors stay out.
      host.className = document.body.className
        .split(" ")
        .filter(
          (name) =>
            name.includes("variable") ||
            name === "font-sans" ||
            name === "antialiased",
        )
        .join(" ");
      doc.documentElement.lang = document.documentElement.lang;
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, [host]);
  return (
    <div
      className={`sfe-preview-viewport sfe-preview-${device}`}
      ref={viewport}
    >
      <div
        style={{
          width: target * scale,
          height: height * scale,
          position: "relative",
          margin: "auto",
        }}
      >
        <iframe
          ref={frame}
          title={title}
          srcDoc="<!doctype html><html><head></head><body></body></html>"
          onLoad={load}
          style={{
            width: target,
            height,
            border: 0,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            inset: 0,
          }}
        />
        {host &&
          createPortal(<PortalHost value={host}>{children}</PortalHost>, host)}
      </div>
    </div>
  );
}
