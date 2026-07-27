"use client";

import React, { useRef, useState, useEffect } from "react";

type ResponsiveChartContainerProps = {
  aspectRatio?: number; // default 16/9 for desktop
  minHeight?: number; // minimum height in pixels, default 300
  children: (dimensions: { width: number; height: number }) => React.ReactNode;
};

export function ResponsiveChartContainer({
  aspectRatio = 16 / 9,
  minHeight = 300,
  children,
}: ResponsiveChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        
        // On smaller screens, make it more square to fit data better
        const currentAspectRatio = width < 768 ? 4 / 3 : aspectRatio;
        const calculatedHeight = width / currentAspectRatio;
        
        setDimensions({
          width,
          height: Math.max(calculatedHeight, minHeight),
        });
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [aspectRatio, minHeight]);

  return (
    <div ref={containerRef} className="w-full relative">
      {dimensions.width > 0 && dimensions.height > 0 && children(dimensions)}
    </div>
  );
}
