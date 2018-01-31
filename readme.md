# JSON List Paths
A node.js utility to iterate through a JSON object and retrieve a list of all available paths. As well as property type and values. 

## Install 
`npm install json-list-paths`

## Usage
Pass a parsed JSON object to the function and will return a `JSONPathList` object. See methods below for usefullness.

```JavaScript
var jlp = require('json-list-paths')

var json = {
    a: 'abc',
    b: 123,
    c: {},
    d: []
}
jlp(json);
```

## Methods
### get _(path)_
Returns the `JSONPathList` object matching that key.

### list _([options])_
With no options the list method will return a string array of all the available paths in the object with a few notable identifiers. A `[]`  in the path indicates that the previous key was an array and any elements afterwards were found in a child of that array. When using the `reduce` method you will come across `{}` in the keys indicated that previous object was collapsed.

#### Options 
* **types** _[boolean, number] *optional_  - Returns types each path was found to have. As well as including some added types like `number-int`, `string-int`, `number-decimal`, `string-decimal`. That further add clarity to what type of values where found. If `true` or `0` will return all types, a number will return `n` amount per path.
* **values** _[boolean, number] *optional_ - Returns primitive values each path was found to have. If `true` or `0` will return all values, a number will return `n` amount per path.
* **children** _[boolean, number] *optional_ - Returns object properties if any for each path. If `true` or `0` will return all values, a number will return `n` amount per path.
* **keys** _[boolean, number] *optional_ - Is like `children` but returns properties for collapsed paths. _See `Reduce`_. If `true` or `0` will return all values, a number will return `n` amount per path.


### reduce _(options)_
The reduce method is used to collapse object properties down to one. This is useful if you have a JSON object that uses an id for the key _(an example might be an object with SKUs as the the keys)_. Objects that are collapsed will have `{}`in place of where the keys would have been in the path.
#### Options
* **keylimit** _[number]_ * optional - If an object has more keys than this number that it will be collapsed.
* **match** _[array]_ * optional - This is an `array` of `strings` or `regular expressions` that will be used to evalute each path, to see if it's child properties should collapse.
* **replace** _[array]_ * optional - This is an array of objects that will rewrite a given key, if the parent path and key match the values supplied.
    * **path** _[string, regular expression]_ - The parent path to match.
    * **key** _[string, regular expression]_ - The key to match.
    * **replace** _[string]_ - The string to replace with.
    * **stop** _[boolean]_ - Stop all further replacements.

#### Examples

_Using all available options for `list`_
```JavaScript
var jlp = require('json-list-paths');

var json = {
    items: {
        'PN1234': {
            name: 'Item 1',
            value: 12,
            quantity: 12
        },
        'PN123452': {
            name: 'Item 2',
            value: 10,
            quantity: 1
        },
        'G123': {
            name: 'Item 3',
            value: 20,
            quantity: 4
        }
    },
    total: {
        items: 3,
        quantity: 17,
        value: 234
    }

}
jlp(json)
    .reduce({
        match: ['.items']
    })
    .list({
        keys: true,
        values: true,
        types: true,
        children: true

    });

// {
//     '.': {
//         types: ['object'],
//         children: ['items', 'total']
//     },
//     '.items': {
//         types: ['object'],
//         children: ['{}']
//     },
//     '.items.{}':
//         {
//             types: ['dictionary', 'object'],
//             keys: ['PN1234', 'PN123452', 'G123'],
//             children: ['name', 'value', 'quantity']
//         },
//     '.items.{}.name':
//         {
//             values: ['Item 1', 'Item 2', 'Item 3'],
//             types: ['string']
//         },
//     '.items.{}.value': {
//         values: ['10', '12', '20'],
//         types: ['number-int']
//     },
//     '.items.{}.quantity': {
//         values: ['1', '4', '12'],
//         types: ['number-int']
//     },
//     '.total':
//         {
//             types: ['object'],
//             children: ['items', 'quantity', 'value']
//         },
//     '.total.items': {
//         values: ['3'],
//         types: ['number-int']
//     },
//     '.total.quantity': {
//         values: ['17'],
//         types: ['number-int']
//     },
//     '.total.value': {
//         values: ['234'],
//         types: ['number-int']
//     }
// }
```

_Using regular expressions `reduce` replace option_
```JavaScript
var json = {
    items: {
        'PN1234': {
            name: 'Item 1',
            value: 12,
            quantity: 12,
            main: true
        },
        'PN123452': {
            name: 'Item 2',
            value: 10,
            quantity: 1
        },
        'G123': {
            name: 'Item 3',
            value: 20,
            quantity: 4,
            style: 'g'
        }
    },
    total: {
        items: 3,
        quantity: 17,
        value: 234
    }

}

jlp(json)
    .reduce({
        replace: [{
            path: '.items',
            key: /^([A-Z]+).*/,
            replace: '$1_n',
            stop: true
        }]
    })
    .list();
    
// Result: 
// [
//     '.',
//     '.items',
//     '.items.PN_n',
//     '.items.PN_n.name',
//     '.items.PN_n.value',
//     '.items.PN_n.quantity',
//     '.items.PN_n.main',
//     '.items.G_n',
//     '.items.G_n.name',
//     '.items.G_n.value',
//     '.items.G_n.quantity',
//     '.items.G_n.style',
//     '.total',
//     '.total.items',
//     '.total.quantity',
//     '.total.value'
// ]
```