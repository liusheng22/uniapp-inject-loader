const fs = require('fs')
const path = require('path')
const { parseComponent } = require('vue-template-compiler')
const {
  generateHtmlCode,
  generateLabelCode,
  generateStyleCode,
  getPagesMap,
  initPages,
  getRoute
} = require('./utils')
const injectCodeModuleSnippets = require('./utils/inject')

// 是否初始化过
let _init = false
// 是否需要做处理
let needHandle = false
// 路由和配置的映射关系
let pagesMap = {}

module.exports = function (content) {
  if (!_init) {
    _init = true
    init(this)
  }

  // 配置无效不予处理
  if (!needHandle) {
    return content
  }

  // 获取当前文件的小程序路由
  const route = getRoute(this.resourcePath)
  // 根据路由并找到对应配置
  const curPage = pagesMap[route]
  if (curPage) {
    // 解析sfc
    let compiler = parseComponent(content)
    const { injectCode, injectLabel } = curPage || {}
    const isPageHasInjectCode = injectCode && injectCode.length
    const isPageHasInjectLabel = injectLabel && injectLabel.length

    // 插入代码
    if (isPageHasInjectCode) {
      for (const module of injectCode) {
        // TODO MOCK
        // 获取公共组件路径
        const modulePath = path.resolve(
          __dirname,
          `src/components/${module}/${module}.vue`
        )
        const injectContent = fs.readFileSync(modulePath, 'utf8')
        // 解析sfc - 最终插入到页面的代码
        const injectCompiler = parseComponent(injectContent)

        // 将 injectCompiler 和 compiler 进行合并
        const result = injectCodeModuleSnippets({
          sourceCompiler: compiler,
          injectCompiler,
          curPage
        })
        content = result.content
        compiler = result.compiler
      }
    }

    // 插入标签
    if (isPageHasInjectLabel) {
      // 生成标签代码
      const labelCode = generateLabelCode(injectLabel || [])
      // 匹配标签位置
      // eslint-disable-next-line no-useless-escape
      const insertReg = new RegExp(`(<\/${curPage.ele}>$)`)
      // 在匹配的标签之前插入额外标签代码
      const templateCode = generateHtmlCode(
        compiler.template.content,
        labelCode,
        insertReg
      )
      // 重组style标签及内容
      const style = generateStyleCode(compiler.styles || [])
      content = `
        <template>
          ${templateCode}
        </template>
        <script>
          ${compiler.script.content}
        </script>
        ${style}
      `
    }
  }
  return content
}

function init(that) {
  const platform = process.env.VUE_APP_PLATFORM
  const { VUE_APP_PLATFORMS = [] } = that.query || {}
  // 平台不一致不予处理
  if (!VUE_APP_PLATFORMS.includes(platform)) {
    return
  }
  // 允许的平台 app-plus mp-weixin mp-alipay mp-baidu mp-toutiao
  const allowPlatform = [/mp-[\w]+/, /app-plus/]
  const isLoader = allowPlatform.some((e) => e.test(platform))
  // 首次需要对pages配置文件做解析，并判断是否为有效配置
  needHandle = isLoader && initPages(that)
  // 转换为路由和配置的映射对象
  needHandle && (pagesMap = getPagesMap())
}
