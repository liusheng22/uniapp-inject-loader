const generator = require('@babel/generator').default

// 将 ast 转换为 code
const astToCode = (ast) => {
  // 将AST转换回源代码
  const { code } = generator(ast)
  if (code.endsWith(';')) {
    return code.slice(0, -1)
  }
  return code
}

module.exports = {
  astToCode
}
