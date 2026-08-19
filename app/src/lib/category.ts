export type CategoryTheme = 'light' | 'dark';

export const CATEGORY_ICON_MAP: Record<string, string> = {
  'Auto Services': 'auto',
  'Barber Services': 'barber',
  'Beauty Salon Services': 'beauty-salon',
  'Photography Services': 'photography',
  'Massage Services': 'massage',
  More: 'more',
};

export const CATEGORY_COLOR_MAP: Record<
  string,
  {
    bg: string;
    icon: string;
    darkBg: string;
    darkIcon: string;
  }
> = {
  'Auto Services': {
    bg: '#FFDDE1',
    icon: '#FF4C61',
    darkBg: '#402028',
    darkIcon: '#FF8090',
  },
  'Barber Services': {
    bg: '#D0E8FF',
    icon: '#357ABD',
    darkBg: '#1A2B3C',
    darkIcon: '#79AEEB',
  },
  'Beauty Salon Services': {
    bg: '#FFF0B3',
    icon: '#E6C200',
    darkBg: '#3D3410',
    darkIcon: '#F5D96C',
  },
  'Photography Services': {
    bg: '#E0FFE0',
    icon: '#28A745',
    darkBg: '#1A331A',
    darkIcon: '#6DDC6D',
  },
  'Massage Services': {
    bg: '#F0E0FF',
    icon: '#7F3FBF',
    darkBg: '#2A1F36',
    darkIcon: '#B98DFF',
  },
  More: {
    bg: '#F0F0F0',
    icon: '#7A7A7A',
    darkBg: '#2A2A2A',
    darkIcon: '#CCCCCC',
  },
};

export function getCategoryTheme(category?: string, theme: CategoryTheme = 'light') {
  const colors = CATEGORY_COLOR_MAP[category || ''] || CATEGORY_COLOR_MAP.More;

  return {
    bgColor: theme === 'dark' ? colors.darkBg : colors.bg,
    iconColor: theme === 'dark' ? colors.darkIcon : colors.icon,
  };
}
