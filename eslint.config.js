// eslint-disable-next-line
const { defineConfig } = require('@sujian/eslint-config')

module.exports = defineConfig({}, [
  {
    rules: {
      '@typescript-eslint/no-var-requires': 'off'
    }
  }
])
