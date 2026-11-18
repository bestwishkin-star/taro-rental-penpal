import themeTokens from './styles/tokens.json';

export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/find/index',
    'pages/profile/index',
    'pages/rental-detail/index',
    'pages/rental-list/index',
    'pages/settings/index'
  ],
  subPackages: [
    {
      root: 'pages/share',
      pages: ['index', 'point/index']
    },
    {
      root: 'pages/house-record',
      pages: ['timeline/index', 'model/index']
    },
    {
      root: 'pages/daily-task',
      pages: ['index']
    }
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: themeTokens['color-page'],
    navigationBarTitleText: 'Rental Penpal',
    navigationBarTextStyle: 'black',
    backgroundColor: themeTokens['color-page']
  },
  tabBar: {
    custom: true,
    color: themeTokens['color-text-muted'],
    selectedColor: themeTokens['color-primary'],
    backgroundColor: themeTokens['color-surface'],
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页',
        iconPath: 'assets/icons/home.png',
        selectedIconPath: 'assets/icons/home-active.png'
      },
      {
        pagePath: 'pages/find/index',
        text: '找房',
        iconPath: 'assets/icons/find.png',
        selectedIconPath: 'assets/icons/find-active.png'
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/icons/profile.png',
        selectedIconPath: 'assets/icons/profile-active.png'
      }
    ]
  }
});
