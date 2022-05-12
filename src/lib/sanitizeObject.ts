import DOMPurify from 'dompurify'

interface sanitizerOptions {
  sanitizedText?: string,
  debug?: boolean
}

/**
 * 
 * @param {object} obj 
 * @param {object} options
 * @param {string} options.sanitizedText If sanitized replace with this text
 * @param {boolean} options.debug Outputs what it is doing in the console
 * @returns 
 */
 export default function sanitizeObject(obj : any, options : sanitizerOptions = {}) : any {
  // Input validation
  if(!obj) return obj;
  const type = typeof obj;
  if(type !== 'object') throw new Error(`Input object cannot be of type '${type}'`)


  /**
   * Writes to console if debug option is true
   * @param {string} message 
   * @param {Number} level 
   * @returns 
   */
  function log(message, level) {
    if(options.debug !== true) return;

    let spaces = '';
    for(let i = 0; i < level; i++) {
      spaces += '  ';
    }
    console.log(spaces + message);
  }

  /**
   * Sanitizes a value
   * @param {string} value 
   * @returns { string }
   */
  function sanitize(value) {
    const unsanitized = value;
    let sanitized = DOMPurify.sanitize(value);

    if(unsanitized && !sanitized && options && options.sanitizedText) return options.sanitizedText

    return sanitized;
  }

  // Recursive function
  function recurse(obj, key, parent, level) {
    // If object, recurse
    level++;
    if(!obj) return;

    /*
      Handle different data types
    */
    const type = typeof obj;
    // If array
    if(Array.isArray(obj)) {
      const itemsToRemove : Array<any> = [];
      for(let i = 0; i < obj.length; i++) {
        let itemType = typeof obj[i];
        
        if(itemType === 'object') recurse(obj[i], undefined, obj, level);
        else if(itemType === 'function') itemsToRemove.push(obj[i])
        else parent[key][i] = sanitize(parent[key][i])
      }

      parent[key] = parent[key].filter((i) => !itemsToRemove.includes(i));
    }
    // If object
    else if(type === 'object') {
      for(const key in obj) {
        log(key, level)
        recurse(obj[key], key, obj, level)
      }
    }
    else if(type === 'function') delete parent[key];
    else {
      parent[key] = sanitize(parent[key])
      log(parent[key], level)
    }
  }

  for(const key in obj) {
    log(key, 0)
    recurse(obj[key], key, obj, 0)
  }
}