
let statusarea = {}

/**
How to use this:
document.body.appendChild(statusarea.make())
Then later:
document.querySelector('#statusarea').dispatchEvent(new CustomEvent({detail: argArrayHere}))
Where argArrayHere looks like:
[
  HTMLElement | string | // the element or string to add
  {
    uncloned: bool, // do or dont clone the element, default to false 
    formatter:  function(string) HTMLElement,
    error: bool,    // colors red
    transient: bool // hide last messages right now or in a moment?
  }, ...
]
And this argArrayHere object is unordered
eg:
[{error: true}, "hello", {transient: true}]
eq to:
["hello", {transient: true, error: true}]
*/
function __statusAreaLoader() {
  const maxHistory = 32
  
  /**
  isDefined(0)
  isDefined({a:1})
  isDefined(null)      // fails
  isDefined(undefined) // fails
  */
  function isDefined(obj) {
    if(typeof(obj) === 'undefined' || obj === undefined || obj === null)
      return false
    else
      return true
  }
  
  function elementThen(tag, fn = undefined) {
    let ret = document.createElement(tag)
    fn?.(ret)
    return ret
  }
  function plaintextElement(tag, text) {
    let ret = document.createElement(tag)
    if(text === undefined || text === null) // text is null or undefined
      throw new Error(`plaintextElement text is undefined`)
    else if(typeof text === 'string')
      ret.innerText = text
    else
      ret.innerText = String(text)
    return ret
  }
  
  /**
  toggleElementClass(elem, 'active')
  toggleElementClass(elem, class)
  Adds or removes the given class from elem to 'toggle' it
  */
  function toggleElementClass(elem, cla) {
    if(elem.classList.contains(cla))
      elem.classList.remove(cla)
    else
      elem.classList.add(cla)
  } 
  
  /**
  firstInstanceOf(Array, ["asdf", [1], 2, [3, [4]]]) // returns [1]
  */
  function firstInstanceOf(Cla, objs) {
    if(Array.isArray(Cla)) { // Cla like [Array, Object, ...]
      const ClaArray = Cla // rename for clarity
      return ClaArray.map(singleCla => firstInstanceOf(singleCla, objs))
    } else { // Cla like Array
      return mapApply(objs, singleObj => {
        if(singleObj instanceof Cla)
          return singleObj
      }, Cla !== Array)
    }
  }
  
  /**
  firstTyped('number', [1, [2], "3", {a:4}]) // 1
  firstTyped('array',  [1, [2], "3", {a:4}]) // [2]
  firstTyped('string', [1, [2], "3", {a:4}]) // "3"
  firstTyped('object', [1, [2], "3", {a:4}]) // {a:4}
  Selects the first deeply nested object in the second argument with a
  typeof string matching the first element
  A type string of 'array' matches Array.isArray(...)
  Use to get a single number, string, etc from a function's arguments obj when that 
  arg is the only one of that type
  */
  function firstTyped(typeString, objs) {
    if(Array.isArray(typeString)) { // typeString is like ['number', 'string', ...]
      const typeStringArray = typeString // rename for clarity
      return typeStringArray.map(singleTypeString => firstTyped(singleTypeString, objs))
    } else {
      return mapApplyOnlyTyped(typeString, objs, singleObj => {
        return singleObj
      })
    }
  }
  
  /**
  mapApplyOnlyTyped('number', [1, {a:'qwer'}, 'z'], fn)
  Maps fn only onto deeply nested elements of the second arg with a typeof matching the first element
  */
  function mapApplyOnlyTyped(typeString, objs, fn) {
    if(!Array.isArray(objs)) // redirect non-array objs arg to [objs]
      return mapApplyOnlyTyped(typeString, [objs], fn)
    // else:
    if(typeString === 'array') { // don't search deeply so we can catch arrays
      return mapApply(objs, singleObj => {
        if(Array.isArray(singleObj)) {
          let ret = fn(singleObj)
          if(isDefined(ret))
            return ret
        }
      })
    } else { // typeString is like 'number', 'string', ...
      return deepMapApply(objs, singleObj => {
        if(typeof singleObj === typeString) {
          let ret = fn(singleObj)
          if(isDefined(ret))
            return ret
        }
      })
    }
  }
  
  /**
  fromAny('a', {a: 1})               // 1
  fromAny('b', {a: 1})               // undefined
  fromAny('b', [{a: 1}, {b: 2}])     // 2
  fromAny('b', [[{a: 1}], [{b: 2}]]) // 2
  Looks for the first object in the second argument containing the first argument as a key,
  and returns that objects value for that key 
  */
  function fromAny(key, objs) {
    if(Array.isArray(key)) { // key is string[] // apply fromAny to each of keys elements
      const keyArray = key // rename for clarity
      return keyArray.map(singleKey => fromAny(singleKey, objs))
    } else { // key is a string
      return deepMapApply(objs, singleObj => {
        if((typeof singleObj === 'object') && (key in singleObj))
          return singleObj[key]
      })
    }
  }
  
  /**
  Shallow version:
  mapApply([[1,2],3,[4,[5,6]]], x => console.log(x)) // prints: [1, 2] 3 [4, [5, 6]]
  mapApply(7, x => console.log(x)) // prints: 7
  mapApply({a: 1, b: 2}, x => console.log(x)) // prints: {a: 1, b: 2}
  Deep version:
  mapApply([[1,2],3,[4,[5,6]]], x => console.log(x), true) // prints: 1 2 3 4 5 6
  The third argument (optional) is true for deep map, false for shallow map, number for map up to depth n
  mapApply([[1,2],3,[4,[5,6]]], x => console.log(x), 1) // prints: 1 2 3 4 [5, 6]
  */
  function mapApply(arg, fn, deep = false) {
    if(deep === true)
      deep = -1
    else if(deep === false)
      deep = 0
    if(Array.isArray(arg)) {
      const array = arg // rename for clarity
      for(const elem of array) {
        let ret
        if(deep !== 0)
          ret = Array.isArray(elem) ? mapApply(elem, fn, deep > 0 ? deep-1 : deep) : fn(elem)
        else
          ret = fn(elem)
        if(isDefined(ret))
          return ret
      }
    } else {
      return fn(arg)
    }
    return undefined
  }
  /**
  An alias of mapApply(arg, fn, -1)
  Maps the given function fn over all arrays in arg deeply
  ei: only applies fn to the deepest elements of arrays in arg
  */
  function deepMapApply(arg, fn) {
    return mapApply(arg, fn, -1)
  }
  
  function sanitizeHtmlString(str) {
    return str.replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  }
  
  function make() {
    return elementThen('div', statusarea => {
      statusarea.id = 'statusarea'
      statusarea.appendChild(elementThen('div', messagelist => {
        messagelist.classList.add('message-list')
        messagelist.appendChild(plaintextElement('div', ''))
      }))
      // clear button
      statusarea.appendChild(elementThen('input', clearbutton => {
        clearbutton.classList.add('clear-button')
        clearbutton.setAttribute('type', 'button')
        clearbutton.value = 'clear'
        clearbutton.addEventListener('click', clickevent => {
          const clearbutton = clickevent.target
          const statusarea = clearbutton.parentElement
          if(clickevent.altKey)
            clearToLast(statusarea)
          else
            hideToLast(statusarea)
        })
      }))
      // show all button
      statusarea.appendChild(elementThen('input', showbutton => {
        showbutton.classList.add('show-all-button')
        showbutton.setAttribute('type', 'button')
        showbutton.value = 'showall'
        showbutton.addEventListener('click', clickevent => {
          const showbutton = clickevent.target
          const statusarea = showbutton.parentElement
          toggleElementClass(statusarea, 'open')
        })
      }))
      // listen for set events
      statusarea.addEventListener('set', setevent => { // custom event set
        /*
          setevent.detail = [
            HTMLElement // the element to add
            {
              uncloned: bool, // do or dont clone the element, default to false 
              formatter:  function(string) HTMLElement,
              error: bool,    // colors red
              transient: bool // hide last messages right now or in a moment?
            }, ...
          ]
        */
        const statusarea = setevent.target
        set(statusarea, ...setevent.detail)
      })
    })
  }
  statusarea.make = make
  
  function hideToLast(statusarea) {
    if(!(statusarea ?? false)) // no statusarea on page
      return void 0
    const messagelist = statusarea.querySelector('.message-list')
    const messages = messagelist.children
    let cnt = 0
    for(let i = messages.length-1; i >= 0; i--){ // from farthest down the page to top
      cnt++
      const child = messages[i]
      if(child !== messagelist.lastChild)
        child.classList.add('closed')
      else
        child.classList.remove('closed')
      if(cnt > maxHistory)
        child.remove()
    }
    clearTimeout(hideTimeoutId)
    hideTimeoutId = -1
  }
  statusarea.hideToLast = hideToLast
  
  let hideTimeoutId = -1
  let hideTimeoutDelay = 1000*3
  function hideToLastMomentarily(statusarea) {
    if(!(statusarea ?? false)) // no statusarea on page
      return void 0
    if(hideTimeoutId !== -1) { // timeout already set
      clearTimeout(hideTimeoutId)
      hideTimeoutId = -1
    }
    hideTimeoutId = setTimeout(()=> hideToLast(statusarea), hideTimeoutDelay)
  }
  statusarea.hideToLastMomentarily = hideToLastMomentarily
  statusarea.setTransientHideDelay = function(value) {
    hideTimeoutDelay = value
  }
  
  function clearToLast(statusarea) {
    if(!(statusarea ?? false)) // no statusarea on page
      return void 0
    const messagelist = statusarea.querySelector('.message-list')
    const messages    = messagelist.children
    for(let i = messages.length-1; i >= 0; i--){ // from farthest down the page to top
      const child = messages[i]
      if(child !== messagelist.lastChild)
        child.remove()
    }
  }
  statusarea.clearToLast = clearToLast
  
  function set(statusarea, ...args) {
    if(!(statusarea ?? false)) // no statusarea on page
      return void 0
    let text
    let messagelist = statusarea.querySelector('.message-list')
    let newElem = firstInstanceOf(HTMLElement, args)
    // element from args
    if(isDefined(newElem)) { // element given
      if(fromAny('uncloned', args) ?? false)
        newElem = newElem.cloneNode(true)
    } else if(isDefined(text = firstTyped('string', args))) { // text given
      let formatter = fromAny('formatter', args) // formatter turns text to HTMLElements
      if(formatter !== undefined)
        newElem = formatter(sanitizeHtmlString(text))
      else
        newElem = plaintextElement(`span`, text)
    }
    // add to messagelist or increment counter
    if(!messagelist.lastChild.firstChild?.isEqualNode(newElem)) { // ie: no duplicates
      messagelist.appendChild(elementThen(`div`, message => {
        if(fromAny('error', args) ?? false)
          message.classList.add('error')
        message.appendChild(newElem)
        message.appendChild(elementThen('div', dupcount => {
          dupcount.classList.add('duplicate-count')
          dupcount.dataset.count = "0"
        }))
      }))
    } else { // increment duplicate counter
      let counter = messagelist.lastChild.querySelector('.duplicate-count')
      counter.dataset.count = parseInt(counter.dataset.count ?? "0") + 1
    }
    // hide rest
    if(fromAny('transient', args) ?? false)
      hideToLastMomentarily(statusarea)
    else
      hideToLast(statusarea)
  }
  statusarea.set = set
}
__statusAreaLoader()