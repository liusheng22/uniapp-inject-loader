// 将字符串: test-demo-components  转为testDemoComponents
const toCamelCase = (str) => {
  return str.replace(/-(\w)/g, function (all, letter) {
    return letter.toUpperCase()
  })
}

module.exports = {
  toCamelCase
}
