import React from "react";
import DOMPurify from "isomorphic-dompurify";

interface SafeHtmlProps {
  html: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function SafeHtml({ html, className, style }: SafeHtmlProps) {
  const cleanHtml = DOMPurify.sanitize(html || "");
  
  return (
    <div
      className={className}
      style={{
        ...style,
      }}
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
}
