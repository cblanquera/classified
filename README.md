#Classified

  Real OOP for Javascript.

### Installation

```bash
$ npm install classified
```

  For client side you can just include the `index.js`

### Usage

#### Node and RequireJS

```
var classified = require('classified');
classified();
```

#### jQuery

```
jQuery.classified();
```

#### Client Side

```
classified();
```

## Quick Start

```
var classified = require('classified');

//root definition
var RootClass = classified({
	//constants
	SOME_CONSTANT: 'foo',
	
	//public properties
	sampleProperty: 4.5,
	
	//protected properties
	_sampleProperty: 5.5,
	
	//private properties
	__sampleProperty: 6.5,
	
	//constructor
	___construct: function() {
		this.constructCalled = true;
	},
	
	//public methods
	sampleMethod: function() {
		return this._sampleMethod();
	},
	
	//protected methods
	_sampleMethod: function() {
		return this.__sampleMethod();
	},
	
	//private methods
	__sampleMethod: function() {
		return this.SOME_CONSTANT + this._sampleProperty;
	}
});

//child definition
//you can use object or function as the definition
var ChildClass = RootClass.extend(function() {
	var prototype = {};
	
	//constants
	prototype.SOME_CONSTANT_2 = 'bar';
	
	//protected properties
	prototype._sampleProperty = 7.5;
	
	//public methods
	prototype.sampleMethod = function() {
		return this._sampleMethod();
	};
	
	//protected methods
	prototype._sampleMethod = function() {
		return this.___parent._sampleMethod();
	};
	
	return prototype;
});

//instantiate child
var child = ChildClass.load();

//test it
console.log(child.sampleMethod()); //--> foo7.5

try {
	child._sampleMethod();
} catch(e) {
	console.log('Protected call did not work');
}
```

### Features

  * Public, Private, Protected
  * Constants
  * Inheritance
  * Traits
  * Works on server or client

## Why ?

  While interviewing at Yahoo! in 2009, they asked me if it was possible to write protected functionality in JS.
  I said yes. They said No. I didn't get the job. Now I found this useful for my future developments. 
  I updated my proof with the latest features from JS.

### Methods

  * define(object|function) - Defines the class
  * extend(object|function) - Adds a parent to be combined with the definition
  * definition() - Returns the entire definition including the protected and private properties
  * parents() - Returns direct parents of this definition
  * get() - Returns the publically accessable class definition function
  * load() - Returns class defined instantiation
  * register(string) - saves a state of the definition which can be recalled in trait
  * trait(string|function|object) - will setup the provided as a parent, if string will recall from registry

### What's up with the underscores?

  * _ - protected properties and methods
  * __ - private properties and methods
  * ___ - Magic placeholder (Waiting on harmony)