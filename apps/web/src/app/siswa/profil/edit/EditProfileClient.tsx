'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateStudentProfile } from '../../../actions/profileActions';

export default function EditProfileClient({ student, sesVariables }: { student: any, sesVariables: any[] }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const result = await updateStudentProfile(formData);
    
    if (result.success) {
      router.push('/siswa/profil');
      router.refresh();
    } else {
      setError(result.error || 'Terjadi kesalahan saat menyimpan data.');
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <style>{`
        .ep-page {
          max-width: 800px; margin: 0 auto;
          padding: 36px 40px 80px;
          font-family: var(--font-rubik), system-ui, sans-serif;
        }
        .ep-header { margin-bottom: 32px; }
        .ep-crumb { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #74777f; margin-bottom: 12px; }
        .ep-crumb a { color: #001934; font-weight: 600; text-decoration: none; }
        .ep-crumb a:hover { text-decoration: underline; }
        
        .ep-title { font-family: var(--font-noto-serif), Georgia, serif; font-size: 32px; font-weight: 700; color: #001934; margin-bottom: 6px; }
        .ep-subtitle { font-size: 15px; color: #43474e; }

        .ep-form { background: #ffffff; border-radius: 24px; box-shadow: 0 4px 20px rgba(16,46,80,0.06); border: 1px solid #e5eeff; overflow: hidden; }
        .ep-section { padding: 32px; border-bottom: 1px solid #e5eeff; }
        .ep-section:last-child { border-bottom: none; }
        .ep-section-title { font-family: var(--font-noto-serif), Georgia, serif; font-size: 20px; font-weight: 700; color: #001934; margin-bottom: 24px; display: flex; align-items: center; gap: 10px; }
        .ep-section-title span { color: #0874aa; }

        .ep-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .ep-form-group { display: flex; flex-direction: column; gap: 8px; }
        .ep-form-group.full { grid-column: 1 / -1; }
        .ep-label { font-size: 13px; font-weight: 600; color: #43474e; }
        .ep-input {
          width: 100%; padding: 14px 16px;
          background: #f8f9ff; border: 1px solid #c4c6cf; border-radius: 12px;
          font-family: var(--font-rubik), system-ui, sans-serif; font-size: 15px; color: #0b1c30;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .ep-input:focus { outline: none; border-color: #001934; box-shadow: 0 0 0 4px rgba(0,25,52,0.1); background: #ffffff; }
        .ep-input:disabled { background: #e5eeff; color: #74777f; border-color: #dce9ff; cursor: not-allowed; }

        .ep-footer {
          padding: 24px 32px; background: #f8f9ff;
          display: flex; justify-content: flex-end; gap: 16px;
          border-top: 1px solid #e5eeff;
        }
        .ep-btn-cancel {
          padding: 14px 28px; border-radius: 50px; font-weight: 700; font-size: 14px;
          background: none; border: 2px solid #001934; color: #001934; cursor: pointer; text-decoration: none;
        }
        .ep-btn-save {
          padding: 14px 32px; border-radius: 50px; font-weight: 700; font-size: 14px;
          background: #001934; border: none; color: #ffffff; cursor: pointer;
          display: flex; align-items: center; gap: 8px;
        }
        .ep-btn-save:hover { background: #102e50; }
        .ep-btn-save:disabled { background: #74777f; cursor: not-allowed; }
        
        .ep-error { background: #ffe4e6; color: #9f1239; padding: 16px; border-radius: 12px; margin-bottom: 24px; font-weight: 500; font-size: 14px; }

        @media (max-width: 767px) {
          .ep-page { padding: 24px 16px 80px; }
          .ep-grid { grid-template-columns: 1fr; }
          .ep-footer { flex-direction: column-reverse; padding: 20px; }
          .ep-btn-cancel, .ep-btn-save { width: 100%; justify-content: center; text-align: center; }
          .ep-section { padding: 24px 20px; }
        }
      `}</style>

      <div className="ep-page">
        <div className="ep-header">
          <div className="ep-crumb">
            <Link href="/siswa/profil">Profil</Link>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span>
            <span>Edit Profil</span>
          </div>
          <h1 className="ep-title">Edit Profil</h1>
          <p className="ep-subtitle">Perbarui informasi data diri, orang tua, dan wilayah kamu.</p>
        </div>

        {error && <div className="ep-error">{error}</div>}

        <form className="ep-form" onSubmit={handleSubmit}>
          {/* Data Pribadi */}
          <div className="ep-section">
            <h2 className="ep-section-title">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
              Data Pribadi
            </h2>
            <div className="ep-grid">
              <div className="ep-form-group full">
                <label className="ep-label">Nama Lengkap</label>
                <input type="text" name="full_name" defaultValue={student.full_name} className="ep-input" required />
              </div>
              <div className="ep-form-group">
                <label className="ep-label">Jenis Kelamin</label>
                <select name="gender" defaultValue={student.gender} className="ep-input">
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>
              <div className="ep-form-group">
                <label className="ep-label">Tanggal Lahir</label>
                <input type="date" name="birth_date" defaultValue={student.birth_date} className="ep-input" />
              </div>
            </div>
          </div>

          {/* Data Akademik (Read Only) */}
          <div className="ep-section" style={{ background: '#f8f9ff' }}>
            <h2 className="ep-section-title">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", color: '#92400e' }}>school</span>
              Data Akademik <span style={{ fontSize: '12px', background: '#dce9ff', color: '#001934', padding: '2px 8px', borderRadius: '4px', marginLeft: '8px' }}>Read-only</span>
            </h2>
            <p style={{ fontSize: '13px', color: '#74777f', marginBottom: '20px' }}>Data akademik hanya dapat diubah oleh administrator atau disinkronkan dari Dapodik.</p>
            <div className="ep-grid">
              <div className="ep-form-group">
                <label className="ep-label">NISN</label>
                <input type="text" defaultValue={student.nisn || '-'} className="ep-input" disabled />
              </div>
              <div className="ep-form-group full">
                <label className="ep-label">Asal Sekolah</label>
                <input type="text" defaultValue={student.schools?.name || 'Belum diatur'} className="ep-input" disabled />
              </div>
            </div>
          </div>

          {/* Data Orang Tua */}
          <div className="ep-section">
            <h2 className="ep-section-title">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", color: '#065f46' }}>family_restroom</span>
              Data Orang Tua / Wali
            </h2>
            <div className="ep-grid">
              <div className="ep-form-group">
                <label className="ep-label">Pekerjaan Ayah</label>
                <select name="father_occupation_id" defaultValue={student.father_occupation_id || ''} className="ep-input">
                  <option value="">Pilih Pekerjaan</option>
                  {sesVariables.filter(v => v.type === 'occupation').map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div className="ep-form-group">
                <label className="ep-label">Pendidikan Ayah</label>
                <select name="father_education_id" defaultValue={student.father_education_id || ''} className="ep-input">
                  <option value="">Pilih Pendidikan</option>
                  {sesVariables.filter(v => v.type === 'education').map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div className="ep-form-group">
                <label className="ep-label">Pekerjaan Ibu</label>
                <select name="mother_occupation_id" defaultValue={student.mother_occupation_id || ''} className="ep-input">
                  <option value="">Pilih Pekerjaan</option>
                  {sesVariables.filter(v => v.type === 'occupation').map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div className="ep-form-group">
                <label className="ep-label">Pendidikan Ibu</label>
                <select name="mother_education_id" defaultValue={student.mother_education_id || ''} className="ep-input">
                  <option value="">Pilih Pendidikan</option>
                  {sesVariables.filter(v => v.type === 'education').map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Data Wilayah */}
          <div className="ep-section">
            <h2 className="ep-section-title">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", color: '#9f1239' }}>location_on</span>
              Data Wilayah
            </h2>
            <div className="ep-grid">
              <div className="ep-form-group">
                <label className="ep-label">Provinsi</label>
                <input type="text" name="province" defaultValue={student.province || ''} className="ep-input" />
              </div>
              <div className="ep-form-group">
                <label className="ep-label">Kabupaten / Kota</label>
                <input type="text" name="city" defaultValue={student.city || ''} className="ep-input" />
              </div>
              <div className="ep-form-group">
                <label className="ep-label">Kecamatan</label>
                <input type="text" name="district" defaultValue={student.district || ''} className="ep-input" />
              </div>
              <div className="ep-form-group">
                <label className="ep-label">Desa / Kelurahan</label>
                <input type="text" name="village" defaultValue={student.village || ''} className="ep-input" />
              </div>
            </div>
          </div>

          <div className="ep-footer">
            <Link href="/siswa/profil" className="ep-btn-cancel">Batal</Link>
            <button type="submit" className="ep-btn-save" disabled={isSubmitting}>
              {isSubmitting ? (
                <>Menyimpan...</>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>
                  Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
