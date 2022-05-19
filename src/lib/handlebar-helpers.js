import Handlebars from 'handlebars'
import helpersMoment from 'handlebars-helper-moment'

const momentHelpers = helpersMoment();

export default {
  eq: (v1, v2) => v1 === v2,
  ne: (v1, v2) => v1 !== v2,
  lt: (v1, v2) => v1 < v2,
  gt: (v1, v2) => v1 > v2,
  lte: (v1, v2) => v1 <= v2,
  gte: (v1, v2) => v1 >= v2,
  and: (...args) => Array.prototype.slice.call(args, 0, args.length - 1).every(val => !!val),
  or: (...args) => Array.prototype.slice.call(args, 0, args.length - 1).some(val => !!val),
  includes: (v1, v2) => {
    if(!Array.isArray(v1)) v1 = v1.split(',');
    return v1.includes(v2);
  },
  cond: (v1, operator, v2) => {

    // Make sure that the operator is correctly formatted
    const element = document.createElement('input');
    element.innerHTML = operator;
    operator = element.textContent;

    // Switch to the matching collection
    switch(operator.toUpperCase()) {
      case '==':
      case 'EQ':
        return v1 == v2;
      case '===':
      case 'SEQ':
        return v1 === v2;
      case '!=':
      case 'NE':
        console.log(`Is '${v1}' != '${v2}' = ${v1 != v2}`);
        return v1 != v2;
      case '!==':
      case 'SNE':
        return v1 !== v2;
      case '<':
      case 'LT':
        return v1 < v2;
      case '>':
      case 'GT':
        return v1 > v2;
      case '<=':
      case 'LE':
        return v1 <= v2;
      case '>=':
      case 'GE':
        return v1 >= v2;
      case '||':
      case 'OR':
        return v1 || v2;
      case '&&':
      case 'AND':
        return v1 && v2;
      case 'INCLUDES':
        if(!Array.isArray(v1)) v1 = v1.split(',');
        return v1.includes(v2);
      default:
        throw new Error(`Operator '${operator}' is not valid`)
    }
  },
  variable: (varName, varValue, options) => {
    options.data.root[varName] = varValue
  },
  multiple: (array) => {
    if (!Array.isArray(array)) return false
    return array.length > 1
  },
  replace: (from, to, value = '') => value.toString().replace(from, to),
  isoDate: (date) => {
    try {
      return new Date(date).toISOString()
    } catch (error) {
      return date
    }
  },
  prettyDate: (date) => {
    try {
      const iso = new Date(date).toISOString()
      const dato = iso.split('T')[0].split('-')

      // Return in format dd.MM.yyyy
      return `${dato[2]}.${dato[1]}.${dato[0]}`
    } catch (error) {
      return date
    }
  },
  lowercase: (text) => {
    if (typeof text !== 'string') return ''
    return text.toLowerCase()
  },
  uppercase: (text) => {
    if (typeof text !== 'string') return ''
    return text.toUpperCase()
  },
  uppercaseFirst: (text) => {
    if (typeof text !== 'string') return ''
    return text.charAt(0).toUpperCase() + text.slice(1)
  },
  capitalize: (text) => {
    if (typeof text !== 'string') return ''
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
  },
  join: (input, lastPart = 'og') => {
    if (!Array.isArray(input)) return ''
    if (input.length === 0) return ''
    if (input.length === 1) return input[0]

    const arr = [...input].filter(inp => !!inp)
    const last = arr.pop()
    return arr.join(', ') + ` ${lastPart} ` + last
  },
  objectContains: (obj, text) => {
    if (!obj) return false
    const regex = new RegExp(text, 'i')
    return regex.test(JSON.stringify(obj))
  },
  concat: (firstpart, secondpart) => {
    if(firstpart.endsWith(secondpart)) return firstpart;
    return firstpart + secondpart;
  },
  paragraphSplit: (plaintext) => {
    let i; let output = '';
    const lines = plaintext.split(/\r\n|\r|\n/g);
    for (i = 0; i < lines.length; i++) {
      if (lines[i]) {
        output += '<p>' + lines[i] + '</p>';
      }
    }
    return new Handlebars.SafeString(output);
  },
  // Creates a markdown newline if just a newline is present
  markdownNewline: (text) => {
    text = Handlebars.Utils.escapeExpression(text);
    text = text.replace(/(\r\n|\n|\r)/gm, '\\\n');
    return new Handlebars.SafeString(text);
  },
  ...momentHelpers
}
