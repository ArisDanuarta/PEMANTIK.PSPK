import React from "react";

type SplitFormLayoutProps = {
  main: React.ReactNode;
  aside: React.ReactNode;
  asideWidth?: string; // default '380px' di lg+
  stackBelow?: "md" | "lg"; // default 'lg'
};

export function SplitFormLayout({
  main,
  aside,
  asideWidth = "380px",
  stackBelow = "lg",
}: SplitFormLayoutProps) {
  const stackClass = stackBelow === "lg" ? "lg:flex-row" : "md:flex-row";
  
  return (
    <div className={`flex flex-col ${stackClass} w-full h-[calc(100vh-64px)] overflow-hidden bg-gray-50`}>
      {/* Main Content (Form) */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pemantik-scrollbar">
        {main}
      </div>

      {/* Aside (Preview / Settings) */}
      <div 
        className="flex-shrink-0 bg-white border-l border-gray-200 overflow-y-auto pemantik-scrollbar"
        style={{ flexBasis: asideWidth }}
      >
        <div className="p-4 md:p-6 lg:p-8">
          {aside}
        </div>
      </div>
    </div>
  );
}
