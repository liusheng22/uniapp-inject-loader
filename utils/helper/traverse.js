const traverse = require('@babel/traverse').default

// 从script的 ast 中提取所需要数据
const extractDataFromScriptAst = (ast, dataTypes) => {
  let data = []
  traverse(ast, {
    ObjectProperty(path) {
      if (path.node.key.name === dataTypes) {
        data = path.node.value.properties
      }
    }
  })
  return data
}

// 从script的 ast 中提取生命周期钩子
const extractHooksFromScriptAst = (ast, hooks) => {
  let lifeCycleHooks = []
  traverse(ast, {
    ObjectMethod(path) {
      if (path.node.key.name === hooks) {
        lifeCycleHooks = path.node.body.body
      }
    }
  })
  return lifeCycleHooks
}

module.exports = {
  extractDataFromScriptAst,
  extractHooksFromScriptAst
}
