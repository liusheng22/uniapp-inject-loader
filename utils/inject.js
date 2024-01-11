const deepmerge = require('deepmerge')
const { parseComponent } = require('vue-template-compiler')

const {
  extractDataProperties,
  extractObjectProperty,
  extractLifecycleHookExpression
} = require('./helper/extract')
const {
  dataMergeToAst,
  lifeCycleInjectCode,
  objectPropertyMergeToAst
} = require('./helper/merge')
const { LIFECYCLE_HOOKS, OBJECT_PROPERTIES } = require('../constants')
const { generateStyleCode, generateHtmlCode } = require('./index')

const pageInjectCode = ({ sourceCompiler, injectCompiler, curPage }) => {
  // 目标源代码的编译结果
  const {
    template: sourceTemplate,
    script: sourceScript,
    styles: sourceStyles
  } = sourceCompiler || {}
  // 期望插入的代码的编译结果
  const {
    template: injectTemplate,
    script: injectScript,
    styles: injectStyles
  } = injectCompiler || {}

  // 提取需要插入的组件中的data属性，将data合并到源代码中
  const injectDataProperties = extractDataProperties(injectScript.content)
  sourceScript.content = dataMergeToAst(
    sourceScript.content,
    injectDataProperties
  )

  for (const objectType of OBJECT_PROPERTIES) {
    const injectObjectProperty = extractObjectProperty(
      injectScript.content,
      objectType
    )
    sourceScript.content = objectPropertyMergeToAst(
      sourceScript.content,
      injectObjectProperty,
      objectType
    )
  }

  // LIFECYCLE_HOOKS 遍历
  for (const lifecycle of LIFECYCLE_HOOKS) {
    const lifecycleExpression = extractLifecycleHookExpression(
      injectScript.content,
      lifecycle
    )
    sourceScript.content = lifeCycleInjectCode(
      sourceScript.content,
      lifecycleExpression,
      lifecycle
    )
  }

  // 合并处理 template 中的内容
  // eslint-disable-next-line
  const injectReg = new RegExp(`(<\/${curPage.ele}>$)`)
  const templateCode = generateHtmlCode(
    sourceTemplate.content,
    injectTemplate.content,
    injectReg
  )

  // 合并处理 style 中的内容
  const stylesResult = deepmerge.all([sourceStyles, injectStyles])
  const stylesStr = generateStyleCode(stylesResult || [])

  // compiler
  sourceCompiler.template.content = templateCode
  sourceCompiler.script.content = sourceScript.content
  sourceCompiler.styles = stylesResult
  sourceTemplate.content = templateCode

  const result = {
    scripts: sourceScript.content,
    styles: stylesStr,
    template: templateCode
  }

  return result
}

/**
 *
 * @param {*} content 源代码
 * @param {*} sourceCompiler 源代码的编译结果
 * @param {*} injectCompiler 期望注入代码的编译结果
 * @param {*} curPage 当前页面的信息
 * @returns
 */
const injectCodeModuleSnippets = ({
  content,
  sourceCompiler,
  injectCompiler,
  curPage
}) => {
  // 目标源代码的编译结果
  const { customBlocks: sourceCustomBlocks } = sourceCompiler || {}
  // 期望插入的代码的编译结果
  const { customBlocks: injectCustomBlocks } = injectCompiler || {}
  // 重写后的编译结果
  let compiler = {}

  // 如果有自定义模块(renderjs)模块，则不进行代码何必操作
  const isInsertHasCustomBlocks =
    injectCustomBlocks && injectCustomBlocks.length
  const isSourceHasCustomBlocks =
    sourceCustomBlocks && sourceCustomBlocks.length
  // TODO: 后续可以考虑实现，目前还没想清楚
  if (isInsertHasCustomBlocks || isSourceHasCustomBlocks) {
    return {
      content,
      compiler: sourceCompiler
    }
  } else {
    const { scripts, styles, template } = pageInjectCode({
      sourceCompiler,
      injectCompiler,
      curPage
    })

    content = `
      <template>
        ${template}
      </template>
      <script>
      ${scripts}
      </script>
      ${styles}
    `
    compiler = parseComponent(content)

    return {
      content,
      compiler
    }
  }
}

module.exports = injectCodeModuleSnippets
