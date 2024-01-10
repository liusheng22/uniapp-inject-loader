
# uniapp-inject-loader

### 介绍
#### 即使我们可以使用uniapp的 `easycom` 配置来实现全局组件的引入，但是在APP、小程序中，由于没有根标签，我们仍然需要在每个vue文件的 `template` 中进行修改来引入组件，这样就会导致每个文件都要修改编写一遍同样的代码，代码冗余，不利于维护，所以我们需要一个插件来实现全局组件的注入，这样就可以自动将我们所需的组件注入到所有页面，而不需要在每个文件中手动修改了。

### 安装
```bash
npm i uniapp-inject-loader -D
```

### `vue.config.js` 注入loader
```javascript
/* vue.config.js file */
const path = require('path')
module.exports = {
  configureWebpack: {
    module: {
      rules: [
        {
          test: /\.vue$/,
          use: {
            loader: path.resolve(__dirname, '../node_modules/uniapp-inject-loader/src/index.js'),
            options: {
              // 根据自己项目需要启用配置的平台进行填写，比如 ['app-plus','mp-weixin']
              VUE_APP_PLATFORMS: ['app-plus']
            }
          }
        }
      ]
    }
  }
}
```
```javascript
// 支持自定义pages.json文件路径
options: {
  pagesPath: path.resolve(__dirname,'./src/pages.json')
}
```

### 第三步 pages.json配置文件中添加 `injectLoader`

> 配置前，先要了解 `pages.json` 中 [easycom配置](https://uniapp.dcloud.net.cn/collocation/pages.html#easycom) & [easycom规范](https://uniapp.dcloud.net.cn/component/#easycom)
- 我们需要在全局的 `components` 目录下创建一个全局组件，比如名字叫 `custom-global-component`，然后就可以在任意页面去使用`<custom-global-component />`组件标签来插入该组件了

> 使用该 leader 可以省去在每个页面引入组件的步骤，直接在 `pages.json` 中配置即可，支持全局配置和单独页面配置，不需要对原有业务代码有侵入型
```json
/* pages.json file */
"injectLoader": {
  "config": {
    "componentName": "<custom-global-component></custom-global-component>",
  },
  // 全局配置
  "label": ["componentName"],
  /* 同一全局组件 injectLabel or injectCode 二选一 */
  "injectLabel": ["custom-global-component"], // 以标签的形式插入代码
  "injectCode": ["custom-global-component"], // 以代码的形式插入代码
  "rootEle": "view"
},
"pages": [
  {
    "path": "pages/test/index",
    "style": {
      "navigationBarTitleText": "测试页面",
      // 单独配置，用法跟全局配置一致，优先级高于全局
      "label": ["componentName"],
      "rootEle":"div"
    }
  }
]
```

###  配置说明

- `config` (default: `{}`)
  定义标签名称和内容的键值对
- `label`(default: `[]`)
  需要全局引入的标签，打包后会在所有页面引入此标签
- `rootEle`(default: `"div"`)
  根元素的标签类型，缺省值为div，支持正则，比如匹配任意标签 ".*"

✔ `label` 和 `rootEle` 支持在单独页面的style里配置，优先级高于全局配置


### 两种注入方式的区别
- injectLabel
  - `injectLabel` 会将组件的 `<custom-global-component />` 代码注入到页面的 `template` 中，从而实现全局组件的引入
  - 优点：组件跟页面的代码是分离的，不会导致页面、组件的代码产生冲突
  - 缺点：组件无法使用页面的数据，因为注入的代码无法传入参数
- injectCode
  - `injectCode` 会将 `custom-global-component` 组件的所有代码部分(`template`、`script`、`style`)注入`合并`到页面中，从而实现全局组件的引入
  - 优点：组件可以使用页面的数据，因为注入的代码与页面共享同一个 `script` 代码块
  - 缺点：组件跟页面的代码是在同一个 `script` 中，可能会导致代码冲突；样式冲突等

### tips
- 优先推荐使用 `injectLabel` 配置，因为这种方式不会导致代码冲突，对原有业务代码的侵入性最小
- 如果使用 `injectCode` 配置，建议仅使用简易便于维护的组件，过于复杂的生命周期、数据处理、函数等注入到页面后可能会导致代码冲突，不利于维护
