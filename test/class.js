var assert 		= require('assert');
var classified 	= require('../classified');

//Sample Root Class
var Root = classified(function() {
	var prototype = {
		SOME_CONSTANT: 'foo',
		sampleProperty: 4.5,
		sampleDeepProperty: {
			sample1: 'Hello',
			sample2: [4, 5, 6, 7],
			sample3: {
				bool	: true,
				regex	: /^abc/,
				date	: new Date(),
				string	: String
			}
		},
		
		//protected
		_sampleProperty: 5.5,
		_sampleDeepProperty: {
			sample1: '_Hello',
			sample2: [8, 9, 0, 1]
		},
		
		//private
		__sampleProperty: 6.5,
		__sampleDeepProperty: {
			sample1: '__Hello',
			sample2: [12, 13, 14, 15]
		}
	};
	
	prototype.___construct = function() {
		this.constructCalled = true;
	};
	
	prototype.sampleMethod = function() {
		return this.SOME_CONSTANT;
	};
	
	prototype._sampleMethod = function() {
		return '_bar';
	};
	
	prototype.__sampleMethod = function() {
		return '__zoo';
	};
	
	prototype.sampleAccessMethod = function() {
		return this.sampleMethod()
		+ this._sampleMethod()
		+ this.__sampleMethod();
	};
	
	return prototype;
});

describe('Class Test Suite', function() {
	describe('Basic Building Tests', function() {
		var root = Root.load();
		
		it('should call construct', function() {
			assert.equal(true, root.constructCalled);
		});
		
		it('should align properties correctly', function() {
			assert.equal(4.5, root.sampleProperty);
			assert.equal('Hello', root.sampleDeepProperty.sample1);
			assert.equal(5, root.sampleDeepProperty.sample2[1]);
			assert.equal(true, root.sampleDeepProperty.sample3.bool);
			assert.equal(true, root.sampleDeepProperty.sample3.regex instanceof RegExp);
			assert.equal(true, root.sampleDeepProperty.sample3.date instanceof Date);
			assert.equal(String, root.sampleDeepProperty.sample3.string);
		});
		
		it('should not be able to access protected', function() {
			assert.equal('undefined', typeof root._sampleProperty);
			assert.equal('undefined', typeof root._sampleDeepProperty);
			assert.equal('undefined', typeof root._sampleMethod);
		});
		
		it('should not be able to access private', function() {
			assert.equal('undefined', typeof root.__sampleProperty);
			assert.equal('undefined', typeof root.__sampleDeepProperty);
			assert.equal('undefined', typeof root.__sampleMethod);
		});
		
		it('should be able to access protected and private inside a method', function() {
			assert.equal('foo_bar__zoo', root.sampleAccessMethod());
		});
		
		it('should patrol constants', function() {
			root.SOME_CONSTANT = 'bar';
			assert.equal('foo', root.sampleMethod());
		});
	});
	
	describe('Inheritance Tests', function() {
		var root = Root.load();
		
		it('should copy constants', function() {
			var child = classified({ SOME_CONSTANT_2: 44.5 }).extend(Root.definition()).load();
			assert.equal('foo', child.SOME_CONSTANT);
		});
		
		it('should call construct', function() {
			var child = classified({}).extend(Root.definition()).load();
			assert.equal(true, child.constructCalled);
		});
		
		it('should be the same as root', function() {
			var child = classified({}).extend(Root.definition()).load();
			assert.equal(child.sampleProperty, root.sampleProperty);
			assert.equal(child.sampleDeepProperty.sample1, root.sampleDeepProperty.sample1);
			assert.equal(child.sampleDeepProperty.sample2[1], root.sampleDeepProperty.sample2[1]);
			assert.equal(child.sampleDeepProperty.sample3.bool, root.sampleDeepProperty.sample3.bool);
			assert.equal(child.sampleDeepProperty.sample3.regex, root.sampleDeepProperty.sample3.regex);
			assert.equal(child.sampleDeepProperty.sample3.date, root.sampleDeepProperty.sample3.date);
			assert.equal(child.sampleDeepProperty.sample3.string, root.sampleDeepProperty.sample3.string);
		});
		
		it('should not change properties of root', function() {
			var child = classified({}).extend(Root.definition()).load();
			
			child.sampleProperty = 5.5;
			child.sampleDeepProperty.sample1 = 'hi';
			child.sampleDeepProperty.sample3.bool = false;
			
			assert.notEqual(child.sampleProperty, root.sampleProperty);
			assert.notEqual(child.sampleDeepProperty.sample1, root.sampleDeepProperty.sample1);
			assert.notEqual(child.sampleDeepProperty.sample3.bool, root.sampleDeepProperty.sample3.bool);
		});
		
		it('should be able to add properties', function() {
			var child = classified({
				childSample: 4
			}).extend(Root.definition()).load();
			
			child.sampleProperty = 5.5;
			child.sampleDeepProperty.sample1 = 'hi';
			child.sampleDeepProperty.sample3.bool = false;
			
			assert.equal(4, child.childSample);
			assert.equal('undefined', typeof root.childSample);
		});
		
		it('should be able access parent methods', function() {
			var child = classified({
				sampleMethod: function() {
					return this.___parent.sampleMethod()
				}
			}).extend(Root.definition()).load();
			
			assert.equal('foo', child.sampleMethod());
		});
		
		it('should be able access parent protected methods', function() {
			var child = classified({
				sampleMethod: function() {
					return this.___parent._sampleMethod();
				}
			}).extend(Root.definition()).load();
			
			assert.equal('_bar', child.sampleMethod());
		});
		
		it('should not be able access parent private methods', function() {
			var child = classified({
				sampleMethod: function() {
					return typeof this.___parent.__sampleMethod;
				}
			}).extend(Root.definition()).load();
			
			assert.equal('undefined', child.sampleMethod());
		});
	});
	
	describe('Grand Children Tests', function() {
		var Child = classified({
			sampleMethod: function() {
				return this.___parent._sampleMethod();
			}
		}).extend(Root.definition());
		
		var Trait = classified({
			_sampleMethod2: function() {
				return this.sampleMethod();
			}
		});
		
		var grand = classified({
			sampleMethod: function() {
				return this.___parent.sampleMethod();
			},
			
			sampleMethod2: function() {
				return this._sampleMethod2();
			}
		}).extend(Child.definition()).extend(Trait.definition()).load();
		
		it('should be able access parent protected methods', function() {
			assert.equal('_bar', grand.sampleMethod());
		});
		
		it('should be able access traits', function() {
			assert.equal('_bar', grand.sampleMethod2());
		});
	});
});