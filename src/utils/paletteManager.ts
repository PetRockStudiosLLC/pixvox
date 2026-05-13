import { PaletteColor } from "../types/voxel";

export interface ColorPalette {
  name: string;
  colors: string[];
  createdAt: number;
}

const PALETTE_STORAGE_KEY = "pixelartmaker_palettes";

export function loadPalettes(): ColorPalette[] {
  try {
    const data = localStorage.getItem(PALETTE_STORAGE_KEY);
    if (!data) return getDefaultPalettes();
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : getDefaultPalettes();
  } catch {
    return getDefaultPalettes();
  }
}

export function savePalettes(palettes: ColorPalette[]): void {
  localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(palettes));
}

export function generateRandomPalette(
  type: "complementary" | "analogous" | "triadic" | "split-complementary" | "monochromatic" | "random",
  count: number = 8
): string[] {
  const baseHue = Math.random() * 360;
  const baseSat = 0.5 + Math.random() * 0.5;
  const baseLight = 0.4 + Math.random() * 0.3;

  switch (type) {
    case "complementary":
      return [
        hslToHex(baseHue, baseSat, baseLight),
        hslToHex((baseHue + 180) % 360, baseSat, baseLight),
        ...generateTintsAndShades(baseHue, baseSat, baseLight, count - 2)
      ].slice(0, count);

    case "analogous":
      return Array.from({ length: count }, (_, i) => {
        const hue = (baseHue + (i - Math.floor(count / 2)) * 30 + 360) % 360;
        return hslToHex(hue, baseSat, baseLight);
      });

    case "triadic":
      return [
        hslToHex(baseHue, baseSat, baseLight),
        hslToHex((baseHue + 120) % 360, baseSat, baseLight),
        hslToHex((baseHue + 240) % 360, baseSat, baseLight),
        ...generateTintsAndShades(baseHue, baseSat, baseLight, count - 3)
      ].slice(0, count);

    case "split-complementary":
      return [
        hslToHex(baseHue, baseSat, baseLight),
        hslToHex((baseHue + 150) % 360, baseSat, baseLight),
        hslToHex((baseHue + 210) % 360, baseSat, baseLight),
        ...generateTintsAndShades(baseHue, baseSat, baseLight, count - 3)
      ].slice(0, count);

    case "monochromatic":
      return generateTintsAndShades(baseHue, baseSat, baseLight, count);

    case "random":
    default:
      return Array.from({ length: count }, () => {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
      });
  }
}

function generateTintsAndShades(h: number, s: number, l: number, count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const factor = (i / (count - 1)) * 2 - 1; // -1 to 1
    const newL = Math.max(0.1, Math.min(0.9, l + factor * 0.3));
    return hslToHex(h, s, newL);
  });
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r, g, b;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getDefaultPalettes(): ColorPalette[] {
  return [
    {
      name: "Default Pico-8",
      colors: [
        "#000000",
        "#1D2B53",
        "#7E2553",
        "#008751",
        "#AB5236",
        "#5F574F",
        "#C2C3C7",
        "#FFF1E8",
        "#FF004D",
        "#FFA300",
        "#FFEC27",
        "#00E436",
        "#29ADFF",
        "#83769C",
        "#FF77A8",
        "#FFCCAA"
      ],
      createdAt: Date.now()
    },
    {
      name: "Sweet 16",
      colors: [
        "#1A1C2C",
        "#5D275D",
        "#B13E53",
        "#EF7D57",
        "#FFCD75",
        "#A7F070",
        "#38B764",
        "#257179",
        "#29366F",
        "#3B5DC9",
        "#41A6F6",
        "#73EFF7",
        "#F4F4F4",
        "#94B0C2",
        "#566C86",
        "#333C57"
      ],
      createdAt: Date.now()
    },
    {
      name: "Arne 16",
      colors: [
        "#000000",
        "#BE2633",
        "#E06F8B",
        "#493C2B",
        "#A46422",
        "#EB8931",
        "#F7E26B",
        "#2F484E",
        "#44891A",
        "#6ABE30",
        "#8EC527",
        "#1B2632",
        "#005784",
        "#31A2F2",
        "#B2DCEF",
        "#FFFFFF"
      ],
      createdAt: Date.now()
    }
  ];
}
