#ifndef EXPORT
#define EXPORT
#define EXPORT_FUNC(func)
#endif

/*Object model:
  
  A basic single-inheritance object model,
  with static methods.  Multiple inheritance may
  be implemented later.
  
  All defined object types are stored in the global variable 
  defined_classes (which is a GArray).
  
  Each constructor function has the following properties:
    prototype                 : The prototype; if inherited is created 
                                with Object.create(parent.prototype)
    prototype.prior           : the parent prototype, if one exists
    prototype.constructor     : the constructor function
    prototype.__prototypeid__ : a private, runtime-generated unique id number
    prototype.__class__       : constructor.name
    prototype.prototype       : a self-reference so instanced objects get .prototype.
                                This should be removed; can use __proto__ instead.
    __statics__               : a list of static methods or variables declared with
                                define_static()
*/

//this actually ends up being a GArray
var defined_classes = new Array();
var defined_tests = new Array();

function create_test(obj) {
  defined_tests.push(obj);
}

var int _prototype_id_gen = 1
function test_inherit_multiple() {
  function a() {
  }
  create_prototype(a);
  a.prototype.test = function() {
    console.log("a", this.constructor.name);
  }
  
  function b() {
  }
  inherit_multiple(b, [a]);
  b.prototype.test = function() {
    console.log("b", this.constructor.name);
  }
  
  function c() {
  }
  inherit_multiple(c, [a]);
  c.prototype.test1 = function() {
    console.log("c", this.constructor.name);
  }

  function d() {
  }
  inherit_multiple(d, [b, c]);
  d.prototype.test1 = function() {
    console.log("d", this.constructor.name);
  }
  
  console.log(d.prototype, c.prototype, b.prototype, a.prototype);
  console.log("------------")
  console.log(new d() instanceof a, new d() instanceof b, (new d()) instanceof c);
  
  //new a().test();
  //new b().test();
  //new c().test();
  new d().test();
  
  return [d, b, c, a];
}

/*
okay. for multiple inheritance to work properly,
we're going to have to override the instanceof operator 
in js_cc.  that's doable, but not worth it right now.

A python C3 multiple inheritance model.
It works by creating copies of parent prototypes
(as usual), but changes their own parent relationships
so as to linearize the prototype chain.

function inherit_multiple(obj, parents) {
  defined_classes.push(obj);
  
  function merge(ps, lsts) {
    var lst = []
    
    lsts.push(ps);
    
    for (var u=0; u<2000; u++) {
      if (lsts.length == 0)
        break;
      
      for (var i=0; i<lsts.length; i++) {
        if (lsts[i].length == 0)
          continue;
        
        var p = lsts[i][0];
        var bad = false;
        
        if (0) {
          for (var j=0; j<lst.length; j++) {
            if (lst[j].__prototypeid__ == p.__prototypeid__) {
              bad = true;
              break;
            }
          }
        }
        
        for (var j=0; !bad && j<lsts.length; j++) {
          if (i == j) continue;
          var l = lsts[j];
          
          for (var k=1; k<l.length; k++) {
            if (l[k].prototype.__prototypeid__ == p.prototype.__prototypeid__) {
              bad = true;
              break;
            }
          }
        }
        
        if (!bad) {
          lst.push(p);
          lsts[i].splice(lsts[i].indexOf(p), 1);
          
          for (var j=0; j<lsts.length; j++) {
            var l = lsts[j];
            
            for (var k=0; k<l.length; k++) {
              if (l[k].prototype.__prototypeid__ == p.prototype.__prototypeid__) {
                l.splice(l[k], 1);
                break;
              }
            }
          }
          
          //don't continue looping if we have more 
          //prototypes to process
          if (lsts[i].length > 0) {
            i -= 1;
          } else {
            lsts[i].splice(i, 1);
            i -= 1;
          }
        }
      }
    }
    
    //lst = lst.reverse();
    var tot=0;
    for (var i=0; i<lsts.length; i++) {
      tot += lsts[i].length;
    }
    
    if (tot > 0) {
      throw new Error("Could not resolve multiple inheritance");
    }
    
    console.log("-->", lst);
    console.log(lsts);
    return lst;
  }
  
  if (parents.length == 1) {
    obj.__clsorder__ = [parents[0]];
  } else {
    var lsts = [];
    
    for (var i=0; i<parents.length; i++) {
      lsts.push(parents[i].__clsorder__);
    }
    
    obj.__clsorder__ = merge(parents, lsts);
  }
  
  //build prototype chain
  var root = Object.create(Object.prototype);
  
  var cs = obj.__clsorder__;
  console.log(cs.length, "<==");
  for (var i=0; i<cs.length; i++) {
    console.log(cs[i].name);
    var p = Object.create(cs[i].prototype);
    p.prototype = root;
    p.constructor = cs[i];
    root = p;
  }
  
  proto = Object.create(root);
  proto.constructor = obj;
  proto.prototype = root;
  
  console.log(proto);
  
  if (0) {
    for (var i=0; i<cs.length; i++) {
      var p = cs[i];
      var keys = Object.keys(p.prototype);
      
      for (var j=0; j<keys.length; j++) {
        proto[keys[j]] = p.prototype[keys[j]];
      }
    }
  }
  
  proto.priors = obj.__clsorder__;
  proto.constructor = obj;
  proto.__prototypeid__ = _prototype_id_gen++;
  proto.__class__ = obj.name;
  
  obj.prototype = proto;
}
*/

function inherit(obj, parent) {
  defined_classes.push(obj);
  
  obj.prototype = Object.create(parent.prototype);
  obj.prototype.prior = parent.prototype;
  obj.prototype.constructor = obj;
  obj.prototype.__prototypeid__ = _prototype_id_gen++;
  obj.prototype.__class__ = obj.name;
  obj.prototype.prototype = obj.prototype;
  
  var slist;
  if (parent.__statics__ != undefined) {
    slist = new Array(parent.__statics__.length);
    for (var i=0; i<slist.length; i++) {
      slist[i] = parent.__statics__[i];
    }
  } else {
    slist = [];
  }
  
  obj.__statics__ = slist;
 
  for (var i=0; i<slist.length; i++) {
    var st = slist[i];
    
    obj[st] = parent[st];
  }
}

EXPORT_FUNC(inherit)

function create_prototype(obj) {
  defined_classes.push(obj);
  
  obj.prototype.constructor = obj;
  obj.prototype.prototype = obj.prototype;
  obj.prototype.__prototypeid__ = _prototype_id_gen++;
  obj.prototype.__class__ = obj.name;
  obj.__statics__ = [];
}
EXPORT_FUNC(create_prototype)

function define_static(obj, name, val) {
  obj[name] = val;
  obj.__statics__.push(name);
}

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
  
  if ("__iterator__" in obj) {
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
  if ("__iterator__" in obj) {
    return obj.__iterator__();
  } else {
    return new _KeyValIterator(obj);
  }
}
