const isObject = (obj) => {
  return type(obj) === 'object'
}

const isArray = (arr) => {
  return type(arr) === 'array'
}

const isFunction = (fn) => {
  return type(fn) === 'function'
}

const isBoolean = (bool) => {
  return type(bool) === 'boolean'
}

const isNull = (nullObj) => {
  return type(nullObj) === 'null'
}

const isUndefined = (undefinedObj) => {
  return type(undefinedObj) === 'undefined'
}

const isString = (str) => {
  return type(str) === 'string'
}

const isValue = (value) => {
  return value !== null && value !== undefined
}

/**
 * @description 根据传入的参数，返回对应的类型
 * @param {*} obj
 * @returns {string} boolean | null | undefined | number | string | object | array | function
 */
const type = (obj) => {
  const toString = Object.prototype.toString
  const map = {
    '[object Boolean]': 'boolean',
    '[object Null]': 'null',
    '[object Undefined]': 'undefined',
    '[object Number]': 'number',
    '[object String]': 'string',
    '[object Object]': 'object',
    '[object Array]': 'array',
    '[object Function]': 'function'
  }
  return map[toString.call(obj)]
}

module.exports = {
  isObject,
  isArray,
  isFunction,
  isBoolean,
  isNull,
  isUndefined,
  isString,
  isValue,
  type
}
