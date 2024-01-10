const traverse = require('@babel/traverse').default
const t = require('@babel/types')
const deepmerge = require('deepmerge')
const { parseComponent } = require('vue-template-compiler')

const { astToCode } = require('./helper/ast')
const { parseScriptAst } = require('./helper/parse')
const { extractDataFromScriptAst } = require('./helper/traverse')
const { LIFECYCLE_HOOKS, OBJECT_PROPERTIES } = require('../constants')
const { generateStyleCode, generateHtmlCode } = require('./index')

function extractLifecycleHookExpression(content, hooks) {
  const ast = parseScriptAst(content)

  let expressions = []

  traverse(ast, {
    ObjectProperty(path) {
      // 检查是否是 lifeCycle 对象
      if (path.node.key.name === hooks) {
        // 检查 lifeCycle 是否是数组
        if (t.isArrayExpression(path.node.value)) {
          // 提取数组中的所有函数
          expressions = path.node.value.elements
        } else if (
          t.isFunctionExpression(path.node.value) ||
          t.isArrowFunctionExpression(path.node.value)
        ) {
          // 如果 lifeCycle 是函数，转换为数组，然后提取数组中的所有函数
          const originalFunction = path.node.value
          expressions = [originalFunction]
        }
      }
    },
    ObjectMethod(path) {
      // 检查是否是mounted对象
      if (path.node.key.name === hooks) {
        // 获取函数体的内容
        expressions = [
          t.functionExpression(
            null,
            path.node.params,
            path.node.body,
            path.node.generator,
            path.node.async
          )
        ]
      }
    }
  })

  return expressions
}

function lifeCycleInjectCode(content, newExpression, hooks) {
  const ast = parseScriptAst(content)

  traverse(ast, {
    ExportDefaultDeclaration(path) {
      let isFind = false
      path.traverse({
        ObjectMethod(path) {
          if (path.node.key.name === hooks && !isFind) {
            // 创建一个新的函数表达式
            const functionExpression = t.functionExpression(
              null,
              path.node.params,
              path.node.body,
              path.node.generator,
              path.node.async
            )

            // 替换原来的函数
            path.replaceWith(
              t.objectProperty(
                t.identifier(hooks),
                t.arrayExpression([functionExpression, ...newExpression])
              )
            )

            isFind = true
          }
        },
        ObjectProperty(path) {
          if (path.node.key.name === hooks && !isFind) {
            // 如果 lifeCycle 是数组，直接添加新的函数
            if (t.isArrayExpression(path.node.value)) {
              path.node.value.elements.push(...newExpression)
            } else if (
              t.isFunctionExpression(path.node.value) ||
              t.isArrowFunctionExpression(path.node.value)
            ) {
              // 如果 lifeCycle 是函数，转换为数组，然后添加新的函数
              const originalFunction = path.node.value
              path.node.value = t.arrayExpression([
                originalFunction,
                ...newExpression
              ])
            }

            isFind = true
          }
        }
      })
    }
  })

  return astToCode(ast)
}

// 提取出某个对象属性
function extractObjectProperty(content, objectType) {
  const ast = parseScriptAst(content)
  const objectProperty = extractDataFromScriptAst(ast, objectType)
  return objectProperty
}

function objectPropertyMergeToAst(content, newObjectProperty, objectType) {
  const ast = parseScriptAst(content)
  let objectProperty = null
  traverse(ast, {
    ExportDefaultDeclaration(path) {
      path.traverse({
        ObjectProperty(path) {
          if (path.node.key.name === objectType) {
            objectProperty = path.node
          }
        }
      })

      if (!objectProperty) {
        // 如果不存在 xx 属性，创建一个新的 xx 属性
        objectProperty = t.objectProperty(
          t.identifier(objectType),
          t.objectExpression([])
        )
        path.node.declaration.properties.push(objectProperty)
      }

      // 合并 xx 属性到原来的对象中
      objectProperty.value.properties.push(...newObjectProperty)
    }
  })

  return astToCode(ast)
}

// 从源代码中提取data属性
const extractDataProperties = (content) => {
  const ast = parseScriptAst(content)

  let dataProperties = []

  traverse(ast, {
    ObjectMethod(path) {
      // 检查是否是data函数
      if (path.node.key.name === 'data') {
        // 遍历data函数的AST
        path.traverse({
          ReturnStatement(returnPath) {
            const properties = returnPath.node.argument.properties
            // 将每个属性转换为ObjectProperty节点
            dataProperties = properties.map((prop) => {
              return t.objectProperty(
                t.identifier(prop.key.name), // 属性的键
                prop.value // 属性的值
              )
            })
          }
        })
      }
    }
  })

  return dataProperties
}

// 将data合并到源代码中
const dataMergeToAst = (content, dataProperties) => {
  const ast = parseScriptAst(content)

  // 遍历AST
  traverse(ast, {
    ObjectMethod(path) {
      // 检查是否是data函数
      if (path.node.key.name === 'data') {
        // 遍历data函数的AST
        path.traverse({
          ReturnStatement(returnPath) {
            const properties = returnPath.node.argument.properties
            // 合并对象
            const mergedObject = t.objectExpression([
              ...properties,
              // 需要合并的属性
              ...dataProperties
            ])
            returnPath.node.argument = mergedObject
          }
        })
      }
    }
  })

  return astToCode(ast)
}

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
    scriptContent: sourceScript.content,
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
    const { scriptContent, styles, template } = pageInjectCode({
      sourceCompiler,
      injectCompiler,
      curPage
    })

    content = `
      <template>
        ${template}
      </template>
      <script>
      ${scriptContent}
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
