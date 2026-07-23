import { loadWebsite } from "../services/api";
import { SHEETS } from "../config/sheets";
import React, { useState, useEffect } from "react"
import { Play } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts"
import {
  Home, Users, Calendar, Bell, Image as ImageIcon, MapPin,
  ChevronRight, ChevronLeft, ChevronDown, Search, X, Menu,
  Phone, Clock, ArrowRight, Building2, TrendingUp, ZoomIn,
  Globe, Shield, Award, Landmark, Info, Download, Star, Camera,
  Mail, Heart, Leaf,
} from "lucide-react"
function formatTanggalIndonesia(tanggal: string) {
  if (!tanggal) return "";

  // Format ISO dari Google Sheets
  if (tanggal.includes("T")) {
    return new Date(tanggal).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  // Format lama dd/mm/yyyy
  const [hari, bulan, tahun] = tanggal.split("/").map(Number);

  return new Date(tahun, bulan - 1, hari).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
function getStatusKegiatan(
  tanggalMulai: string,
  tanggalSelesai: string
): "akan" | "berlangsung" | "selesai" {

  if (!tanggalMulai || !tanggalSelesai) return "akan";

  const sekarang = new Date();

  const mulai = new Date(tanggalMulai);
  mulai.setHours(0, 0, 0, 0);

  const selesai = new Date(tanggalSelesai);
  selesai.setHours(23, 59, 59, 999);

  if (sekarang < mulai) return "akan";

  if (sekarang > selesai) return "selesai";

  return "berlangsung";
}

// ── Types ──────────────────────────────────────────────────
type Page =
  | "beranda"
  | "profil"
  | "penduduk"
  | "kegiatan"
  | "pengumuman"
  | "galeri"
  | "struktur-rt"
  | "detail-rt"

type RT = {
  id: string
  ketua: string
  hp: string
  kk: number
  penduduk: number
  laki: number
  perempuan: number
  dusun: string
  deskripsi: string
}

type Pengumuman = {
  id: number
  judul: string
  tanggal: string
  kategori: string
  isi: string
  penting: boolean
}

type Album = {
  id: number;
  nama: string;
  tanggal: string;
  jumlah: number;
  cover: string;
  fotos: {
    type: "image" | "video";
    url: string;
    thumbnail: string;
  }[];
}

type Penduduk = {
  no: number
  nik: string
  nama: string
  rt: string
  gender: string
  ttl: string
  pekerjaan: string
  generasi: string
}

const RT_LIST: RT[] = [
  { id: "01", ketua: "Suwardi Priyanto", hp: "0812-3456-7890", kk: 68, penduduk: 245, laki: 122, perempuan: 123, dusun: "Kutu Tegal Barat", deskripsi: "RT 01 meliputi wilayah Kutu Tegal Barat, dikenal dengan semangat gotong royong yang tinggi dan aktif dalam berbagai kegiatan padukuhan." },
  { id: "02", ketua: "Margono Santoso", hp: "0813-5678-9012", kk: 72, penduduk: 267, laki: 134, perempuan: 133, dusun: "Kutu Tegal Tengah", deskripsi: "RT 02 berada di pusat padukuhan, dekat dengan Balai Padukuhan dan berbagai fasilitas umum utama." },
  { id: "03", ketua: "Bambang Triyono", hp: "0814-2345-6789", kk: 65, penduduk: 231, laki: 115, perempuan: 116, dusun: "Kutu Tegal Utara", deskripsi: "RT 03 di bagian utara padukuhan memiliki potensi pertanian yang sangat baik dengan lahan sawah yang luas." },
  { id: "04", ketua: "Agus Widodo", hp: "0815-6789-0123", kk: 71, penduduk: 258, laki: 129, perempuan: 129, dusun: "Kutu Tegal Selatan", deskripsi: "RT 04 aktif dalam kegiatan olahraga dan memiliki lapangan voli representatif yang sering digunakan warga." },
  { id: "05", ketua: "Sunarto Wibowo", hp: "0816-9012-3456", kk: 66, penduduk: 246, laki: 123, perempuan: 123, dusun: "Kutu Tegal Timur", deskripsi: "RT 05 dikenal dengan potensi UMKM yang kuat dan kerajinan tangan warganya yang beragam." },
]

// ── Helpers ────────────────────────────────────────────────
const KATEGORI_COLORS: Record<string, { bg: string; text: string }> = {
  Sosial: { bg: "#EEF2FF", text: "#243B88" },
  Kesehatan: { bg: "#ECFDF5", text: "#065F46" },
  Musyawarah: { bg: "#FFF7ED", text: "#92400E" },
  Edukasi: { bg: "#F5F3FF", text: "#4C1D95" },
  Olahraga: { bg: "#FFF1F2", text: "#881337" },
  Administrasi: { bg: "#FFF7ED", text: "#92400E" },
  Informasi: { bg: "#EFF6FF", text: "#1E40AF" },
  Pendidikan: { bg: "#F5F3FF", text: "#4C1D95" },
}

function catStyle(cat: string) {
  return KATEGORI_COLORS[cat] ?? { bg: "#F3F4F6", text: "#374151" }
}

// ── Shared UI ──────────────────────────────────────────────
function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-7">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-1 h-6 rounded-full bg-[#243B88]" />
        <h2 className="text-2xl font-bold text-[#1A2744]">{title}</h2>
      </div>
      {subtitle && <p className="text-[#6172A0] text-sm pl-4">{subtitle}</p>}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color = "#243B88" }: { icon: React.ElementType; label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(36,59,136,0.08)] flex items-center gap-4 hover:shadow-[0_8px_32px_rgba(36,59,136,0.14)] transition-shadow">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + "18" }}>
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <div>
        <div className="text-2xl font-extrabold text-[#1A2744]">{typeof value === "number" ? value.toLocaleString("id-ID") : value}</div>
        <div className="text-sm text-[#6172A0] font-medium">{label}</div>
      </div>
    </div>
  )
}

// ── Navbar ─────────────────────────────────────────────────
function Navbar({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  const [open, setOpen] = useState(false)

  const nav: { id: Page; label: string; icon: React.ElementType }[] = [
    { id: "beranda", label: "Beranda", icon: Home },
    { id: "profil", label: "Profil", icon: Info },
    { id: "penduduk", label: "Penduduk", icon: Users },
    { id: "kegiatan", label: "Kegiatan", icon: Calendar },
    { id: "pengumuman", label: "Pengumuman", icon: Bell },
    { id: "galeri", label: "Galeri", icon: Camera },
    { id: "struktur-rt", label: "Struktur RT", icon: Building2 },
  ]

  const go = (p: Page) => { setPage(p); setOpen(false) }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/96 backdrop-blur-md border-b border-[#243B88]/10 shadow-[0_2px_16px_rgba(36,59,136,0.07)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button onClick={() => go("beranda")} className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-[#243B88] rounded-xl flex items-center justify-center group-hover:bg-[#1a2d6e] transition-colors shadow-sm">
              <Landmark className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-[13px] font-extrabold text-[#243B88] leading-none">Padukuhan Kutu Tegal</div>
              <div className="text-[11px] text-[#6172A0] mt-0.5">Sistem Informasi</div>
            </div>
          </button>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-0.5">
            {nav.map(item => (
              <button
                key={item.id}
                onClick={() => go(item.id)}
                className={`px-3.5 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                  page === item.id || (page === "detail-rt" && item.id === "struktur-rt")
                    ? "bg-[#243B88] text-white shadow-sm"
                    : "text-[#475569] hover:bg-[#EEF2FF] hover:text-[#243B88]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="lg:hidden p-2 rounded-xl text-[#243B88] hover:bg-[#EEF2FF] transition-colors"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-t border-[#EEF2FF] px-4 py-3 grid grid-cols-2 gap-2 bg-white">
          {nav.map(item => {
            const Icon = item.icon
            const active = page === item.id || (page === "detail-rt" && item.id === "struktur-rt")
            return (
              <button
                key={item.id}
                onClick={() => go(item.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left ${
                  active ? "bg-[#243B88] text-white" : "text-[#475569] hover:bg-[#EEF2FF] hover:text-[#243B88]"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </nav>
  )
}

// ── Footer ─────────────────────────────────────────────────
function Footer({ setPage }: { setPage: (p: Page) => void }) {
  const links: { id: Page; label: string }[] = [
    { id: "beranda", label: "Beranda" },
    { id: "profil", label: "Profil" },
    { id: "penduduk", label: "Data Penduduk" },
    { id: "kegiatan", label: "Kegiatan" },
    { id: "pengumuman", label: "Pengumuman" },
    { id: "galeri", label: "Galeri" },
    { id: "struktur-rt", label: "Struktur RT" },
  ]
  return (
    <footer className="bg-[#1A2744] text-white mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <Landmark className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-extrabold text-white text-sm">Padukuhan Kutu Tegal</div>
                <div className="text-[#94A3B8] text-xs">Sinduadi · Mlati · Sleman</div>
              </div>
            </div>
            <p className="text-[#94A3B8] text-sm leading-relaxed">
              Portal informasi resmi yang menyediakan data dan informasi terkini untuk seluruh warga Padukuhan Kutu Tegal.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-xs tracking-widest uppercase text-[#64748B]">Navigasi</h4>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
              {links.map(l => (
                <button key={l.id} onClick={() => setPage(l.id)} className="text-[#CBD5E1] hover:text-white text-sm text-left transition-colors">
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-xs tracking-widest uppercase text-[#64748B]">Kontak</h4>
            <div className="space-y-3 text-sm text-[#CBD5E1]">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#7C9EF8] mt-0.5 flex-shrink-0" />
                <span>Dusun Kutu Tegal, Sinduadi, Mlati, Sleman, D.I. Yogyakarta</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#7C9EF8] flex-shrink-0" />
                <span>+62 812-3456-7890</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#7C9EF8] flex-shrink-0" />
                <span>info@kututegal.desa.id</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-[#7C9EF8] flex-shrink-0" />
                <span>kututegal.vercel.app</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#475569]">
          <span>© KKN UNIVERSITAS TIDAR 2026</span>
          <span>Sistem Informasi Padukuhan Kutu Tegal</span>
        </div>
      </div>
    </footer>
  )
}

// ── Beranda ────────────────────────────────────────────────
function BerandaPage({
  setPage,
  website,
}: {
  setPage: (p: Page) => void;
  website: any;
}) {

  const kegiatan = website?.kegiatan || [];
  const pendudukList = website?.penduduk || [];
  const profil = website?.profil || {};
const heroImage = "/images/hero-beranda.png";
console.log(profil.Foto);
console.log(heroImage);
  const pengumuman = website?.pengumuman || [];
  const galeri = website?.galeri || [];

  const totalPenduduk = pendudukList.length;

  const totalKK = pendudukList.filter((p: any) =>
    String(p["Status Keluarga"] || "")
      .trim()
      .toLowerCase()
      .includes("kepala")
  ).length;

  const laki = pendudukList.filter((p: any) =>
    String(p["Jenis Kelamin"] || "")
      .trim()
      .toLowerCase()
      .includes("laki")
  ).length;

  const perempuan = pendudukList.filter((p: any) =>
    String(p["Jenis Kelamin"] || "")
      .trim()
      .toLowerCase()
      .includes("perempuan")
  ).length;

  // lanjutkan kode BerandaPage...
  const quickMenus: {
    id: Page;
    label: string;
    icon: React.ElementType;
    color: string;
    desc: string;
  }[] = [
    {
      id: "penduduk",
      label: "Data Penduduk",
      icon: Users,
      color: "#243B88",
      desc: `${totalPenduduk.toLocaleString("id-ID")} Jiwa`,
    },
    {
      id: "profil",
      label: "Profil Padukuhan",
      icon: Info,
      color: "#0F766E",
      desc: "Sejarah & Visi",
    },
    {
      id: "kegiatan",
      label: "Kegiatan",
      icon: Calendar,
      color: "#7C3AED",
      desc: "Lihat Agenda",
    },
    {
      id: "pengumuman",
      label: "Pengumuman",
      icon: Bell,
      color: "#D97706",
      desc: "Info Terbaru",
    },
    {
      id: "galeri",
      label: "Galeri Foto",
      icon: Camera,
      color: "#DB2777",
      desc: "Dokumentasi",
    },
    {
      id: "struktur-rt",
      label: "Struktur RT",
      icon: Building2,
      color: "#0369A1",
      desc: "13 RT · 5 RW",
    },
  ];

  return (
    <div>
  {/* ================= DESKTOP ================= */}
        <div className="hidden md:block">

        <section className="relative h-[560px] sm:h-[640px] overflow-hidden bg-[#243B88]">
        <img
            src="/images/hero-beranda.png"
          alt="Padukuhan Kutu Tegal, Yogyakarta"
          className="absolute inset-0 w-full h-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f1f4d]/95 via-[#243B88]/80 to-[#243B88]/30" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-14 sm:pt-16">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#7C9EF8]" />
                <span className="text-[#7C9EF8] text-xs font-bold tracking-widest uppercase">Sinduadi · Mlati · Sleman · D.I. Yogyakarta</span>
              </div>
              <h1 className="text-[2.8rem] sm:text-[3.25rem] font-black text-white leading-tight mb-5">
                Selamat Datang di<br />
                <span className="text-[#7C9EF8]">Padukuhan<br />Kutu Tegal</span>
              </h1>
              <p className="text-white/75 text-base sm:text-lg leading-relaxed mb-8 max-w-md">
                Portal informasi resmi warga. Temukan data penduduk, kegiatan, pengumuman, dan informasi terkini.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-20 sm:mb-0">
                <button
                  onClick={() => setPage("penduduk")}
                  className="bg-white text-[#243B88] font-bold px-6 py-3 rounded-2xl hover:bg-[#EEF2FF] transition-all shadow-lg shadow-black/20 text-sm"
                >
                  Lihat Data Penduduk
                </button>
                <button
                  onClick={() => setPage("profil")}
                  className="bg-white/15 backdrop-blur text-white font-semibold px-6 py-3 rounded-2xl border border-white/30 hover:bg-white/25 transition-all text-sm"
                >
                  Profil Padukuhan
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Floating stats bar */}
<div className="
  max-[639px]:relative
  max-[639px]:mt-8
  sm:absolute
  sm:bottom-0
  left-0
  right-0
  bg-gradient-to-t
  from-[#0f1f4d]/80
  to-transparent
  py-6
">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="grid grid-cols-2 gap-y-5 gap-x-8 sm:flex sm:justify-between">
      {[
        {
          v: totalPenduduk.toLocaleString("id-ID"),
          l: "Penduduk",
        },
        {
          v: totalKK.toLocaleString("id-ID"),
          l: "Kepala Keluarga",
        },
        {
          v: "13 RT",
          l: "4 RW",
        },
        {
          v: "Sleman",
          l: "D.I. Yogyakarta",
        },
      ].map((s, i) => (
        <div 
          key={i}
          className="text-center">
          <div className="text-xl sm:text-2xl font-extrabold text-white">
            {s.v}
          </div>
          <div className="text-white/60 text-xs sm:text-sm">
            {s.l}
          </div>
        </div>
      ))}
    </div>
  </div>
</div>
</section>

</div>

{/* ================= HERO MOBILE ================= */}
<div className="block md:hidden">

  <section className="bg-[#243B88] relative overflow-hidden">

<img
  src="/images/hero-beranda.png"
  alt="Hero Beranda"
  className="absolute inset-0 w-full h-full object-cover opacity-35"
/>

    <div className="absolute inset-0 bg-gradient-to-r from-[#0f1f4d]/95 via-[#243B88]/80 to-[#243B88]/30" />

    <div className="relative z-10 px-5 pt-24 pb-10">

      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-[#7C9EF8]" />

        <span className="text-[#7C9EF8] text-[11px] font-bold uppercase tracking-wider">
          Sinduadi · Mlati · Sleman · D.I. Yogyakarta
        </span>
      </div>

      <h1 className="text-[34px] sm:text-[46px] leading-[40px] sm:leading-[50px] font-black text-white">
        Selamat Datang
        <br />
        <span className="text-[#7C9EF8]">
          di Padukuhan 
          <br />
          Kutu Tegal
        </span>
      </h1>

      <p className="mt-6 text-white/80 leading-8">
        Portal informasi resmi warga. Temukan data penduduk,
        kegiatan, pengumuman, dan informasi terkini.
      </p>

      <div className="space-y-3 mt-8">

        <button
          onClick={() => setPage("penduduk")}
          className="w-full bg-white text-[#243B88] font-bold py-3 rounded-2xl"
        >
          Lihat Data Penduduk
        </button>

        <button
          onClick={() => setPage("profil")}
          className="w-full bg-white/10 border border-white/30 text-white font-semibold py-3 rounded-2xl"
        >
          Profil Padukuhan
        </button>

      </div>

      <div className="grid grid-cols-2 gap-y-8 mt-10 text-center">

        <div>
          <div className="text-2xl font-black text-white">
            {totalPenduduk.toLocaleString("id-ID")}
          </div>
          <div className="text-white/60 text-sm">
            Penduduk
          </div>
        </div>

        <div>
          <div className="text-2xl font-black text-white">
            {totalKK.toLocaleString("id-ID")}
          </div>
          <div className="text-white/60 text-sm">
            Kepala Keluarga
          </div>
        </div>

        <div>
          <div className="text-2xl font-extrabold text-white">
            13 RT
          </div>
          <div className="text-white/60 text-xs mt-1">
            4 RW
          </div>
        </div>

        <div>
          <div className="text-2xl font-extrabold text-white">
            Sleman
          </div>
          <div className="text-white/60 text-xs mt-1">
            D.I. Yogyakarta
          </div>
        </div>

      </div>

    </div>

  </section>

</div>

<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Quick Menu */}
        <section className="py-12">
          <SectionTitle title="Menu Utama" subtitle="Akses cepat informasi padukuhan" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickMenus.map(item => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setPage(item.id)}
                  className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_rgba(36,59,136,0.07)] hover:shadow-[0_8px_32px_rgba(36,59,136,0.14)] hover:-translate-y-1.5 transition-all group text-center"
                >
                  <div
                    className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform duration-200"
                    style={{ backgroundColor: item.color + "16" }}
                  >
                    <Icon className="w-6 h-6" style={{ color: item.color }} />
                  </div>
                  <div className="font-bold text-[#1A2744] text-sm leading-tight">{item.label}</div>
                  <div className="text-[#6172A0] text-xs mt-1">{item.desc}</div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Stats */}
        <section className="pb-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Total Penduduk"
            value={totalPenduduk.toLocaleString("id-ID")}
            color="#243B88"
          />

          <StatCard
            icon={Home}
            label="Kepala Keluarga"
            value={totalKK.toLocaleString("id-ID")}
            color="#0F766E"
          />

          <StatCard
            icon={TrendingUp}
            label="Laki-laki"
            value={laki.toLocaleString("id-ID")}
            color="#7C3AED"
          />

          <StatCard
            icon={Heart}
            label="Perempuan"
            value={perempuan.toLocaleString("id-ID")}
            color="#DB2777"
          />
          </div>
        </section>

        {/* Recent content */}
        <section className="py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Kegiatan */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#1A2744] flex items-center gap-2.5">
                  <div className="w-1 h-5 rounded-full bg-[#243B88]" />
                  Kegiatan Terbaru
                </h2>
                <button onClick={() => setPage("kegiatan")} className="flex items-center gap-1 text-[#243B88] text-sm font-semibold hover:gap-2 transition-all">
                  Semua <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                {kegiatan.slice(0, 3).map((k: any) => {
                  const cs = catStyle(k["Kategori"] || "Umum");
                  return (
                    <div
                      key={k.id}
                      onClick={() => setPage("kegiatan")}
                      className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(36,59,136,0.07)] overflow-hidden flex cursor-pointer hover:shadow-[0_6px_24px_rgba(36,59,136,0.13)] transition-shadow group"
                    >
                      <div className="w-24 sm:w-28 flex-shrink-0 overflow-hidden bg-[#EEF2FF]">
                        <img src={getImageUrl(k["Foto"])} alt={k.judul} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                      <div className="p-4 flex-1 min-w-0">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: cs.bg, color: cs.text }}>{k["Kategori"] || "Umum"}</span>
                        <h3 className="font-bold text-[#1A2744] text-sm mt-2 line-clamp-2 leading-snug">{k["Judul"]}</h3>
                        <div className="flex items-center gap-1 mt-2 text-[#6172A0] text-xs">
                          <Clock className="w-3 h-3" />

{formatTanggalIndonesia(k["Tanggal Mulai"])}
{" - "}
{formatTanggalIndonesia(k["Tanggal Selesai"])}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Pengumuman */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#1A2744] flex items-center gap-2.5">
                  <div className="w-1 h-5 rounded-full bg-[#243B88]" />
                  Pengumuman
                </h2>
                <button onClick={() => setPage("pengumuman")} className="flex items-center gap-1 text-[#243B88] text-sm font-semibold hover:gap-2 transition-all">
                  Semua <ArrowRight className="w-4 h-4" />
                </button>
              </div>
                <div className="space-y-3">
                  {pengumuman.slice(0, 4).map((p: any, index: number) => {
                  const cs = catStyle(p["Kategori"] || "Informasi");
                  return (
                    <div
                      key={index}
                      className="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(36,59,136,0.07)] hover:shadow-[0_6px_24px_rgba(36,59,136,0.12)] transition-shadow cursor-pointer"
                      onClick={() => setPage("pengumuman")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: cs.bg, color: cs.text }}>{p["Kategori"] || "Informasi"}</span>
                            {p["Penting"] && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Penting</span>}
                          </div>
                          <h3 className="font-semibold text-[#1A2744] text-sm leading-snug line-clamp-2">{p["Judul"]}</h3>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#6172A0] flex-shrink-0 mt-1" />
                      </div>
                      <div className="flex items-center gap-1 mt-2 text-[#6172A0] text-xs">
                        <Clock className="w-3 h-3" />{formatTanggalIndonesia(p["Tanggal"])}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Gallery strip */}
        <section className="py-8 pb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#1A2744] flex items-center gap-2.5">
              <div className="w-1 h-5 rounded-full bg-[#243B88]" />
              Galeri Foto
            </h2>
            <button onClick={() => setPage("galeri")} className="flex items-center gap-1 text-[#243B88] text-sm font-semibold hover:gap-2 transition-all">
              Semua <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
{(website?.galeri || [])
  .filter((album: any) => album.Aktif === "YA")
  .slice(0, 6)
  .map((album: any, index: number) => (
    <button
      key={index}
      onClick={() => setPage("galeri")}
      className="group relative rounded-2xl overflow-hidden aspect-square bg-[#EEF2FF]"
    >
      <img
        src={album.Thumbnail}
        alt={album["Judul Album"]}
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
      />

      <div className="absolute inset-0 bg-[#1A2744]/0 group-hover:bg-[#1A2744]/50 transition-colors flex items-end p-2">
        <div className="translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all text-left">

          <div className="text-white text-[10px] font-bold leading-tight line-clamp-2">
            {album["Judul Album"]}
          </div>

          <div className="text-white/70 text-[9px]">
            {album["Jumlah Foto"]} Foto
          </div>

        </div>
      </div>
    </button>
))}
          </div>
        </section>
      </div>
    </div>
  )
}

// ── Profil ─────────────────────────────────────────────────
function ProfilPage({
    profil,
    pendudukList,
}:{
    profil:any;
    pendudukList:any[];
}){

  const misi = [
    profil["Misi 1"],
    profil["Misi 2"],
    profil["Misi 3"],
    profil["Misi 4"],
  ].filter(Boolean);
const fileId = profil?.Foto?.match(/\/d\/([^/]+)/)?.[1];

const profilImage = fileId
  ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000`
  : "";

  const potensi: {
    icon: React.ElementType;
    judul: string;
    deskripsi: string;
    color: string;
  }[] = [
    {
      icon: Leaf,
      judul: profil["Potensi 1"] || "Potensi 1",
      deskripsi: "Potensi unggulan Padukuhan Kutu Tegal.",
      color: "#0F766E",
    },
    {
      icon: Award,
      judul: profil["Potensi 2"] || "Potensi 2",
      deskripsi: "Potensi unggulan Padukuhan Kutu Tegal.",
      color: "#D97706",
    },
    {
      icon: Globe,
      judul: profil["Potensi 3"] || "Potensi 3",
      deskripsi: "Potensi unggulan Padukuhan Kutu Tegal.",
      color: "#0369A1",
    },
    {
      icon: Shield,
      judul: profil["Potensi 4"] || "Potensi 4",
      deskripsi: "Potensi unggulan Padukuhan Kutu Tegal.",
      color: "#7C3AED",
    },
  ];
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
{/* Hero */}
<div className="relative rounded-3xl overflow-hidden h-60 sm:h-72 mb-10 bg-[#243B88]">
  
<img
  src={profilImage}
  alt={profil["Nama Padukuhan"]}
    className="absolute inset-0 w-full h-full object-cover opacity-30"
  />

  <div className="absolute inset-0 bg-gradient-to-r from-[#0f1f4d] via-[#243B88]/90 to-transparent" />

  <div className="absolute inset-0 flex items-end p-8 sm:p-10">

    <div>

      <div className="text-white/70 text-sm mb-1">
        {profil?.Kalurahan} · {profil?.Kapanewon} · {profil?.Kabupaten}
      </div>

      <h1 className="text-3xl sm:text-4xl font-black text-white">
        {profil?.["Nama Padukuhan"]}
      </h1>

      <div className="flex flex-wrap gap-2 mt-3">

        <span className="bg-white/15 backdrop-blur text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/20">
          Berdiri {profil?.["Tahun Berdiri"]}
        </span>

        <span className="bg-white/15 backdrop-blur text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/20">
          Luas {profil?.["Luas Wilayah"]}
        </span>

        <span className="bg-white/15 backdrop-blur text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/20">
          Dukuh: {profil?.Dukuh}
        </span>

      </div>

    </div>

  </div>

</div>
<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
  <div className="lg:col-span-2 space-y-6">

    {/* Tentang */}
    <div className="bg-white rounded-3xl p-8 shadow-[0_4px_24px_rgba(36,59,136,0.08)]">
      <SectionTitle title="Tentang Padukuhan" />
      <p className="text-[#475569] leading-relaxed whitespace-pre-line">
        {profil?.Deskripsi}
      </p>
    </div>

    {/* Sejarah */}
    <div className="bg-white rounded-3xl p-8 shadow-[0_4px_24px_rgba(36,59,136,0.08)]">
      <SectionTitle title="Sejarah" />
      <p className="text-[#475569] leading-relaxed whitespace-pre-line">
        {profil?.Sejarah}
      </p>
    </div>

    {/* Visi Misi */}
    <div className="bg-white rounded-3xl p-8 shadow-[0_4px_24px_rgba(36,59,136,0.08)]">

      <SectionTitle title="Visi & Misi" />

      <h3 className="font-bold text-[#243B88] text-base mb-2">
        Visi
      </h3>

      <div className="bg-[#EEF2FF] rounded-2xl p-5 text-[#243B88] font-semibold leading-relaxed border border-[#D8E0FF] mb-6">
        {profil?.Visi}
      </div>

      <h3 className="font-bold text-[#243B88] text-base mb-4">
        Misi
      </h3>

      <ol className="space-y-3">
        {misi.map((m, i) => (
          <li key={i} className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-lg bg-[#243B88] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              {i + 1}
            </div>

            <span className="text-[#475569] text-sm leading-relaxed">
              {m}
            </span>

          </li>
        ))}
      </ol>

    </div>

    {/* Potensi */}
    <div className="bg-white rounded-3xl p-8 shadow-[0_4px_24px_rgba(36,59,136,0.08)]">

      <SectionTitle title="Potensi Padukuhan" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {potensi.map((p) => {

          const Icon = p.icon;

          return (

            <div
              key={p.judul}
              className="bg-[#F8FAFF] rounded-2xl p-5 border border-[#EEF2FF] hover:border-[#C7D7FF] transition-colors"
            >

              <div
                className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center"
                style={{ backgroundColor: p.color + "18" }}
              >

                <Icon
                  className="w-5 h-5"
                  style={{ color: p.color }}
                />

              </div>

              <h4 className="font-bold text-[#1A2744] mb-1.5">
                {p.judul}
              </h4>

              {p.deskripsi && (
                <p className="text-[#6172A0] text-sm leading-relaxed">
                  {p.deskripsi}
                </p>
              )}

            </div>

          );

        })}

      </div>

    </div>

  </div>

        {/* Sidebar */}
        <div className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(36,59,136,0.08)]">
          <h3 className="font-bold text-[#1A2744] mb-4">Informasi Wilayah</h3>

          <div className="space-y-0">
            {[
              ["Dukuh", profil["Dukuh"]],
              ["Kalurahan", profil["Kalurahan"]],
              ["Kapanewon", profil["Kapanewon"]],
              ["Kabupaten", profil["Kabupaten"]],
              ["Provinsi", profil["Provinsi"]],
              ["Tahun Berdiri", profil["Tahun Berdiri"]],
              ["Luas Wilayah", profil["Luas Wilayah"]],
              ["Jumlah RT", profil["RT"]],
              ["Jumlah RW", profil["RW"]],
              ["Alamat", profil["Alamat"]],
              ["Telepon", profil["Telepon"]],
              ["Email", profil["Email"]],
            ].map(([k, v]) => (
              <div
                key={String(k)}
                className="flex items-start justify-between gap-2 py-2.5 border-b border-[#F1F5F9] last:border-0 text-sm"
              >
                <span className="text-[#6172A0] flex-shrink-0">{k}</span>

                <span className="font-semibold text-[#1A2744] text-right">
                  {v || "-"}
                </span>
              </div>
            ))}
          </div>
        </div>

          {/* Map */}
          <div className="bg-white rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(36,59,136,0.08)]">
            <div className="px-5 py-4 border-b border-[#EEF2FF] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#243B88]" />
              <h3 className="font-bold text-[#1A2744] text-sm">Lokasi Padukuhan</h3>
            </div>
            <div className="relative h-48 bg-[#EEF2FF]">
              <iframe
                src="https://maps.google.com/maps?q=Sinduadi,Mlati,Sleman&t=&z=14&ie=UTF8&iwloc=&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                title="Peta Padukuhan Kutu Tegal"
              />
            </div>
            <div className="px-5 py-3">
              <p className="text-[#6172A0] text-xs">Dusun Kutu Tegal, Sinduadi, Mlati, Sleman, DIY 55561</p>
            </div>
          </div>
        </div>
      </div>
  )
}

// ─────────────────────────────────────────────
// Data Penduduk
// ─────────────────────────────────────────────
function PendudukPage({
  pendudukList,
}: {
  pendudukList: any[];
}) {
  const [filterRT, setFilterRT] = useState("semua");
  const [filterGender, setFilterGender] = useState("semua");
  const [filterGenerasi, setFilterGenerasi] = useState("semua");
  const [search, setSearch] = useState("");

  // ======================================================
  // Distribusi Usia
  // ======================================================
  const USIA_DATA = React.useMemo(() => {
    const data = [
      { name: "0–12", value: 0 },
      { name: "13–17", value: 0 },
      { name: "18–25", value: 0 },
      { name: "26–40", value: 0 },
      { name: "41–60", value: 0 },
      { name: ">60", value: 0 },
    ];

    pendudukList.forEach((p: any) => {
      const tgl = p["Kelahiran"];

      if (!tgl) return;

      const match = String(tgl).match(/\d{4}$/);
      if (!match) return;

      const tahun = Number(match[0]);
      const umur = new Date().getFullYear() - tahun;

      if (umur <= 12) data[0].value++;
      else if (umur <= 17) data[1].value++;
      else if (umur <= 25) data[2].value++;
      else if (umur <= 40) data[3].value++;
      else if (umur <= 60) data[4].value++;
      else data[5].value++;
    });

    return data;
  }, [pendudukList]);

  // ======================================================
  // Gender
  // ======================================================
  const GENDER_DATA = React.useMemo(() => {
    let laki = 0;
    let perempuan = 0;

    pendudukList.forEach((p: any) => {
      const jk = String(p["Jenis Kelamin"] || "").toLowerCase();

      if (jk.includes("laki")) laki++;
      else if (jk.includes("perempuan")) perempuan++;
    });

    return [
      {
        name: "Laki-laki",
        value: laki,
        color: "#243B88",
      },
      {
        name: "Perempuan",
        value: perempuan,
        color: "#7C9EF8",
      },
    ];
  }, [pendudukList]);

  // ======================================================
  // Statistik RT
  // ======================================================
const RT_BAR_DATA = React.useMemo(() => {
  console.table(
    pendudukList.map((p: any) => ({
      RT: p["RT"],
      Nama: p["Nama"],
    }))
  );

  const rtMap: Record<
    string,
    {
      rt: string;
      penduduk: number;
      kk: number;
    }
  > = {};

  pendudukList.forEach((p: any) => {
    const rtNumber = Number(p["RT"]);

    if (!rtNumber || rtNumber < 1 || rtNumber > 13) {
      console.warn("RT Tidak Valid:", p);
      return;
    }

    const key = String(rtNumber);

    if (!rtMap[key]) {
      rtMap[key] = {
        rt: `RT ${String(rtNumber).padStart(2, "0")}`,
        penduduk: 0,
        kk: 0,
      };
    }

    rtMap[key].penduduk++;

    if (
      String(p["Status Keluarga"] || "")
        .toLowerCase()
        .includes("kepala")
    ) {
      rtMap[key].kk++;
    }
  });

  return Object.values(rtMap).sort(
    (a, b) =>
      Number(a.rt.replace("RT ", "")) -
      Number(b.rt.replace("RT ", ""))
  );
}, [pendudukList]);

  // ======================================================
  // Filter Data
  // ======================================================
  const filtered = pendudukList.filter((p: any) => {
    if (
      filterRT !== "semua" &&
      String(p["RT"]) !== filterRT.replace("RT ", "")
    ) {
      return false;
    }

    if (
      filterGender !== "semua" &&
      String(p["Jenis Kelamin"]) !==
        (filterGender === "L" ? "Laki-Laki" : "Perempuan")
    ) {
      return false;
    }

    if (
      filterGenerasi !== "semua" &&
      String(p["Generasi"]) !== filterGenerasi
    ) {
      return false;
    }

    if (
      search &&
      !String(p["Nama"])
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      !String(p["NIK"]).includes(search)
    ) {
      return false;
    }

    return true;
  });

  // ======================================================
  // Ringkasan
  // ======================================================
  const totalPenduduk = filtered.length;

  const totalKK = filtered.filter((p: any) =>
    String(p["Status Keluarga"] || "")
      .toLowerCase()
      .includes("kepala")
  ).length;

  const laki = filtered.filter((p: any) =>
    String(p["Jenis Kelamin"] || "")
      .toLowerCase()
      .includes("laki")
  ).length;

  const perempuan = filtered.filter((p: any) =>
    String(p["Jenis Kelamin"] || "")
      .toLowerCase()
      .includes("perempuan")
  ).length;

  // ===========================
  // return (
  //   ....
  // )
  // ===========================

  const selectCls = "px-3.5 py-2.5 rounded-xl bg-[#F8FAFF] border border-[#EEF2FF] text-sm text-[#1A2744] focus:outline-none focus:border-[#243B88] transition-colors cursor-pointer"

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[#1A2744]">Data Penduduk</h1>
        <p className="text-[#6172A0] mt-1">Informasi kependudukan Padukuhan Kutu Tegal</p>
      </div>

{/* Stats */}
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
  <StatCard
    icon={Users}
    label="Total Penduduk"
    value={totalPenduduk.toLocaleString("id-ID")}
    color="#243B88"
  />

  <StatCard
    icon={Home}
    label="Kepala Keluarga"
    value={totalKK.toLocaleString("id-ID")}
    color="#0F766E"
  />

  <StatCard
    icon={TrendingUp}
    label="Laki-laki"
    value={laki.toLocaleString("id-ID")}
    color="#7C3AED"
  />

  <StatCard
    icon={Heart}
    label="Perempuan"
    value={perempuan.toLocaleString("id-ID")}
    color="#DB2777"
  />
</div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(36,59,136,0.08)]">
          <h3 className="font-bold text-[#1A2744] mb-5">Distribusi Usia Penduduk</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={USIA_DATA} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6172A0", fontFamily: "Poppins" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6172A0", fontFamily: "Poppins" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(36,59,136,0.15)", fontFamily: "Poppins", fontSize: 13 }}
                cursor={{ fill: "#EEF2FF" }}
              />
              <Bar dataKey="value" name="Jiwa" fill="#243B88" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(36,59,136,0.08)]">
          <h3 className="font-bold text-[#1A2744] mb-4">Jenis Kelamin</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={GENDER_DATA} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={68} innerRadius={38} paddingAngle={3}>
                {GENDER_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(36,59,136,0.15)", fontFamily: "Poppins", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2.5 mt-1">
            {GENDER_DATA.map((g: any) => (
              <div key={g.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                  <span className="text-[#475569]">{g.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-[#1A2744]">{g.value}</span>
                  <span className="text-[#6172A0] text-xs ml-1">({((g.value / 1247) * 100).toFixed(1)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Per RT */}
      <div className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(36,59,136,0.08)] mb-8">
        <h3 className="font-bold text-[#1A2744] mb-5">Jumlah Penduduk & KK per RT</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={RT_BAR_DATA} barSize={22} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="rt" tick={{ fontSize: 12, fill: "#6172A0", fontFamily: "Poppins" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#6172A0", fontFamily: "Poppins" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(36,59,136,0.15)", fontFamily: "Poppins", fontSize: 13 }} cursor={{ fill: "#EEF2FF" }} />
            <Bar dataKey="penduduk" name="Penduduk" fill="#243B88" radius={[5, 5, 0, 0]} />
            <Bar dataKey="kk" name="KK" fill="#7C9EF8" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-[0_4px_24px_rgba(36,59,136,0.08)] overflow-hidden">
        <div className="p-6 border-b border-[#F1F5F9]">
          <h3 className="font-bold text-[#1A2744] mb-4">Daftar Penduduk</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6172A0]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari nama atau NIK..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F8FAFF] border border-[#EEF2FF] text-sm text-[#1A2744] placeholder-[#94A3B8] focus:outline-none focus:border-[#243B88] transition-colors"
              />
            </div>
            <select value={filterRT} onChange={e => setFilterRT(e.target.value)} className={selectCls}>
              <option value="semua">Semua RT</option>
              {["RT 01", "RT 02", "RT 03", "RT 04", "RT 05"].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className={selectCls}>
              <option value="semua">Semua Gender</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
            <select value={filterGenerasi} onChange={e => setFilterGenerasi(e.target.value)} className={selectCls}>
              <option value="semua">Semua Generasi</option>
              {["Boomer", "Gen X", "Milenial", "Gen Z"].map((g: any) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <p className="text-xs text-[#6172A0] mt-2.5">Menampilkan {filtered.length} dari {pendudukList.length} data sampel</p>
        </div>

{/* Informasi Privasi */}
<div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-center">
  <Shield className="w-10 h-10 mx-auto text-[#243B88] mb-3" />

  <h3 className="text-xl font-bold text-[#1A2744]">
    Data Penduduk Bersifat Privat
  </h3>

  <p className="text-[#6172A0] mt-2 max-w-2xl mx-auto">
    Untuk menjaga keamanan dan privasi warga Padukuhan Kutu Tegal,
    data individu seperti nama, NIK, alamat, dan informasi pribadi
    tidak ditampilkan pada website publik.
  </p>
</div>
      </div>
    </div>
  )
}

// ── Kegiatan ───────────────────────────────────────────────
function getImageUrl(url: string) {
  if (!url) return "";

  const match = url.match(/\/d\/([^/]+)/);

  if (match) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
  }

  return url;
}
function KegiatanPage({
    kegiatan,
}:{
    kegiatan:any[]
}) {
  const [selected, setSelected] = useState<any>(null)

  if (selected) {
    const cs = catStyle(selected["Kategori"] || "Umum")
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-[#243B88] font-semibold mb-6 hover:gap-3 transition-all text-sm">
          <ChevronLeft className="w-5 h-5" /> Kembali ke Daftar Kegiatan
        </button>
<div className="bg-white rounded-3xl overflow-hidden shadow-[0_4px_32px_rgba(36,59,136,0.12)]">
  <div className="relative h-64 sm:h-80 bg-[#EEF2FF]">

    <img
      src={getImageUrl(selected["Foto"])}
      alt={selected["Judul"]}
      className="w-full h-full object-cover"
    />

    <div className="absolute inset-0 bg-gradient-to-t from-[#1A2744]/70 to-transparent" />

    <div className="absolute bottom-6 left-6 right-6">

      <span
        className="text-xs font-bold px-3 py-1.5 rounded-full inline-block mb-3"
        style={{
          backgroundColor: cs.bg,
          color: cs.text,
        }}
      >
        {selected["Kategori"]}
      </span>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
        {selected["Judul"]}
      </h1>

    </div>
  </div>

  <div className="p-8">

    <div className="flex flex-wrap gap-5 mb-6 pb-6 border-b border-[#F1F5F9]">

          <div className="flex items-center gap-2 text-[#475569] text-sm">
      <Clock className="w-4 h-4 text-[#243B88]" />
      {formatTanggalIndonesia(selected["Tanggal Mulai"])}
      {" - "}
      {formatTanggalIndonesia(selected["Tanggal Selesai"])}
      {" • "}
      {selected["Jam"]}
    </div>

      <div className="flex items-center gap-2 text-[#475569] text-sm">
        <MapPin className="w-4 h-4 text-[#243B88]" />
        {selected["Lokasi"]}
      </div>

      <div className="flex items-center gap-2 text-[#475569] text-sm">
        <Users className="w-4 h-4 text-[#243B88]" />
        {selected["Peserta"]}
      </div>

    </div>

    <p className="text-[#475569] leading-relaxed text-base">
      {selected["Deskripsi"]}
    </p>

  </div>
</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-[#1A2744]">Kegiatan Padukuhan</h1>
        <p className="text-[#6172A0] mt-1">Aktivitas dan kegiatan warga Padukuhan Kutu Tegal</p>
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-4 sm:left-7 top-2 bottom-2 w-px bg-gradient-to-b from-[#243B88] via-[#C7D7FF] to-transparent" />
        <div className="space-y-8">
                {kegiatan.map((k, index) => {
            const cs = catStyle(k["Kategori"] || "Umum");

            const status = getStatusKegiatan(
  k["Tanggal Mulai"],
  k["Tanggal Selesai"]
);

            return (
          <div key={index} className="relative pl-12 sm:pl-20">
            <div
className={`absolute left-1.5 sm:left-4 top-5 w-5 h-5 rounded-full border-4 border-white shadow-[0_0_0_3px_#D0D9FF] z-10 ${
  status === "akan"
    ? "bg-blue-600"
    : status === "berlangsung"
    ? "bg-green-500"
    : "bg-gray-400"
}`}
/>
            <div className="absolute left-[3.25rem] sm:left-[4.85rem] top-6 h-px w-4 bg-[#C7D7FF]" />

          <button
            onClick={() => setSelected(k)}
className={`w-full rounded-3xl overflow-hidden transition-all group shadow-[0_4px_20px_rgba(36,59,136,0.07)]
${
  status === "selesai"
    ? "bg-gray-50 opacity-75"
    : status === "berlangsung"
    ? "bg-green-50 border border-green-200"
    : "bg-white border border-blue-100"
}
hover:shadow-[0_8px_32px_rgba(36,59,136,0.14)]`}
          >
              <div className="flex flex-col sm:flex-row">

                <div className="w-full sm:w-52 h-44 sm:h-auto flex-shrink-0 bg-[#EEF2FF] overflow-hidden">
  <img
    src={getImageUrl(k["Foto"])}
    alt={k["Judul"]}
    className="w-full h-full object-cover"
  />
</div>

                <div className="p-6 flex-1">

                  <div className="flex items-start justify-between mb-3">
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{
                        backgroundColor: cs.bg,
                        color: cs.text,
                      }}
                    >
                      {k["Kategori"]}
                    </span>

                    <span className="text-xs text-[#6172A0] flex items-center gap-1 flex-shrink-0 ml-2">
                      <Clock className="w-3 h-3" />
                      {formatTanggalIndonesia(k["Tanggal Mulai"])}
                      {" - "}
                      {formatTanggalIndonesia(k["Tanggal Selesai"])}
                      {" • "}
                      {k["Jam"]}
                    </span>
</div>

<div className="flex items-center gap-2 mb-2">
  {status === "akan" && (
    <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
      📅 Akan Datang
    </span>
  )}

  {status === "berlangsung" && (
    <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
      🟢 Sedang Berlangsung
    </span>
  )}

  {status === "selesai" && (
    <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">
      ✓ Selesai
    </span>
  )}
</div>

<h3 className="font-extrabold text-[#1A2744] text-lg mb-2 group-hover:text-[#243B88] transition-colors leading-snug">
  {k["Judul"]}
</h3>

<p className="text-[#6172A0] text-sm leading-relaxed mb-4 line-clamp-2">
  {k["Ringkasan"]}
</p>

                  <div className="flex flex-wrap gap-4 text-xs text-[#6172A0] mb-4">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {k["Lokasi"]}
                    </span>

                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      {k["Peserta"]}
                    </span>
                  </div>

                  <span className="text-[#243B88] text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                    Baca Selengkapnya
                    <ChevronRight className="w-4 h-4" />
                  </span>

                </div>
              </div>
            </button>
          </div>
        )
      })}
        </div>
      </div>
    </div>
  )
}

// ── Pengumuman ─────────────────────────────────────────────
function PengumumanPage({
  pengumuman,
}: {
  pengumuman: any[];
}) {
  const [expanded, setExpanded] = useState<number | null>(0);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-[#1A2744]">
          Pengumuman
        </h1>
        <p className="text-[#6172A0] mt-1">
          Informasi dan pengumuman resmi Padukuhan Kutu Tegal
        </p>
      </div>

      <div className="space-y-4">
        {pengumuman.map((p: any, index: number) => {
          const cs = catStyle(p["Kategori"] || "Informasi");
          const isOpen = expanded === index;

          return (
            <div
              key={index}
              className={`bg-white rounded-3xl shadow-[0_4px_20px_rgba(36,59,136,0.07)] overflow-hidden transition-all ${
                String(p["Penting"] || "").toUpperCase() === "YA"
                  ? "border-l-[5px] border-[#243B88]"
                  : ""
              }`}
            >
              <button
                onClick={() =>
                  setExpanded(isOpen ? null : index)
                }
                className="w-full p-6 text-left hover:bg-[#FAFBFF] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">

                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{
                          backgroundColor: cs.bg,
                          color: cs.text,
                        }}
                      >
                        {p["Kategori"]}
                      </span>

                      {String(p["Penting"] || "").toUpperCase() === "YA" && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-600 flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          Penting
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-[#1A2744] text-base sm:text-lg leading-snug">
                      {p["Judul"]}
                    </h3>

                    <div className="flex items-center gap-1.5 mt-2 text-[#6172A0] text-xs">
                      <Clock className="w-3 h-3" />
                      {formatTanggalIndonesia(p["Tanggal"])}
                    </div>
                  </div>

                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#EEF2FF] transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  >
                    <ChevronDown className="w-4 h-4 text-[#243B88]" />
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="px-6 pb-6">
                  <div className="border-t border-[#F1F5F9] pt-4">

                    <p className="text-[#475569] leading-relaxed text-sm sm:text-base">
                      {p["Isi"]}
                    </p>

                    {p["File"] ? (
                      <a
                        href={p["File"]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-5 inline-flex items-center gap-2 bg-[#243B88] text-white text-sm font-bold px-5 py-2.5 rounded-2xl hover:bg-[#1a2d6e] transition-colors shadow-sm"
                      >
                        <Download className="w-4 h-4" />
                        Unduh Dokumen
                      </a>
                    ) : (
                      <div className="mt-5 text-sm text-gray-500 italic">
                        Tidak ada lampiran dokumen.
                      </div>
                    )}

                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Galeri ─────────────────────────────────────────────────
function GaleriPage({
  galeri,
}: {
  galeri: any[];
}) {
  console.log("GALERI", galeri);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null)
  const [lightboxIdx, setLightboxIdx] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const openLightbox = (idx: number) => { setLightboxIdx(idx); setLightboxOpen(true) }
  const closeLightbox = () => setLightboxOpen(false)
  const prev = () => {
    if (!selectedAlbum) return
    setLightboxIdx(i => (i - 1 + selectedAlbum.fotos.length) % selectedAlbum.fotos.length)
  }
  const next = () => {
    if (!selectedAlbum) return
    setLightboxIdx(i => (i + 1) % selectedAlbum.fotos.length)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
      {/* Lightbox */}
      {lightboxOpen && selectedAlbum && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button onClick={closeLightbox} className="absolute top-5 right-5 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/25 transition-colors z-10">
            <X className="w-5 h-5" />
          </button>
          <button onClick={e => { e.stopPropagation(); prev() }} className="absolute left-4 sm:left-6 w-11 h-11 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/25 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
{selectedAlbum.fotos[lightboxIdx]?.type === "video" ? (
  <div
    className="max-w-[88vw] max-h-[85vh]"
    onClick={(e) => e.stopPropagation()}
  >
    <video
      controls
      autoPlay
      playsInline
      preload="metadata"
      className="max-w-[88vw] max-h-[85vh] object-contain rounded-2xl"
    >
      <source
        src={selectedAlbum.fotos[lightboxIdx].url}
        type="video/mp4"
      />
      Browser Anda tidak mendukung video.
    </video>
  </div>
) : (
  <img
    src={selectedAlbum.fotos[lightboxIdx].url}
    alt={`${selectedAlbum.nama} media ${lightboxIdx + 1}`}
    className="max-w-[88vw] max-h-[85vh] object-contain rounded-2xl"
    onClick={(e) => e.stopPropagation()}
  />
)}
          <button onClick={e => { e.stopPropagation(); next() }} className="absolute right-4 sm:right-6 w-11 h-11 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/25 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-5 text-white/50 text-sm font-medium">
            {lightboxIdx + 1} / {selectedAlbum.fotos.length}
          </div>
        </div>
      )}

      {selectedAlbum ? (
        <div>
          <button onClick={() => setSelectedAlbum(null)} className="flex items-center gap-2 text-[#243B88] font-semibold mb-6 hover:gap-3 transition-all text-sm">
            <ChevronLeft className="w-5 h-5" /> Kembali ke Album
          </button>
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-[#1A2744]">{selectedAlbum.nama}</h1>
            <p className="text-[#6172A0] text-sm mt-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />{selectedAlbum.tanggal}
              <span className="mx-2 text-[#C7D7FF]">·</span>
              <Camera className="w-3.5 h-3.5" />{selectedAlbum.jumlah} foto
            </p>
          </div>
          <div className="columns-2 md:columns-3 gap-3 space-y-3">
{selectedAlbum.fotos.map((media, i) => (
  <div key={i} className="break-inside-avoid">
    <button
      onClick={() => openLightbox(i)}
      className="group relative block w-full rounded-2xl overflow-hidden"
    >
<div className="relative">

  <img
    src={media.thumbnail}
    alt={`${selectedAlbum.nama} ${i + 1}`}
    className="w-full rounded-2xl"
  />

  {media.type === "video" && (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center">
        <Play className="w-7 h-7 text-white fill-white" />
      </div>
    </div>
  )}

</div>
    </button>
  </div>
))}
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-10">
            <h1 className="text-3xl font-black text-[#1A2744]">Galeri Foto</h1>
            <p className="text-[#6172A0] mt-1">Album dokumentasi kegiatan Padukuhan Kutu Tegal</p>
          </div>
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

  {galeri
    .filter((album: any) => album.Aktif === "YA")
    .map((album: any, index: number) => (

      <button
        key={index}
        onClick={() =>
          setSelectedAlbum({
            id: index,
            nama: album["Judul Album"],
            tanggal: album.Tanggal,
            jumlah: Number(album["Jumlah Foto"]),
            cover: album.Thumbnail,
            fotos: album.Foto || [],
          })
        }
        className="group bg-white rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(36,59,136,0.08)] hover:shadow-[0_8px_36px_rgba(36,59,136,0.15)] hover:-translate-y-1.5 transition-all text-left"
      >

        <div className="relative h-52 overflow-hidden bg-[#EEF2FF]">

          <img
            src={album.Thumbnail}
            alt={album["Judul Album"]}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />

          <div className="absolute top-3 right-3 bg-[#1A2744]/65 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5" />
            {album["Jumlah Foto"]} Foto
          </div>

        </div>

        <div className="p-5">

          <h3 className="font-extrabold text-[#1A2744] text-base">
            {album["Judul Album"]}
          </h3>

          <p className="text-[#6172A0] text-sm mt-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {album.Tanggal}
          </p>

        </div>

      </button>

    ))}

</div>
        </div>
      )}
    </div>
  )
}

// ── Struktur RT ────────────────────────────────────────────
function StrukturRTPage({
  strukturRT,
  pendudukList,
  profil,
  statistik,
  setSelectedRT,
  setPage,
}: {
  strukturRT: any[];
  pendudukList: any[];
  profil: any;
  statistik: any;
  setSelectedRT: (rt: any) => void;
  setPage: (p: Page) => void;
}) {

  const openDetail = (rt: any) => {
    setSelectedRT(rt);
    setPage("detail-rt");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-[#1A2744]">Struktur RT</h1>
        <p className="text-[#6172A0] mt-1">Organisasi Rukun Tetangga Padukuhan Kutu Tegal</p>
      </div>

      {/* Dukuh banner */}
      <div className="relative bg-[#243B88] rounded-3xl p-8 sm:p-10 text-white mb-10 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 80% 50%, white 0%, transparent 65%)" }} />
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-white/5 rounded-full" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="text-white/60 text-sm mb-1 font-medium">Padukuhan Kutu Tegal</div>
            <h2 className="text-2xl sm:text-3xl font-extrabold">Pengurus Padukuhan</h2>
            <div className="mt-4 space-y-1.5">
              <div className="text-sm text-white/80">
                Kepala Dukuh:
                <span className="font-bold text-white">
                  {" "}{profil["Dukuh"]}
                </span>
              </div>

              <div className="text-sm text-white/80">
                Kontak:
                <span className="font-bold text-white">
                  {" "}{profil["Telepon"]}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-8 sm:gap-12 flex-shrink-0">
            {[
              [strukturRT.length,"RT"],
              [profil["RW"] || "-", "RW"],
              [statistik.totalKK,"KK"],
              [statistik.totalPenduduk,"Jiwa"]
              ].map(([v, l]) => (
              <div key={l} className="text-center">
                <div className="text-3xl font-black">{v}</div>
                <div className="text-white/60 text-xs mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {strukturRT.map((rt: any, index: number) => {

        const dataRT = pendudukList.filter(
          (p: any) =>
            String(p["RT"]).padStart(2, "0") ===
            String(rt["RT"]).padStart(2, "0")
        );

        const jumlahPenduduk = dataRT.length;

        const jumlahKK = dataRT.filter((p: any) =>
          String(p["Status Keluarga"] || "")
            .toLowerCase()
            .includes("kepala")
        ).length;

        const jumlahLaki = dataRT.filter((p: any) =>
          String(p["Jenis Kelamin"] || "")
            .toLowerCase()
            .includes("laki")
        ).length;

        const jumlahPerempuan = dataRT.filter((p: any) =>
          String(p["Jenis Kelamin"] || "")
            .toLowerCase()
            .includes("perempuan")
        ).length;

        return (
          <div
            key={index}
            className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(36,59,136,0.08)] hover:shadow-[0_8px_36px_rgba(36,59,136,0.14)] transition-all hover:-translate-y-1 flex flex-col"
          >

            <div className="flex items-start justify-between mb-5">
              <div className="w-14 h-14 bg-[#EEF2FF] rounded-2xl flex items-center justify-center">
                <span className="text-[#243B88] font-extrabold text-xl">
                  {rt["RT"]}
                </span>
              </div>

              <span className="text-xs font-bold bg-[#243B88] text-white px-3 py-1 rounded-full">
                RT {rt["RT"]}
              </span>
            </div>

            <h3 className="font-extrabold text-[#1A2744] text-lg mb-1">
              RT {rt["RT"]}
            </h3>

            <div className="text-[#6172A0] text-sm mb-0.5">
              Ketua :
              <span className="font-bold text-[#1A2744]">
                {" "}
                {rt["Ketua"]}
              </span>
            </div>

            <div className="text-[#6172A0] text-sm mb-4">
              Wilayah :
              <span className="text-[#475569] font-medium">
                {" "}
                {rt["Wilayah"]}
              </span>
            </div>

            <p className="text-[#6172A0] text-sm leading-relaxed mb-5 line-clamp-2 flex-1">
              {rt["Deskripsi"] || "Belum ada deskripsi wilayah RT."}
            </p>

            <div className="grid grid-cols-3 gap-2 mb-5">

              <div className="bg-[#F8FAFF] rounded-xl p-3 text-center">
                <div className="font-extrabold text-[#1A2744] text-sm">
                  {jumlahKK}
                </div>
                <div className="text-[#6172A0] text-[10px] mt-0.5">
                  KK
                </div>
              </div>

              <div className="bg-[#F8FAFF] rounded-xl p-3 text-center">
                <div className="font-extrabold text-[#1A2744] text-sm">
                  {jumlahPenduduk}
                </div>
                <div className="text-[#6172A0] text-[10px] mt-0.5">
                  Penduduk
                </div>
              </div>

              <div className="bg-[#F8FAFF] rounded-xl p-3 text-center">
                <div className="font-extrabold text-[#1A2744] text-sm">
                  {jumlahLaki}/{jumlahPerempuan}
                </div>
                <div className="text-[#6172A0] text-[10px] mt-0.5">
                  L / P
                </div>
              </div>

            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">

              <div className="flex items-center gap-1.5 text-[#6172A0] text-xs">
                <Phone className="w-3.5 h-3.5" />
                {rt["Telepon"]}
              </div>

              <button
                onClick={() => openDetail(rt)}
                className="flex items-center gap-1.5 bg-[#243B88] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#1a2d6e] transition-colors"
              >
                Detail
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

            </div>

          </div>
        );

      })}
      </div>
    </div>
  )
}

// ── Detail RT ──────────────────────────────────────────────
function DetailRTPage({
  rt,
  pendudukList,
  setPage,
}: {
  rt: any;
  pendudukList: any[];
  setPage: (p: Page) => void;
}) {
  const nomorRT = Number(String(rt["RT"] || "").replace(/\D/g, ""));

const pendudukRT = pendudukList.filter((p: any) => {
  const rtPenduduk = Number(String(p["RT"] || "").replace(/\D/g, ""));
  return rtPenduduk === nomorRT;
});

const totalPenduduk = pendudukRT.length;

const totalKK = pendudukRT.filter((p: any) =>
  String(p["Status Keluarga"] || "")
    .toLowerCase()
    .includes("kepala")
).length;

const laki = pendudukRT.filter((p: any) =>
  String(p["Jenis Kelamin"] || "")
    .toLowerCase()
    .includes("laki")
).length;

const perempuan = pendudukRT.filter((p: any) =>
  String(p["Jenis Kelamin"] || "")
    .toLowerCase()
    .includes("perempuan")
).length;
  const genderData = [
  {
    name: "Laki-laki",
    value: laki,
    color: "#243B88",
  },
  {
    name: "Perempuan",
    value: perempuan,
    color: "#BDB277",
  },
];
const generasiData = [
  {
    name: "Boomer",
    value: pendudukRT.filter((p:any)=>
      String(p["Generasi"]||"").includes("Boomer")
    ).length,
  },
  {
    name: "Gen X",
    value: pendudukRT.filter((p:any)=>
      String(p["Generasi"]||"").includes("Gen X")
    ).length,
  },
  {
    name: "Milenial",
    value: pendudukRT.filter((p:any)=>
      String(p["Generasi"]||"").includes("Millennial") ||
      String(p["Generasi"]||"").includes("Milenial")
    ).length,
  },
  {
    name: "Gen Z",
    value: pendudukRT.filter((p:any)=>
      String(p["Generasi"]||"").includes("Gen Z")
    ).length,
  },
  {
    name: "Alpha",
    value: pendudukRT.filter((p:any)=>
      String(p["Generasi"]||"").includes("Alpha")
    ).length,
  },
];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
      <button onClick={() => setPage("struktur-rt")} className="flex items-center gap-2 text-[#243B88] font-semibold mb-6 hover:gap-3 transition-all text-sm">
        <ChevronLeft className="w-5 h-5" /> Kembali ke Struktur RT
      </button>

      {/* Header */}
      <div className="relative bg-[#243B88] rounded-3xl p-8 sm:p-10 text-white mb-8 overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 75% 50%, rgba(124,158,248,0.25) 0%, transparent 60%)" }} />
        <div className="relative">
          <div className="text-white/60 text-sm mb-1">Padukuhan Kutu Tegal</div>
          <h1 className="text-3xl sm:text-4xl font-black">
  RT {rt["RT"]}
</h1>
          <div className="text-white/80 mt-1">{rt["Wilayah"]}</div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-4 text-sm text-white/80">
            <div>Ketua RT:
<span className="font-bold text-white">
  {rt["Ketua"] || "-"}
</span></div>
            <div>Kontak:
<span className="font-bold text-white">
  {rt["Kontak"] || "-"}
</span></div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Home} label="Kepala Keluarga" value={totalKK} color="#243B88" />
        <StatCard icon={Users} label="Total Penduduk" value={totalPenduduk} color="#0F766E" />
        <StatCard icon={TrendingUp} label="Laki-laki" value={laki} color="#7C3AED" />
        <StatCard icon={Heart} label="Perempuan" value={perempuan} color="#DB2777" />
      </div>

      {/* Charts + info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(36,59,136,0.08)]">
          <h3 className="font-bold text-[#1A2744] mb-4">Komposisi Gender</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={genderData} dataKey="value" cx="50%" cy="50%" outerRadius={68} innerRadius={38} paddingAngle={3}>
                {genderData.map((e: any, i: number) => (
    <Cell key={i} fill={e.color} />
))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(36,59,136,0.15)", fontFamily: "Poppins", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2.5 mt-2">
            {genderData.map((g: any) => (
              <div key={g.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                  <span className="text-[#475569]">{g.name}</span>
                </div>
                <span className="font-bold text-[#1A2744]">{g.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(36,59,136,0.08)]">
          <h3 className="font-bold text-[#1A2744] mb-4">Distribusi Generasi</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={generasiData} barSize={20} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#6172A0" }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#6172A0" }} axisLine={false} tickLine={false} width={50} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(36,59,136,0.15)", fontFamily: "Poppins", fontSize: 12 }} cursor={{ fill: "#EEF2FF" }} />
              <Bar dataKey="value" name="Jiwa" fill="#243B88" radius={[0, 5, 5, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(36,59,136,0.08)]">
          <h3 className="font-bold text-[#1A2744] mb-4">
  Info RT {rt["RT"]}
</h3>
          <p className="text-[#475569] text-sm leading-relaxed mb-5">{rt["Deskripsi"] || "Belum ada deskripsi wilayah RT."}</p>
          <div className="space-y-2">
            {[
              ["Nomor RT", `RT ${rt["RT"]}`],
              ["Wilayah", rt["Wilayah"]],
              ["Ketua", rt["Ketua"]],
              ["Kontak", rt["Kontak"]],
              ["Total KK", `${totalKK} KK`],
              ["Total Penduduk", `${totalPenduduk} jiwa`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs py-2 border-b border-[#F8FAFF] last:border-0">
                <span className="text-[#6172A0]">{k}</span>
                <span className="font-semibold text-[#1A2744]">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Residents table */}
      <div className="bg-white rounded-3xl shadow-[0_4px_24px_rgba(36,59,136,0.08)] overflow-hidden">
        <div className="p-8 text-center">

          <div className="w-20 h-20 mx-auto rounded-full bg-[#EEF2FF] flex items-center justify-center mb-6">
            <Users className="w-10 h-10 text-[#243B88]" />
          </div>

          <h3 className="text-2xl font-bold text-[#1A2744] mb-3">
            Data Individu Tidak Ditampilkan
          </h3>

          <p className="text-[#6172A0] leading-relaxed max-w-2xl mx-auto">
            Untuk menjaga privasi warga Padukuhan Kutu Tegal, data individu seperti
            nama, NIK, tanggal lahir, dan informasi pribadi lainnya tidak
            ditampilkan pada website publik.
          </p>

          <p className="text-[#6172A0] leading-relaxed mt-3 max-w-2xl mx-auto">
            Website ini hanya menyajikan informasi kependudukan dalam bentuk
            statistik, grafik, dan rekapitulasi sehingga tetap bermanfaat sebagai
            media informasi tanpa mengungkap data pribadi warga.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">

            <div className="bg-[#F8FAFF] rounded-2xl p-5">
              <div className="text-2xl font-bold text-[#243B88]">
                {totalPenduduk}
              </div>
              <div className="text-sm text-[#6172A0] mt-1">
                Total Penduduk
              </div>
            </div>

            <div className="bg-[#F8FAFF] rounded-2xl p-5">
              <div className="text-2xl font-bold text-[#243B88]">
                {totalKK}
              </div>
              <div className="text-sm text-[#6172A0] mt-1">
                Kepala Keluarga
              </div>
            </div>

            <div className="bg-[#F8FAFF] rounded-2xl p-5">
              <div className="text-2xl font-bold text-[#243B88]">
                {laki}
              </div>
              <div className="text-sm text-[#6172A0] mt-1">
                Laki-laki
              </div>
            </div>

            <div className="bg-[#F8FAFF] rounded-2xl p-5">
              <div className="text-2xl font-bold text-[#243B88]">
                {perempuan}
              </div>
              <div className="text-sm text-[#6172A0] mt-1">
                Perempuan
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  )
}

// ── App ────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>(() => {
  const saved = localStorage.getItem("page");
  return (saved as Page) || "beranda";
});
  const [selectedRT, setSelectedRT] = useState<RT | null>(null);

  // data dari spreadsheet
const [website, setWebsite] = useState<any>(null);

useEffect(() => {
  async function ambilData() {
    try {
      const data = await loadWebsite();

      console.log("Website :", data);

      setWebsite(data);

    } catch (err) {
      console.error(err);
    }
  } 

  ambilData();
}, []);
useEffect(() => {
  localStorage.setItem("page", page);
}, [page]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (page === "detail-rt" && !selectedRT) {
      setPage("struktur-rt");
    }
  }, [page, selectedRT]);

  return (
    <div
      className="min-h-screen bg-[#EFF3FF]"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <Navbar page={page} setPage={setPage} />

 <main>

  {page === "beranda" && website && (
    <BerandaPage
    setPage={setPage}
    website={website}
/>
  )}

  {page === "profil" && website && (
    <ProfilPage
      profil={website.profil}
      pendudukList={website.penduduk}
    />
  )}

  {page === "penduduk" && website && (
    <PendudukPage
      pendudukList={website.penduduk}
    />
  )}

  {page === "kegiatan" && (
    <KegiatanPage
    kegiatan={website?.kegiatan || []}
/>
  )}

  {page === "pengumuman" && (
    <PengumumanPage
    pengumuman={website?.pengumuman || []}
/>
  )}

{page === "galeri" && (
  <GaleriPage
    galeri={website?.galeri || []}
  />
)}

  {page === "struktur-rt" && (
<StrukturRTPage
  strukturRT={website?.strukturRT || []}
  pendudukList={website?.penduduk || []}
  profil={website?.profil || {}}
  statistik={website?.statistik || {}}
  setSelectedRT={setSelectedRT}
  setPage={setPage}
/>
  )}

{page === "detail-rt" && selectedRT && (
  <DetailRTPage
    rt={selectedRT}
    pendudukList={website?.penduduk || []}
    setPage={setPage}
  />
)}

</main>

      <Footer setPage={setPage} />
    </div>
  );
}