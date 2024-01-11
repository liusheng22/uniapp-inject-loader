const traverse = require('@babel/traverse').default
const t = require('@babel/types')

const { parseScriptAst } = require('./parse')
const { extractDataFromScriptAst } = require('./traverse')

// 提取出某个生命周期的表达式
const extractLifecycleHookExpression = (content, hooks) => {
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

// 提取出某个对象属性
const extractObjectProperty = (content, objectType) => {
  const ast = parseScriptAst(content)
  const objectProperty = extractDataFromScriptAst(ast, objectType)
  return objectProperty
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

module.exports = {
  extractDataProperties,
  extractObjectProperty,
  extractLifecycleHookExpression
}
