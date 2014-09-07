(function() {
	/* Definition
	-------------------------------*/
	var classified = function() {
		/* Properties
		-------------------------------*/
		var method 		= {},
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
				prototype = prototype();
			}
			
			//if it is not an object
			if(typeof prototype !== 'object') {
				throw 'Expecting argument 1 in define() to be an object or return an object.';
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
		method.extend = function(prototype) {
			//if prototype is a function
			if(typeof prototype === 'function') {
				//the return of that function should be an object
				prototype = prototype.prototype;
			}
			
			//if it is not an object
			if(typeof prototype !== 'object') {
				throw 'Expecting argument 1 in extend() to be an object or return an object.';
			}
			
			extend.push(prototype);
			
			return this;
		};
		
		/**
		 * Returns the publically accessable
		 * class definition function
		 *
		 * @return function
		 */
		method.get = function() {
			var stack 			= 0,
				parentStack		= 0,
				final 			= {}, 
				parents 		= {}, 
				protect 		= {},
				parentSecret	= {},
				secret			= _getPrivate(definition); 
			
			//throw in the extends
			for(var i = 0; i < extend.length; i++) {
				_copy(_getPublic(extend[i])		, final			, true);
				_copy(_getProtected(extend[i])	, protect		, true);
				_copy(_getPubtected(extend[i])	, parents		, true);
				_copy(_getPrivate(extend[i])	, parentSecret	, true);
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
			
			//do some magic
			//parse final
			for(key in final) {
				if(final.hasOwnProperty(key)) {
					//if it's not a function
					if(typeof final[key] !== 'function' || _isNative(final[key])) {
						continue;
					}
					
					//We do it this way to capture closure variables that 
					//changes inside of a loop. Inside of the alter callback
					//we do not want to reference variables outside of the closure
					final[key] = (function(callback) {
						return function() {
							//we need to count stack calls to know when to modify
							//the instance and when it is safe to de-modify the instance
							
							//if no stack
							if(!stack++) {
								//setup the instance
								//remember the scope
								var self = this, property;
								
								//make the magic parent variable an object
								this.__parent = {}
								
								//again we need to set the parents up
								//everytime we call this method
								for(property in parents) {
									if(parents.hasOwnProperty(property)) {
										//the new callback simply applies
										//the original scope. Again, we do 
										//it this way to capture closure variables 
										//that changes inside of a loop. 
										this.__parent[property] = (function(callback) {
											return function() {
												//for parents add
												if(!parentStack++) {
													//lets set up private
													for(property in parentSecret) {
														if(parentSecret.hasOwnProperty(property)) {
															self[property] = parentSecret[property];	
														}
													}
												}
												
												var results = callback.apply(self, arguments);
												
												//if there is no more stack count
												if(!--parentStack) {
													//remove private
													for(property in parentSecret) {
														if(parentSecret.hasOwnProperty(property)) {
															delete self[property];	
														}
													}
												}
												
												return results;
											};
										})(parents[property]);	
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
							if(!--stack) {
								//remove parent
								delete this.__parent;
								
								//remove protected
								for(property in protect) {
									if(protect.hasOwnProperty(property)) {
										delete this[property];	
									}
								}
								
								//remove private
								for(property in secret) {
									if(secret.hasOwnProperty(property)) {
										delete this[property];	
									}
								}
							}
							
							return results;
						};
					})(final[key]);
				}
			}
			
			//empty class container
			var container = function() {
				if(typeof this.construct === 'function') {
					//construct magic
					this.construct.apply(this, arguments);
				}
			}, prototype = container.prototype = final;
			
			return container;
		};
		
		/**
		 * Returns class defined instantiation
		 *
		 * @return object
		 */
		method.load = function() {
			//empty class container
			var definition = function() {};
			
			definition.prototype = this.get().prototype;
			
			var instance = new definition();
				
			if(typeof instance.construct === 'function') {
				//manually call construct here
				instance.construct.apply(instance, arguments);	
			}
			
			return instance;
		};
		
		/* Private Methods
		-------------------------------*/
		var _copy = function(source, destination, deep) {
			var j, key, keys = Object.keys(source), i = keys.length;
			
			while (i--) {
				key = keys[i];
				destination[key] = source[key];
				
				if(deep
				&& typeof source[key] === 'object'
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
				if(!/^_[a-zA-Z0-9]/.test(key)
				&& !/^__[a-zA-Z0-9]/.test(key)) {
					destination[key] = prototype[key];
				}
			}
			
			return destination;
		};
		
		var _getProtected = function(prototype) {
			var destination = {};
			for(var key in prototype) {
				if(/^_[a-zA-Z0-9]/.test(key)) {
					destination[key] = prototype[key];
				}
			}
			
			return destination;
		};
		
		var _getPrivate = function(prototype) {
			var destination = {};
			for(var key in prototype) {
				if(/^__[a-zA-Z0-9]/.test(key)) {
					destination[key] = prototype[key];
				}
			}
			
			return destination;
		};
		
		var _getPubtected = function(prototype) {
			var destination = {};
			for(var key in prototype) {
				if(!/^__[a-zA-Z0-9]/.test(key)) {
					destination[key] = prototype[key];
				}
			}
			
			return destination;
		};
		
		return method;
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
			}
		});
	//how about jQuery?
	} else if(typeof jQuery === 'function' && typeof jQuery.extend === 'function') {
		jQuery.extend({
			classified: function(definition) {
				definition = definition || {};
				return classified().define(definition);
			}
		});
	} else if(window) {
		window.classified = function(definition) {
			definition = definition || {};
			return classified().define(definition);
		}
	}
})();