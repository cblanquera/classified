/**
 * Adds protected, private, constants, parent(super)
 * functionality to regular defined classes.
 * In the backend the methods are being hijacked
 * creating the extra public properties and destroying them
 * after it finishes. 
 * 
 * The idea came from http://ejohn.org/blog/simple-javascript-inheritance/
 * 
 * The main quirk is when dealing with async inside the methods. In these cases,
 * methods need to be stored statically in order to use it inside of an async
 */
(function() {
	/* Definition
	-------------------------------*/
	var registry = {}, classified = function() {
		/* Constants
		-------------------------------*/
		var INVALID_DEFINE = 'Expecting argument 1 in define() to be an object or return an object.';
		var INVALID_TRAIT = 'Expecting argument 1 in trait() to be a registry item, an object or return an object.';
		
		/* Properties
		-------------------------------*/
		var method = function() {
			return method.load.apply(method, arguments);
		},
		
		definition	= {},
		extend		= [];
			
		/* Public Methods
		-------------------------------*/
		/**
		 * Defines the class
		 *
		 * @param function|object - if function, must return an object
		 * @return this
		 */
		method.define = function(prototype) {
			//if prototype is a function
			if(typeof prototype === 'function') {
				//the return of that function should be an object
				var define = {};
				prototype = prototype(define);
				
				if(!prototype) {
					prototype = define;
				}
			}
			
			//if it is not an object
			if(typeof prototype !== 'object') {
				throw INVALID_DEFINE;
			}
			
			//loop and add to allow partial definitions
			for(var key in prototype) {
				if(prototype.hasOwnProperty(key)) {
					definition[key] = prototype[key];
				}
			}
			
			return this;
		};
		
		/**
		 * Returns the full class definition
		 * including the protected and private
		 * properties
		 *
		 * @return object
		 */
		method.definition = function() {
			var final = {};
			//throw in the extends
			for(var i = 0; i < extend.length; i++) {
				_copy(extend[i], final, true);
			}
			
			//finally copy the class definition
			_copy(definition, final, true);
			
			return final;
		};
		
		/**
		 * Returns all the parents of this definition
		 *
		 * @return array
		 */
		method.parents = function() {
			return extend();
		};
		
		/**
		 * Adds a parent to be combined with the definition
		 *
		 * @param function|object - if function, will use prototype
		 * @return this
		 */
		method.trait = function(prototype) {
			//if prototype is a string
			//and it's definied in the registry
			if(typeof prototype === 'string') {
				//is it a saved state?
				if(typeof registry[prototype] !== 'undefined') {
					prototype = registry[prototype];
				//its a string and we do not know
				//what to do with it
				} else {
					throw INVALID_TRAIT;
				}
			}
			
			//if prototype is a function
			if(typeof prototype === 'function') {
				//the return of that function should be an object
				prototype = prototype.prototype;
			}
			
			//if it is not an object
			if(typeof prototype !== 'object') {
				throw INVALID_TRAIT;
			}
			
			extend.push(prototype);
			
			return this;
		};
		
		/**
		 * Creates a child definition
		 *
		 * @param function|object - if function, must return object
		 * @return function
		 */
		method.extend = function(prototype) {
			return classified().define(prototype).trait(this.definition());
		};
		
		/**
		 * Returns the publically accessable
		 * class definition function
		 *
		 * @return function
		 */
		method.get = function() {
			var stack 			= { method: 0, parents: 0 },
				final 			= {}, 
				parents 		= {}, 
				protect 		= {},
				parentSecret	= {},
				secret			= _copy(_getPrivate(definition), {}, true); 
			
			//throw in the extends
			for(var i = 0; i < extend.length; i++) {
				_copy(_getPublic(extend[i]), final, true);
				_copy(_getProtected(extend[i]), protect, true);
				_copy(_getPubtected(extend[i]), parents, true);
				_copy(_getPrivate(extend[i]), parentSecret, true);
			}
			
			//throw in the definition now
			_copy(_getPublic(definition), final, true);
			_copy(_getProtected(definition), protect, true);
			
			//remove private methods from parent private that already exists
			for(var key in parentSecret) {
				if(parentSecret.hasOwnProperty(key)) {
					//if it exists in secret
					if(typeof secret[key] !== 'undefined') {
						//remove from parent secret
						delete parentSecret[key];
					}
				}
			}
			
			//consider constants
			var constants = Object.freeze(_getConstants(final));
			
			//collect all data we need for the hijacking
			//or collect all hostages :)
			var compressed = {
				definition	: definition,
				protect		: protect,
				secret		: secret,
				constants	: constants,
				parents		: parents,
				stack		: stack,
				parentSecret: parentSecret };
			
			//do some magic
			//parse final
			for(key in final) {
				if(final.hasOwnProperty(key)) {
					//if it's not a function
					if(typeof final[key] !== 'function' || _isNative(final[key])) {
						continue;
					}
					
					compressed.key 			= key;
					compressed.callback 	= final[key];
					
					//We do it this way to capture closure variables that 
					//changes inside of a loop. Inside of the alter callback
					//we do not want to reference variables outside of the closure
					final[key] = _hijackMethod(compressed);
				}
			}
			
			container.prototype = final;
			
			return container;
		};
		
		/**
		 * Returns class defined instantiation
		 *
		 * @return object
		 */
		method.load = function() {
			return this.get().load.apply(null, arguments);
		};

		/**
		 * Registers this class for extend
		 *
		 * @param string
		 * @return this
		 */
		method.register = function(name) {
			registry[name] = this.definition();
			return this;
		};
		
		/* Class Container
		-------------------------------*/
		var container = function() {
			if(typeof this.___construct === 'function') {
				//construct magic
				this.___construct.apply(this, arguments);
			}
		};
		
		//bind the loader to the container
		container.load = function() {
			//empty class container
			var definition = function() {};
			
			definition.prototype = container.prototype;
			
			var instance = new definition();
				
			if(typeof instance.___construct === 'function') {
				//manually call construct here
				instance.___construct.apply(instance, arguments);	
			}
			
			return instance;
		};
		
		return method;
	};
	
	/* Private Methods
	-------------------------------*/
	var _hijackMethod = function(compressed) {
		//expand
		var definition		= compressed.definition;
		var key				= compressed.protect;
		var callback		= compressed.callback;
		var protect			= compressed.protect;
		var secret			= compressed.secret;
		var constants		= compressed.constants;
		var parents			= compressed.parents;
		var stack		 	= compressed.stack;
		var parentSecret	= compressed.parentSecret;
		
		return function __classifiedBinded__() {
			//we need to count stack calls to know when to modify
			//the instance and when it is safe to de-modify the instance
			
			//if no stack
			if(!stack.method++) {
				//setup the instance
				//remember the scope
				var self = this, property;
				
				//make the magic parent variable an object
				this.___parent = {}
				
				//again we need to set the parents up
				//everytime we call this method
				for(property in parents) {
					if(parents.hasOwnProperty(property)) {
						//the new callback simply applies
						//the original scope. Again, we do 
						//it this way to capture closure variables 
						//that changes inside of a loop. 
						this.___parent[property] = _hijackParent(parents[property], self, stack, parentSecret);	
					}
				}
				
				//also lets set up protect
				for(property in protect) {
					if(protect.hasOwnProperty(property)) {
						this[property] = protect[property];	
					}
				}
				
				//also lets set up private
				for(property in secret) {
					if(secret.hasOwnProperty(property)) {
						this[property] = secret[property];	
					}
				}
				
				//is it inherited?
				if(!definition[key]) {
					//give the parent private as well
					for(property in parentSecret) {
						if(parentSecret.hasOwnProperty(property)) {
							this[property] = parentSecret[property];	
						}
					}
				}
			}
			
			//always inject constants
			for(property in constants) {
				if(constants.hasOwnProperty(property)) {
					this[property] = constants[property];	
				}
			}
			
			// The method only need to be bound temporarily, so we
			// remove it when we're done executing
			results = callback.apply(this, arguments);
			
			//if there is no more stack count
			if(!--stack.method) {
				//remove parent
				delete this.___parent;
				
				//remove protected
				for(property in protect) {
					if(protect.hasOwnProperty(property)) {
						protect[property] = this[property];
						delete this[property];	
					}
				}
				
				//remove private
				for(property in secret) {
					if(secret.hasOwnProperty(property)) {
						secret[property] = this[property];
						delete this[property];	
					}
				}
				
				//remove the parent private as well
				//in any case
				for(property in parentSecret) {
					if(parentSecret.hasOwnProperty(property)) {
						parentSecret[property] = this[property];
						delete this[property];
					}
				}
			}
			
			return results;
		};
	};
	
	var _hijackParent = function(callback, scope, stack, secret) {
		return function __classifiedBinded__() {
			var property;
			//for parents add
			if(!stack.parents++) {
				//lets set up private
				for(property in secret) {
					if(secret.hasOwnProperty(property)) {
						scope[property] = secret[property];	
					}
				}
			}
			
			var results = callback.apply(scope, arguments);
			
			//if there is no more stack count
			if(!--stack.parents) {
				//remove private
				for(property in secret) {
					if(secret.hasOwnProperty(property)) {
						delete scope[property];	
					}
				}
			}
			
			return results;
		};
	};
	
	var _copy = function(source, destination, deep) {
		var j, key, keys = Object.keys(source), i = keys.length;
		
		while (i--) {
			key = keys[i];
			destination[key] = source[key];
			
			if(deep
			&& typeof source[key] === 'object'
			&& source[key] !== null
			&& !_isNative(source[key])) {
				destination[key] = _copy(source[key], {}, deep);
			} else if(deep && source[key] instanceof Array) {
				destination[key] = _copy(source[key], [], deep);
			}
		}
		
		return destination;
	};
	
	var _isNative = function(value) {
		//do the easy ones first
		if(value === Date
		|| value === RegExp
		|| value === Math
		|| value === Array
		|| value === Function
		|| value === JSON
		|| value === String
		|| value === Boolean
		|| value === Number
		|| value instanceof Date
		|| value instanceof RegExp
		|| value instanceof Array
		|| value instanceof String
		|| value instanceof Boolean
		|| value instanceof Number) {
			return true;
		}
		
		if((/\{\s*\[native code\]\s*\}/).test('' + value)) {
			return true;
		}
		
		//see: http://davidwalsh.name/detect-native-function
		// Used to resolve the internal `[[Class]]` of values
		var toString = Object.prototype.toString;
		
		// Used to resolve the decompiled source of functions
		var fnToString = Function.prototype.toString;
		
		// Used to detect host constructors (Safari > 4; really typed array specific)
		var reHostCtor = /^\[object .+?Constructor\]$/;
		
		// Compile a regexp using a common native method as a template.
		// We chose `Object#toString` because there's a good chance it is not being mucked with.
		var reNative = RegExp('^' +
		// Coerce `Object#toString` to a string
		String(toString)
			// Escape any special regexp characters
			.replace(/[.*+?^${}()|[\]\/\\]/g, '\\$&')
			// Replace mentions of `toString` with `.*?` to keep the template generic.
			// Replace thing like `for ...` to support environments like Rhino which add extra info
			// such as method arity.
			.replace(/toString|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$');
		
		var type = typeof value;
		return type === 'function'
			// Use `Function#toString` to bypass the value's own `toString` method
			// and avoid being faked out.
			? reNative.test(fnToString.call(value))
			// Fallback to a host object check because some environments will represent
			// things like typed arrays as DOM methods which may not conform to the
			// normal native pattern.
			: (value && type === 'object' && reHostCtor.test(toString.call(value))) || false;
	};
	
	var _getConstants = function(prototype) {
		var destination = {};
		for(var key in prototype) {
			if(/^[A-Z0-9_]+$/.test(key)) {
				destination[key] = prototype[key];
			}
		}
		
		return destination;
	};
	
	var _getPublic = function(prototype) {
		var destination = {};
		for(var key in prototype) {
			if(prototype.hasOwnProperty(key)) {
				if(!/^_[a-zA-Z0-9]/.test(key)
				&& !/^__[a-zA-Z0-9]/.test(key)) {
					destination[key] = prototype[key];
				}
			}
		}
		
		return destination;
	};
	
	var _getProtected = function(prototype) {
		var destination = {};
		for(var key in prototype) {
			if(prototype.hasOwnProperty(key)) {
				if(/^_[a-zA-Z0-9]/.test(key)) {
					destination[key] = prototype[key];
				}
			}
		}
		
		return destination;
	};
	
	var _getPrivate = function(prototype) {
		var destination = {};
		for(var key in prototype) {
			if(prototype.hasOwnProperty(key)) {
				if(/^__[a-zA-Z0-9]/.test(key)) {
					destination[key] = prototype[key];
				}
			}
		}
		
		return destination;
	};
	
	var _getPubtected = function(prototype) {
		var destination = {};
		for(var key in prototype) {
			if(prototype.hasOwnProperty(key)) {
				if(typeof prototype[key] === 'function' 
				&& !/^__[a-zA-Z0-9]/.test(key)) {
					destination[key] = prototype[key];
				}
			}
		}
		
		return destination;
	};
	
	/* Adaptor
	-------------------------------*/
	//if node
	if(typeof module === 'object' && module.exports) {
		module.exports = function(definition) {
			definition = definition || {};
			return classified().define(definition);
		};
	//if AMD
	} else if(typeof define === 'function') {
		define(function() {
			return function(definition) {
				definition = definition || {};
				return classified().define(definition);
			};
		});
	//how about jQuery?
	} else if(typeof jQuery === 'function' && typeof jQuery.extend === 'function') {
		jQuery.extend({
			classified: function(definition) {
				definition = definition || {};
				return classified().define(definition);
			}
		});
	//ok fine lets put it in windows.
	} else if(typeof window === 'object') {
		window.classified = function(definition) {
			definition = definition || {};
			return classified().define(definition);
		}
	}
})();