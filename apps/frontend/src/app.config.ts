export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/find/index',
    'pages/profile/index',
    'pages/share/index',
    'pages/rental-detail/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#f5efe6',
    navigationBarTitleText: 'Rental Penpal',
    navigationBarTextStyle: 'black',
    backgroundColor: '#f7f3ec'
  },
  tabBar: {
    custom: true,
    color: '#8b7761',
    selectedColor: '#2d241b',
    backgroundColor: '#fffaf2',
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
