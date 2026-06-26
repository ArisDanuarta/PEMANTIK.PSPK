import type { Metadata } from "next";
import Link from "next/link";
import QuestionFormClient from "./QuestionFormClient";

export const metadata: Metadata = {
  title: "Input Soal Baru - Admin Soal",
};

export default function InputSoalBaruPage() {
  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      height: "calc(100vh - 65px - 3rem)",
      overflow: "hidden" 
    }}>
      <div className="page-header" style={{ flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="page-header-left">
          <h1 className="page-title">Input Soal Baru</h1>
          <div className="page-breadcrumb">
            <span>Super Admin</span>
            <span className="page-breadcrumb-sep">›</span>
            <Link href="/super-admin/soal" style={{ color: "inherit", textDecoration: "none" }}>Bank Soal</Link>
            <span className="page-breadcrumb-sep">›</span>
            <span>Tambah Baru</span>
          </div>
        </div>
      </div>

      <QuestionFormClient />
    </div>
  );
}
