Component({
  data: {
    selected: 0,
    tabs: [
      {
        path: '/pages/home/index',
        label: 'Home',
        icon: '/static/tab-home.png',
        activeIcon: '/static/tab-home-active.png'
      },
      {
        path: '/pages/vocabulary/index',
        label: 'Vocabulary',
        icon: '/static/tab-vocabulary.png',
        activeIcon: '/static/tab-vocabulary-active.png'
      },
      {
        path: '/pages/progress/index',
        label: 'Progress',
        icon: '/static/tab-progress.png',
        activeIcon: '/static/tab-progress-active.png'
      },
      {
        path: '/pages/profile/index',
        label: 'Profile',
        icon: '/static/tab-profile.png',
        activeIcon: '/static/tab-profile-active.png'
      }
    ]
  },

  lifetimes: {
    attached: function () {
      // 自定义 tabBar 随 tab 页创建，挂载时同步当前高亮项
      this.syncSelected()
      var self = this
      setTimeout(function () {
        self.syncSelected()
      }, 30)
    }
  },

  pageLifetimes: {
    // 从其它页面回到 tab 页时重新同步，避免高亮错位
    show: function () {
      this.syncSelected()
    }
  },

  methods: {
    syncSelected: function () {
      try {
        var stack = getCurrentPages()
        if (!stack || !stack.length) return
        var route = stack[stack.length - 1].route || ''
        var tabs = this.data.tabs
        var index = 0
        for (var i = 0; i < tabs.length; i++) {
          if (tabs[i].path.replace(/^\//, '') === route) {
            index = i
            break
          }
        }
        if (index !== this.data.selected) this.setData({ selected: index })
      } catch (e) {
        /* 忽略 */
      }
    },

    onTap: function (event) {
      var index = Number(event.currentTarget.dataset.index)
      if (isNaN(index) || index === this.data.selected) return
      this.setData({ selected: index })
      wx.switchTab({ url: this.data.tabs[index].path })
    }
  }
})
