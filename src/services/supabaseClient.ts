/**
 * Supabase Client Initialization
 * Mendukung inisialisasi dinamis dan pengecekan status koneksi Supabase.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://tukpkikqdavfkdqbvclx.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1a3BraWtxZGF2ZmtkcWJ2Y2x4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyOTQ0NDYsImV4cCI6MjEwNzg3MDQ0Nn0.gKsIl3QByfpJV7HBfgCpWxGPo5vzhkczOimsbWJYaVA';

const supabaseUrl = ((import.meta as any).env?.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
const supabaseAnonKey = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY).trim();

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseUrl.startsWith('https://') &&
    supabaseAnonKey &&
    supabaseAnonKey.length > 20
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const checkSupabaseConnection = async (): Promise<{
  connected: boolean;
  message: string;
}> => {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      connected: false,
      message: 'Supabase belum dikonfigurasi di file .env (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY). Portal saat ini berjalan dalam mode prototipe lokal berkecepatan tinggi.',
    };
  }

  try {
    const { data, error } = await supabase.from('courses').select('id').limit(1);
    if (error) {
      return {
        connected: false,
        message: `Terhubung ke Supabase namun terjadi error query: ${error.message}. Pastikan file supabase/schema.sql telah dijalankan.`,
      };
    }
    return {
      connected: true,
      message: 'Koneksi ke Supabase berhasil! Data tersinkronisasi langsung dengan cloud database.',
    };
  } catch (err: any) {
    return {
      connected: false,
      message: `Gagal menghubungi Supabase: ${err.message}`,
    };
  }
};
