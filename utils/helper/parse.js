const babelParser = require('@babel/parser')
const { parse } = require('@vue/compiler-sfc')

// 将 script的content 转换为 ast
const parseScriptAst = (content) => {
  const { descriptor } = parse(content)
  const scriptContent = descriptor.source || descriptor.script.content
  const ast = babelParser.parse(scriptContent, {
    sourceType: 'module',
    plugins: ['jsx']
  })
  return ast
}

module.exports = {
  parseScriptAst
}
