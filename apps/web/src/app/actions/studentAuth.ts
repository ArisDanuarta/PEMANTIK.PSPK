'use server';

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function loginStudent(username: string, pin: string) {
  try {
    // Memanggil Edge Function "authenticate-student"
    const { data, error } = await supabase.functions.invoke('authenticate-student', {
      body: { username, pin },
    });

    if (error) {
      console.error('Edge Function Error:', error);
      throw new Error(error.message || 'Gagal terhubung ke server autentikasi.');
    }

    if (data?.token && data?.student) {
      // Simpan JWT di httpOnly cookie
      const cookieStore = await cookies();
      cookieStore.set('student_jwt', data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/siswa',
        maxAge: 60 * 60 * 24 * 7, // 7 hari
      });

      // Simpan data student di cookie terpisah (agar bisa dibaca oleh UI untuk menampilkan nama)
      // Karena isinya cuma info publik (nama, id), aman tanpa httpOnly jika diperlukan,
      // tapi kita buat httpOnly juga agar aman dan sediakan cara get-nya via Server Action.
      cookieStore.set('student_data', JSON.stringify(data.student), {
        httpOnly: false, // agar bisa dibaca dari client jika perlu, atau bisa diset true.
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/siswa',
        maxAge: 60 * 60 * 24 * 7,
      });

      return { success: true, student: data.student };
    } else {
      throw new Error(data?.error || 'Login gagal. Periksa kembali username dan PIN.');
    }
  } catch (err: any) {
    let errorMsg = 'Terjadi kesalahan jaringan.';
    if (err.message) {
      const errorStr = err.message;
      if (errorStr.includes('Nama pengguna tidak ditemukan') || errorStr.includes('tidak aktif')) {
        errorMsg = 'Username tidak terdaftar atau akun dinonaktifkan.';
      } else if (errorStr.includes('PIN yang dimasukkan salah')) {
        errorMsg = 'PIN salah. Silakan coba lagi.';
      } else if (errorStr.includes('Username dan PIN wajib diisi')) {
        errorMsg = 'Mohon lengkapi username dan PIN.';
      } else {
        errorMsg = errorStr;
      }
    }
    return { success: false, error: errorMsg };
  }
}

export async function getStudentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('student_jwt');
  const studentData = cookieStore.get('student_data');
  
  if (!token || !studentData) return null;
  
  try {
    return {
      token: token.value,
      student: JSON.parse(studentData.value),
    };
  } catch {
    return null;
  }
}

export async function logoutStudent() {
  const cookieStore = await cookies();
  cookieStore.delete('student_jwt');
  cookieStore.delete('student_data');
}
