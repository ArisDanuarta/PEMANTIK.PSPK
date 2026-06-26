"use client";

import React from "react";
import { PhantomSkeleton } from "@pemantik/ui";

export default function DashboardSkeleton() {
  return (
    <PhantomSkeleton loading={true}>
      <div className="animate-fade-in" style={{ padding: "1.5rem" }}>
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div className="page-header-left">
            <h1 className="page-title" style={{ width: 250, height: 28, marginBottom: '0.5rem', backgroundColor: 'var(--border)', borderRadius: 4 }}>Loading Title</h1>
            <div className="page-breadcrumb" style={{ width: 150, height: 16, backgroundColor: 'var(--border)', borderRadius: 4 }}></div>
          </div>
        </div>
        
        <div className="card" style={{ minHeight: "400px", padding: '1.5rem' }}>
          {/* Skeleton Mock */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
             <div style={{ width: 200, height: 40, borderRadius: 6, backgroundColor: 'var(--border)' }}></div>
             <div style={{ width: 100, height: 40, borderRadius: 6, backgroundColor: 'var(--border)' }}></div>
          </div>
          <div style={{ height: 40, borderBottom: '1px solid var(--border)', marginBottom: '1rem', backgroundColor: 'var(--background)' }}></div>
          <div style={{ height: 40, borderBottom: '1px solid var(--border)', marginBottom: '1rem', backgroundColor: 'var(--background)' }}></div>
          <div style={{ height: 40, borderBottom: '1px solid var(--border)', marginBottom: '1rem', backgroundColor: 'var(--background)' }}></div>
          <div style={{ height: 40, borderBottom: '1px solid var(--border)', marginBottom: '1rem', backgroundColor: 'var(--background)' }}></div>
          <div style={{ height: 40, borderBottom: '1px solid var(--border)', backgroundColor: 'var(--background)' }}></div>
        </div>
      </div>
    </PhantomSkeleton>
  );
}
