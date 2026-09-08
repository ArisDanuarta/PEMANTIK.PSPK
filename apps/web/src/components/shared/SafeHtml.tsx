import React, { useEffect, useState } from "react";
import DOMPurify from "dompurify";

interface SafeHtmlProps {
  html: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function SafeHtml({ html, className, style }: SafeHtmlProps) {
  const [cleanHtml, setCleanHtml] = useState("");

  useEffect(() => {
    setCleanHtml(DOMPurify.sanitize(html || ""));
  }, [html]);

  if (!cleanHtml) {
    return <div className={className} style={style} />;
  }

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
