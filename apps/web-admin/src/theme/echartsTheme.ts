import * as echarts from 'echarts';

export const gymEChartsThemeName = 'gym-147';
export const gymEChartsThemeDarkName = 'gym-147-dark';

// Professional font stack - Space Grotesk is the primary font for charts (geometric, modern, professional)
const professionalFontFamily =
  "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif";

// Color palette - Brand colors aligned with design system
const palette = [
  '#ff6422', // brand orange
  '#38bdf8', // cyan
  '#10b981', // emerald green
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ef4444', // red
  '#fb923c', // orange soft
];

// Light theme
const gymEChartsTheme = {
  color: palette,
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: professionalFontFamily,
    fontSize: 12,
    fontWeight: 400,
    color: '#374151', // gray-700
  },
  title: {
    textStyle: {
      fontFamily: professionalFontFamily,
      fontSize: 16,
      fontWeight: 600,
      color: '#111827', // gray-900
    },
    subtextStyle: {
      fontFamily: professionalFontFamily,
      fontSize: 12,
      fontWeight: 400,
      color: '#6b7280', // gray-500
    },
  },
  legend: {
    textStyle: {
      fontFamily: professionalFontFamily,
      fontSize: 12,
      fontWeight: 500,
      color: '#374151', // gray-700
    },
    itemGap: 20,
    itemWidth: 14,
    itemHeight: 14,
  },
  tooltip: {
    backgroundColor: 'rgba(17, 24, 39, 0.95)', // gray-900 with opacity
    borderColor: 'rgba(55, 65, 81, 0.8)', // gray-700
    borderWidth: 1,
    padding: [8, 12],
    textStyle: {
      fontFamily: professionalFontFamily,
      fontSize: 12,
      fontWeight: 400,
      color: '#f3f4f6', // gray-100
      lineHeight: 20,
    },
    axisPointer: {
      lineStyle: {
        color: '#9ca3af', // gray-400
        width: 1,
      },
      crossStyle: {
        color: '#9ca3af',
        width: 1,
      },
    },
  },
  categoryAxis: {
    axisTick: {
      show: false,
    },
    axisLine: {
      show: true,
      lineStyle: {
        color: '#e5e7eb', // gray-200
        width: 1,
      },
    },
    axisLabel: {
      color: '#6b7280', // gray-500
      fontFamily: professionalFontFamily,
      fontSize: 11,
      fontWeight: 400,
      margin: 8,
    },
    splitLine: {
      show: false,
    },
  },
  valueAxis: {
    axisTick: {
      show: false,
    },
    axisLine: {
      show: false,
    },
    axisLabel: {
      color: '#6b7280', // gray-500
      fontFamily: professionalFontFamily,
      fontSize: 11,
      fontWeight: 400,
      margin: 8,
    },
    splitLine: {
      show: true,
      lineStyle: {
        color: '#e5e7eb', // gray-200
        width: 1,
        type: 'dashed',
      },
    },
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    top: '10%',
    containLabel: true,
  },
  dataZoom: {
    textStyle: {
      color: '#6b7280',
      fontFamily: professionalFontFamily,
    },
  },
};

// Dark theme
const gymEChartsThemeDark = {
  ...gymEChartsTheme,
  textStyle: {
    ...gymEChartsTheme.textStyle,
    color: '#d1d5db', // gray-300
  },
  title: {
    textStyle: {
      ...gymEChartsTheme.title.textStyle,
      color: '#f9fafb', // gray-50
    },
    subtextStyle: {
      ...gymEChartsTheme.title.subtextStyle,
      color: '#9ca3af', // gray-400
    },
  },
  legend: {
    ...gymEChartsTheme.legend,
    textStyle: {
      ...gymEChartsTheme.legend.textStyle,
      color: '#d1d5db', // gray-300
    },
  },
  tooltip: {
    ...gymEChartsTheme.tooltip,
    backgroundColor: 'rgba(17, 24, 39, 0.98)',
    borderColor: 'rgba(75, 85, 99, 0.8)', // gray-600
  },
  categoryAxis: {
    ...gymEChartsTheme.categoryAxis,
    axisLine: {
      ...gymEChartsTheme.categoryAxis.axisLine,
      lineStyle: {
        color: '#4b5563', // gray-600
      },
    },
    axisLabel: {
      ...gymEChartsTheme.categoryAxis.axisLabel,
      color: '#9ca3af', // gray-400
    },
  },
  valueAxis: {
    ...gymEChartsTheme.valueAxis,
    axisLabel: {
      ...gymEChartsTheme.valueAxis.axisLabel,
      color: '#9ca3af', // gray-400
    },
    splitLine: {
      ...gymEChartsTheme.valueAxis.splitLine,
      lineStyle: {
        color: '#4b5563', // gray-600
      },
    },
  },
};

let themeRegistered = false;
let darkThemeRegistered = false;

export function registerGymEChartsTheme() {
  if (themeRegistered) return;
  echarts.registerTheme(gymEChartsThemeName, gymEChartsTheme);
  themeRegistered = true;
}

export function registerGymEChartsDarkTheme() {
  if (darkThemeRegistered) return;
  echarts.registerTheme(gymEChartsThemeDarkName, gymEChartsThemeDark);
  darkThemeRegistered = true;
}

export function getEChartsTheme(theme: 'light' | 'dark' = 'light'): string {
  if (theme === 'dark') {
    registerGymEChartsDarkTheme();
    return gymEChartsThemeDarkName;
  }
  registerGymEChartsTheme();
  return gymEChartsThemeName;
}
