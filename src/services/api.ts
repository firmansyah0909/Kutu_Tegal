const API =
  "https://script.google.com/macros/s/AKfycbz0irQY09ELQkrcIgX15fZ5L6U8ohDOxSxrXnxg3F82FrY3mspHTi_JAakwom_VEuCV/exec";

export async function loadWebsite() {
  const res = await fetch(`${API}?t=${Date.now()}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Gagal mengambil data");
  }

  return await res.json();
}