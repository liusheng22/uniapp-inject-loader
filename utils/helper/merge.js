const traverse = require('@babel/traverse').default
const t = require('@babel/types')

const { astToCode } = require('./ast')
const { parseScriptAst } = require('./parse')

// 生命钩子注入
const lifeCycleInjectCode = (content, newExpression, hooks) => {
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

// 对象属性合并
const objectPropertyMergeToAst = (content, newObjectProperty, objectType) => {
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

module.exports = {
  dataMergeToAst,
  objectPropertyMergeToAst,
  lifeCycleInjectCode
}
