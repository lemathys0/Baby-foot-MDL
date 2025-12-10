// Fonction pour appliquer un thème dynamiquement
export function applyTheme(themeColor: string) {
  const root = document.documentElement;
  
  // Convertir la couleur hex en HSL pour créer des variantes
  const hexToHSL = (hex: string) => {
    // Supprimer le #
    hex = hex.replace('#', '');
    
    // Convertir en RGB
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  };
  
  const hsl = hexToHSL(themeColor);
  
  // Appliquer les variables CSS
  root.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
  root.style.setProperty('--primary-foreground', `0 0% ${hsl.l > 50 ? 10 : 98}%`);
  
  // Variantes pour hover, etc.
  root.style.setProperty('--primary-hover', `${hsl.h} ${hsl.s}% ${Math.max(hsl.l - 10, 0)}%`);
  root.style.setProperty('--primary-active', `${hsl.h} ${hsl.s}% ${Math.max(hsl.l - 20, 0)}%`);
  
  // Couleur secondaire (teinte décalée)
  root.style.setProperty('--secondary', `${(hsl.h + 180) % 360} ${hsl.s}% ${hsl.l}%`);
  
  // Accent (teinte légèrement décalée)
  root.style.setProperty('--accent', `${(hsl.h + 30) % 360} ${hsl.s}% ${hsl.l}%`);
}

// Fonction pour obtenir la couleur d'un thème
export function getThemeColor(themeId: string, shopItems: any[]): string {
  const themeItem = shopItems.find(item => item.id === themeId);
  return themeItem?.preview || "#6366f1";
}
