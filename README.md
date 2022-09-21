# statusarea
A very simple status area that sits on the bottom of a page


How to use this:

First call:
```js
document.body.appendChild(statusarea.make())
```
To add the element to a page

Then later:
```js
document.querySelector('#statusarea').dispatchEvent(new CustomEvent('set', {detail: argArrayHere})) 
```

Where `argArrayHere` looks like:
```js
[
  HTMLElement | string | // the element or string to add
  {
    uncloned: bool, // do or dont clone the element, default to false 
    formatter:  function(string) HTMLElement,
    error: bool,    // colors red
    transient: bool // hide last messages right now or in a moment?
  }, ...
]
```
And this `argArrayHere` object is unordered

Examples, these are equivalent:

`[{error: true}, "hello", {transient: true}]`

and:

`["hello", {transient: true, error: true}]`
