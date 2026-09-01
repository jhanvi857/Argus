import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const themePath = path.join(rootDir, 'theme.json');
const cssPath = path.join(rootDir, 'src', 'index.css');

const args = new Set(process.argv.slice(2));
const shouldWatch = args.has('--watch') || args.has('--dev');
const shouldDev = args.has('--dev');

const requiredHexKeys = [
  'primary',
  'primaryDark',
  'primaryLight',
  'primarySurface',
  'cream',
  'creamLight',
  'creamBorder',
  'creamDark',
  'appBackground',
  'gray25',
  'gray50',
  'gray100',
  'gray150',
  'gray200',
  'gray300',
  'gray400',
  'gray500',
  'gray600',
  'gray700',
  'gray800',
  'gray900',
  'success',
  'successBg',
  'successBorder',
  'warning',
  'warningBg'
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assertHex(key, value) {
  if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error(`${key} must be a 6-digit hex color like #bc4749`);
  }
}

function hexToRgb(hex) {
  const raw = hex.slice(1);
  return {
    r: Number.parseInt(raw.slice(0, 2), 16),
    g: Number.parseInt(raw.slice(2, 4), 16),
    b: Number.parseInt(raw.slice(4, 6), 16)
  };
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildCssVariables(theme) {
  for (const key of requiredHexKeys) {
    assertHex(key, theme[key]);
  }

  return {
    '--primary': theme.primary,
    '--primary-dark': theme.primaryDark,
    '--primary-light': theme.primaryLight,
    '--primary-tint': rgba(theme.cream, 0.85),
    '--primary-surface': theme.primarySurface,
    '--primary-glow': rgba(theme.primary, 0.25),

    '--accent': theme.primary,
    '--accent-dark': theme.primaryDark,
    '--accent-light': theme.primaryLight,
    '--accent-tint': rgba(theme.cream, 0.85),
    '--accent-glow': rgba(theme.primary, 0.25),

    '--bg-white': '#ffffff',
    '--bg-cream': theme.cream,
    '--bg-cream-tint': rgba(theme.cream, 0.5),
    '--bg-cream-light': theme.creamLight,
    '--bg-cream-border': theme.creamBorder,
    '--bg-cream-dark': theme.creamDark,
    '--bg-app': theme.appBackground,

    '--primary-navy': theme.primary,
    '--primary-navy-dark': theme.primaryDark,
    '--primary-navy-light': theme.primaryLight,
    '--primary-navy-tint': rgba(theme.cream, 0.85),
    '--primary-navy-surface': theme.primarySurface,

    '--accent-crimson': theme.primary,
    '--accent-crimson-dark': theme.primaryDark,
    '--accent-crimson-light': theme.primaryLight,
    '--accent-crimson-tint': rgba(theme.cream, 0.85),
    '--accent-crimson-glow': rgba(theme.primary, 0.25),

    '--bg-warm-cream': theme.cream,
    '--bg-warm-cream-tint': rgba(theme.cream, 0.5),
    '--bg-warm-cream-border': theme.creamBorder,

    '--gray-25': theme.gray25,
    '--gray-50': theme.gray50,
    '--gray-100': theme.gray100,
    '--gray-150': theme.gray150,
    '--gray-200': theme.gray200,
    '--gray-300': theme.gray300,
    '--gray-400': theme.gray400,
    '--gray-500': theme.gray500,
    '--gray-600': theme.gray600,
    '--gray-700': theme.gray700,
    '--gray-800': theme.gray800,
    '--gray-900': theme.gray900,

    '--color-success': theme.success,
    '--color-success-bg': theme.successBg,
    '--color-success-border': theme.successBorder,
    '--color-warning': theme.warning,
    '--color-warning-bg': theme.warningBg,
    '--color-info': theme.primary,
    '--color-info-bg': theme.cream
  };
}

function replaceCssVariable(css, variable, value) {
  const escaped = variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(${escaped}\\s*:\\s*)([^;]+)(;)`);

  if (!pattern.test(css)) {
    throw new Error(`Could not find ${variable} in ${path.relative(rootDir, cssPath)}`);
  }

  return css.replace(pattern, `$1${value}$3`);
}

function applyTheme() {
  const theme = readJson(themePath);
  const variables = buildCssVariables(theme);
  let css = fs.readFileSync(cssPath, 'utf8');

  for (const [variable, value] of Object.entries(variables)) {
    css = replaceCssVariable(css, variable, value);
  }

  fs.writeFileSync(cssPath, css);
  console.log(`[theme] applied ${Object.keys(variables).length} CSS variables from theme.json`);
}

function watchTheme() {
  let timer;

  fs.watch(themePath, () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        applyTheme();
      } catch (error) {
        console.error(`[theme] ${error.message}`);
      }
    }, 120);
  });

  console.log('[theme] watching theme.json for changes');
}

function startDevServer() {
  const child = spawn('npm run dev -- --host 127.0.0.1', {
    cwd: rootDir,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', (data) => process.stdout.write(data));
  child.stderr.on('data', (data) => process.stderr.write(data));
  child.on('exit', (code) => {
    process.exitCode = code ?? 0;
  });
}

try {
  applyTheme();

  if (shouldWatch) {
    watchTheme();
  }

  if (shouldDev) {
    startDevServer();
  }
} catch (error) {
  console.error(`[theme] ${error.message}`);
  process.exitCode = 1;
}
