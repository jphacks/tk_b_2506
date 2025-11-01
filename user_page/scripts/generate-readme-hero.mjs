#!/usr/bin/env node
/**
 * Simple SVG banner generator for README hero images.
 *
 * Usage:
 *   node scripts/generate-readme-hero.mjs \
 *     --title="Conference Intro Builder" \
 *     --subtitle="Self-introduction landing pages in minutes" \
 *     --tagline="Built with Supabase + React" \
 *     --accent="#2563eb" \
 *     --output="public/readme-hero.svg"
 *
 * Any of the switches can be omitted—the defaults below are applied.
 */

import fs from 'node:fs';
import path from 'node:path';

const defaults = {
    title: 'Conference Intro Builder',
    subtitle: 'Create polished self-introduction pages in minutes.',
    tagline: 'React • Supabase • Tailwind CSS',
    accent: '#2563eb',
    background: '#0f172a',
    output: 'public/readme-hero.svg'
};

const toKebabKey = (input) => input.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

const parseArgs = () => {
    const args = process.argv.slice(2);
    const options = { ...defaults };

    for (const arg of args) {
        const match = arg.match(/^--([^=]+)=(.*)$/);
        if (!match) {
            console.warn(`Skipping malformed argument "${arg}". Expected --key=value.`);
            continue;
        }

        const [, rawKey, value] = match;
        const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());

        if (!(key in defaults)) {
            const validKeys = Object.keys(defaults).map(toKebabKey).join(', ');
            console.warn(`Unknown option "${rawKey}". Supported: ${validKeys}.`);
            continue;
        }

        options[key] = value.trim();
    }

    return options;
};

const clampHex = (hex) => {
    const normalized = hex.trim().toLowerCase();
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(normalized)) {
        throw new Error(
            `Accent color "${hex}" is invalid. Use a 3 or 6 character hex value like #2563eb.`
        );
    }
    return normalized.length === 4
        ? `#${[...normalized.slice(1)].map((char) => char + char).join('')}`
        : normalized;
};

const hexToRgb = (hex) => {
    const parsed = clampHex(hex);
    const bigint = parseInt(parsed.slice(1), 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
};

const mixWith = (hex, targetHex, ratio) => {
    const base = hexToRgb(hex);
    const target = hexToRgb(targetHex);
    const clamp = (value) => Math.min(255, Math.max(0, Math.round(value)));
    return (
        '#' +
        [base.r, base.g, base.b]
            .map((channel, index) => {
                const targetChannel = [target.r, target.g, target.b][index];
                const mixed = clamp(channel * (1 - ratio) + targetChannel * ratio);
                return mixed.toString(16).padStart(2, '0');
            })
            .join('')
    );
};

const escapeXml = (value) =>
    value.replace(/[<>&'"]/g, (char) => {
        switch (char) {
            case '<':
                return '&lt;';
            case '>':
                return '&gt;';
            case '&':
                return '&amp;';
            case '"':
                return '&quot;';
            case "'":
                return '&#39;';
            default:
                return char;
        }
    });

const composeSvg = ({ title, subtitle, tagline, accent, background }) => {
    const width = 1200;
    const height = 630;
    const accentSoft = mixWith(accent, '#ffffff', 0.5);
    const accentMuted = mixWith(accent, '#0f172a', 0.65);
    const backgroundRgb = hexToRgb(background);
    const accentRgb = hexToRgb(accent);

    const svgTitle = escapeXml(title);
    const svgSubtitle = escapeXml(subtitle);
    const svgTagline = escapeXml(tagline);

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0" y1="${height}" x2="${width}" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="rgba(${backgroundRgb.r}, ${backgroundRgb.g}, ${backgroundRgb.b}, 1)" />
      <stop offset="100%" stop-color="rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.95)" />
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="${accentSoft}" stop-opacity="0.75" />
      <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
    </radialGradient>
    <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M 60 0 L 0 0 0 60" fill="none" stroke="${accentMuted}" stroke-width="1" stroke-opacity="0.35" />
    </pattern>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="20" stdDeviation="20" flood-color="${accent}" flood-opacity="0.2"/>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bgGradient)" />
  <rect width="${width}" height="${height}" fill="url(#grid)" opacity="0.35" />
  <rect x="80" y="110" width="${width - 160}" height="${height - 220}" rx="32" fill="url(#glow)" opacity="0.55" filter="url(#shadow)"/>
  <g fill="#f8fafc" font-family="Inter, 'Segoe UI', 'Helvetica Neue', sans-serif">
    <text x="120" y="240" font-size="48" font-weight="600" letter-spacing="0.18em" fill="${accentSoft}">${svgTagline}</text>
    <text x="120" y="340" font-size="88" font-weight="700" letter-spacing="-0.02em">${svgTitle}</text>
    <text x="120" y="420" font-size="36" font-weight="400" fill="rgba(248,250,252,0.85)">${svgSubtitle}</text>
  </g>
  <g transform="translate(${width - 280}, ${height - 220}) rotate(-15)">
    <rect x="0" y="0" width="200" height="200" rx="36" fill="rgba(15,23,42,0.65)" stroke="${accentSoft}" stroke-width="2"/>
    <circle cx="140" cy="60" r="22" fill="${accent}" opacity="0.75"/>
    <circle cx="70" cy="130" r="28" fill="${accentSoft}" opacity="0.35"/>
    <path d="M40 40 L160 40 L160 160" stroke="${accentSoft}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="12 16" opacity="0.65"/>
  </g>
</svg>
`;
};

const writeSvg = (outputPath, svgContent) => {
    const resolved = path.resolve(process.cwd(), outputPath);
    const directory = path.dirname(resolved);

    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(resolved, svgContent, 'utf8');
};

const main = () => {
    try {
        const options = parseArgs();
        const accent = clampHex(options.accent);
        const background = clampHex(options.background);

        const svg = composeSvg({
            ...options,
            accent,
            background
        });

        writeSvg(options.output, svg);
        console.log(`✔ Readme hero saved to ${options.output}`);
    } catch (error) {
        console.error(`✖ Failed to generate hero image: ${error.message}`);
        process.exitCode = 1;
    }
};

main();
