/**
 * BBS Theme Definitions
 *
 * Each theme provides the 16 ANSI colors plus UI-specific overrides.
 * Themes are applied by setting CSS custom properties on the root.
 *
 * The 16 standard ANSI colors:
 *   0: black    8:  darkgray
 *   1: red      9:  lightred
 *   2: green    10: lightgreen
 *   3: brown    11: yellow
 *   4: blue     12: lightblue
 *   5: magenta  13: lightmagenta
 *   6: cyan     14: lightcyan
 *   7: lgray    15: white
 */

const themes = {

  // Standard CGA/VGA 16-color palette
  default: {
    name: 'CGA/VGA',
    colors: {
      '--black':     '#000000',
      '--blue':      '#0000AA',
      '--green':     '#00AA00',
      '--cyan':      '#00AAAA',
      '--red':       '#AA0000',
      '--magenta':   '#AA00AA',
      '--brown':     '#AA5500',
      '--lgray':     '#AAAAAA',
      '--dgray':     '#555555',
      '--lblue':     '#5555FF',
      '--lgreen':    '#55FF55',
      '--lcyan':     '#55FFFF',
      '--lred':      '#FF5555',
      '--lmag':      '#FF55FF',
      '--yellow':    '#FFFF55',
      '--white':     '#FFFFFF',
    },
    background: '#000000',
    scanline_opacity: 0.06,
  },

  // Amber monochrome CRT
  amber: {
    name: 'Amber CRT',
    colors: {
      '--black':     '#000000',
      '--blue':      '#331A00',
      '--green':     '#664400',
      '--cyan':      '#996600',
      '--red':       '#4D2600',
      '--magenta':   '#663300',
      '--brown':     '#805500',
      '--lgray':     '#CC8800',
      '--dgray':     '#664400',
      '--lblue':     '#996600',
      '--lgreen':    '#CCAA00',
      '--lcyan':     '#FFCC00',
      '--lred':      '#CC6600',
      '--lmag':      '#CC8800',
      '--yellow':    '#FFD700',
      '--white':     '#FFDD44',
    },
    background: '#0A0600',
    scanline_opacity: 0.08,
  },

  // Green phosphor monitor
  green: {
    name: 'Green Phosphor',
    colors: {
      '--black':     '#000000',
      '--blue':      '#002200',
      '--green':     '#005500',
      '--cyan':      '#007700',
      '--red':       '#003300',
      '--magenta':   '#004400',
      '--brown':     '#005500',
      '--lgray':     '#00AA00',
      '--dgray':     '#005500',
      '--lblue':     '#007700',
      '--lgreen':    '#00CC00',
      '--lcyan':     '#00FF00',
      '--lred':      '#009900',
      '--lmag':      '#00AA00',
      '--yellow':    '#00DD00',
      '--white':     '#00FF33',
    },
    background: '#000A00',
    scanline_opacity: 0.08,
  },

  // Cool blue (BBS-style blue theme)
  ice: {
    name: 'Ice',
    colors: {
      '--black':     '#000000',
      '--blue':      '#000066',
      '--green':     '#004466',
      '--cyan':      '#006699',
      '--red':       '#330044',
      '--magenta':   '#440066',
      '--brown':     '#335577',
      '--lgray':     '#8899AA',
      '--dgray':     '#445566',
      '--lblue':     '#4488CC',
      '--lgreen':    '#44AACC',
      '--lcyan':     '#66CCFF',
      '--lred':      '#8866AA',
      '--lmag':      '#AA88CC',
      '--yellow':    '#AADDFF',
      '--white':     '#DDEEFF',
    },
    background: '#000011',
    scanline_opacity: 0.05,
  },
};

// Apply a theme to the document
function applyTheme(themeName) {
  const theme = themes[themeName] || themes.default;
  const root = document.documentElement;

  for (const [prop, value] of Object.entries(theme.colors)) {
    root.style.setProperty(prop, value);
  }

  document.body.style.background = theme.background;

  // Update scanline opacity
  root.style.setProperty('--scanline-opacity', theme.scanline_opacity);

  return theme;
}

// Get list of available themes
function listThemes() {
  return Object.entries(themes).map(([id, t]) => ({
    id,
    name: t.name,
  }));
}

export { themes, applyTheme, listThemes };
export default themes;
