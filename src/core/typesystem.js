#ifndef EXPORT
#define EXPORT
#define EXPORT_FUNC(func)
#endif

//this actually ends up being a GArray
var defined_classes = new Array();
var defined_tests = new Array();

function create_test(obj) {
  defined_tests.push(obj);
}

var int _prototype_id_gen = 1
function inherit(obj, parent) {
  defined_classes.push(obj);
  
  obj.prototype = Object.create(parent.prototype);
  obj.prototype.prior = parent.prototype;
  obj.prototype.constructor = obj;
  obj.prototype.__prototypeid__ = _prototype_id_gen++;
  obj.prototype.__class__ = obj.name;
  obj.prototype.prototype = obj.prototype;
}
EXPORT_FUNC(inherit)

function create_prototype(obj) {
  defined_classes.push(obj);
  
  obj.prototype.constructor = obj;
  obj.prototype.prototype = obj.prototype;
  obj.prototype.__prototypeid__ = _prototype_id_gen++;
  obj.prototype.__class__ = obj.name;
}
EXPORT_FUNC(create_prototype)

function prior(thisproto, obj) {
  var proto = obj.prototype;
  thisproto = thisproto.prototype;
  
  while (proto.__prototypeid__ != thisproto.__prototypeid__) {
    proto = proto.prior;
  }
  
  return proto.prior;
}
EXPORT_FUNC(prior)

function arr_iter(keys)
{
  this.keys = keys;
  this.cur = 0;
  
  this.__iterator__ = function() {
    return this;
  }
  
  this.next = function() {
    if (this.cur >= this.keys.length) {
      return {value : undefined, done : true};
    }
    
    return {value : this.keys[this.cur++], done : false};
  }
}

/*the grand __get_iter function.
  extjs_cc does not use c.__it erator__ when
  compiling code like "for (var a in c)" to
  harmony ECMAScript; rather, it calls __get_iter(c).
*/
function __get_iter(obj)
{
  if (obj == undefined) {
    console.trace();
    print_stack();
    throw new Error("Invalid iteration over undefined value")
  }
  
  if (obj.__proto__.hasOwnProperty("__iterator__") || obj.hasOwnProperty("__iterator__")) {
    return obj.__iterator__();
  } else {
    var keys = []
    for (var k in obj) {
      keys.push(k)
    }
    return new arr_iter(keys);
  }
}

//a basic array iterator utility function
var arr_iter = function(keys)
{
  this.ret = {done : false, value : undefined};
  this.keys = keys;
  this.cur = 0;
  
  this.__iterator__ = function() {
    return this;
  }
  
  this.next = function() {
    if (this.cur >= this.keys.length) {
      this.ret.done = true;
      
      return this.ret;
    }
    
    this.ret.value = this.keys[this.cur++];
    return this.ret;
  }
}

class _KeyValIterator {
  constructor(obj) {
    this.ret = {done : false, value : [undefined, undefined]};
    this.i = 0;
    this.obj = obj;
    
    this.keys = Object.keys(obj);
  }
  
  __iterator__() {
    return this;
  }
  
  next() {
    if (this.i >= this.keys.length) {
      this.ret.done = true;
      this.ret.value = undefined;
      
      return this.ret;
    }
    
    var k = this.keys[this.i];
    var v = this.obj[k];
    
    this.ret.value[0] = k;
    this.ret.value[1] = v;
    this.i++;

    return this.ret;
  }
}

var Iterator = function(obj) {
  if (obj.__proto__.hasOwnProperty("__iterator__") || obj.hasOwnProperty("__iterator__")) {
    return obj.__iterator__();
  } else {
    return new _KeyValIterator(obj);
  }
}
