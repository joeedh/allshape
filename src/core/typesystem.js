"not_a_module";

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
    prototype.prototype       : the parent prototype, if one exists
    prototype.constructor     : the constructor function
    prototype.__prototypeid__ : a private, runtime-generated unique id number
    prototype.__class__       : constructor.name
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

function get_non_props(obj) {
  var names = Object.getOwnPropertyNames(obj);
  
  var ret = [];
  
  for (var i=0; i<names.length; i++) {
    var k = names[i];
    var des = Object.getOwnPropertyDescriptor(obj, k);
    
    var add = des.get == undefined && des.set == undefined;
    
    if (add) {
      ret.push(k);
    }
  }
  
  return ret;
}

function __typesystem_copy_prop(dest, src, name) {
  var des = Object.getOwnPropertyDescriptor(src, name);
  
  if (des != undefined && (des.get != undefined || des.set != undefined)) {
    Object.defineProperty(dest, name, des);
  } else {
    dest[name] = src[name];
  }
}

var int _prototype_id_gen = 1
function test_inherit_multiple() {
  class z {
  }
  
  a = Array;
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
  c.prototype.test = function() {
    console.log("c", this.constructor.name);
  }

  function d() {
  }
  inherit_multiple(d, [b, c]);
  d.prototype.test1 = function() {
    console.log("d", this.constructor.name);
  }
  
  //console.log(d.prototype, c.prototype, b.prototype, a.prototype);
  console.log("------------")
  var iof = __instance_of;
  var A = new a(), B = new b(), C = new c(), D = new d();
  
  console.log(iof(D, a), iof(D, b), iof(D, c), iof(D, z));
  //console.log(new d() instanceof a, new d() instanceof b, (new d()) instanceof c);
  
  /*new a().test();
  new b().test();
  new c().test();*/
  new d().test();
  
  return [d, b, c, a];
}

var native_types = {};

function init_native_type(obj) {
  obj.__subclass_map__ = {};
  obj.__prototypeid__ =_prototype_id_gen++;
  obj.__subclass_map__[obj.__prototypeid__] = obj;
  
  obj.__clsorder__ = [];
  obj.__parents__ = [];
  obj.__statics__ = {};
  
  obj.prototype.__class__ = obj.name;
  obj.prototype.__prototypeid__ = obj.__prototypeid__;
  
  native_types[obj.prototype.__prototypeid__] = obj;
}

init_native_type(Function);
init_native_type(Array);
init_native_type(Number);
init_native_type(String);
init_native_type(Boolean);
init_native_type(Error);

/*
A python C3 multiple inheritance model.
It works by creating copies of parent prototypes
but changes their own parent relationships
so as to linearize the prototype chain.

the final prototype is flattened, so that all the methods
of the parent prototypes are copied into it.
*/

function _time_ms() {
  if (window.performance)
    return window.performance.now();
  else
    return new Date().getMilliseconds();
}

var _im_total = 0;
var _im_max = {
  time : 0,
  cls  : undefined
}

function _get_obj_keys(ob) {
  var ks = Object.getOwnPropertyNames(ob);
  
  if (ob.toString != undefined)
    ks.push("toString");
  return ks;
}

var _ts_exclude = ["__prototypeid__", "__class__", "priors", "prototype", "constructor"];
var eset = {};

for (var i=0; i<_ts_exclude.length; i++) {
  eset[_ts_exclude[i]] = _ts_exclude[i];
}
_ts_exclude = eset;

delete _ts_exclude["toString"];
 
function simple_inherit_multiple(obj, parents) {
  var exclude = _ts_exclude;
  var parent = parents[0];
  
  defined_classes.push(obj);
  
  obj.__clsorder__ = [];
  var p = parents[0].prototype;
  
  while (p != undefined && p.constructor != undefined && p != undefined && p.prototype != p && p.prototype !== Object.prototype) {
    obj.__clsorder__.push(p.constructor);
    p = p.prototype;
  }
  
  var proto = Object.create(parent.prototype);
  proto.priors = obj.__clsorder__;
  proto.constructor = obj;
  proto.__prototypeid__ = _prototype_id_gen++;
  proto.__class__ = obj.name;
  
  obj.prototype = proto;
  obj.__prototypeid__ = proto.__prototypeid__;
  obj.__parents__ = parents;
  obj.__subclass_map__ = {};
  obj.__subclass_map__[obj.__prototypeid__] = obj
  
  var name = obj.name;
  obj.__hash__ = function() { return name };
  
  //add to instanceof helper map
  if (!("__subclass_map__" in parent)) {
    if (!("__prototypeid__" in parent)) {
      parent.__prototypeid__ = _prototype_id_gen++;
      parent.prototype.__prototypeid__ = parent.__prototypeid__;
    }
    parent.__subclass_map__ = {};
    parent.__subclass_map__[parent.__prototypeid__] = parent;
  }
  
  parent.__subclass_map__[obj.__prototypeid__] = obj;
  
  obj.__statics__ = {};
  
  //add inherited statics
  obj.__flatstatics__ = {}
 
  if (("__statics__" in parent)) {
    var keys = _get_obj_keys(parent.__statics__);
    
    for (var j=0; j<keys.length; j++) {
      var k = keys[j];
      if (k == "__proto__" || (exclude.hasOwnProperty(k) && k != "toString"))
        continue;
      
      obj.__flatstatics__[k] = k;
      obj[k] = parent[k];
      }
  }
  
  for (var k in obj.__statics__) {
    obj.__flatstatics__[k] = obj.__statics__[k];
  }
  
  return obj;
}

function inherit_multiple(obj, parents, mod, name) {
  var s = _time_ms();
    
  if (name != undefined) {
    //console.log(name);
  }
  
  //return simple_inherit_multiple(obj, parents);
  
  if (name != undefined && mod.already_processed[name] != undefined) {
    //console.log("double call!", name);
    
    //don't just pass through existing object directly, that might mess up closures
    var newcls = mod.already_processed[name];
    
    obj.__prototypeid__ = newcls.__prototypeid__;
    obj.__clsorder__ = newcls.__clsorder__;
    obj.__class__ = newcls.__class__;
    obj.__parents__ = newcls.__parents__;
    obj.__subclass_map__ = newcls.__subclass_map__;
    obj.__hash__ = newcls.__hash__;
    obj.__statics__ = newcls.__statics__;
    obj.__flatstatics__ = newcls.__flatstatics__;
    
    if (newcls.__flatstatics__ != undefined) {
      for (var k in newcls.__flatstatics__) {
        obj[k] = newcls[k];
      }
    }
    
    obj.prototype = newcls.prototype;
    obj.prototype.constructor = obj;
    
    return obj;
  }
  
  //var ret = simple_inherit_multiple(obj, parents);
  var ret = inherit_multiple_intern(obj, parents);
  
  var time = _time_ms() - s;
  if (time > _im_max.time) {
    _im_max.time = time;
    _im_max.cls = obj;
  }
  
  _im_total += time;
  
  return ret;
}

function inherit_multiple_intern(obj, parents) {
  if (handle_duplicate_calls(obj)) return;
  
  var is_single = parents.length == 1;
  
  var exclude = _ts_exclude;
  var bad = false;
  
  if (parents == undefined) {
    bad = true;
  } else {
    for (var i=0; i<parents.length; i++) {
      if (parents[i] == undefined || typeof(parents[i]) != "function") bad = true;
    }
  }
  
  if (bad)
    throw new Error("Bad call to inherit_multiple");
  
  defined_classes.push(obj);
  
  var mergesteps=0;
  
  parents.reverse();
  function merge(ps, lsts) {
    var lst = []
    
    lsts.push(ps);
    var totlst = 10000;
    var trylimit = 2000;
    
    for (var u=0; u<trylimit; u++) {
      if (lsts.length == 0 || totlst == 0)
        break;
      
      totlst = 0;
      for (var i=0; i<lsts.length; i++) {
        if (lsts[i].length == 0) {
          continue;
        }
        
        totlst++;
        
        var p = lsts[i][0];
        var bad = false;
        
        for (var j=0; !bad && j<lsts.length; j++) {
          if (i == j) continue;
          var l = lsts[j];
          
          for (var k=1; k<l.length; k++) {
            if (l[k].__prototypeid__ == p.__prototypeid__) {
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
              if (l[k].__prototypeid__ == p.__prototypeid__) {
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
    
    if (u == trylimit) {
      throw new Error("Could not resolve inheritance order for ", obj.name);
    }
    
    mergesteps = u;
    
    var tot=0;
    for (var i=0; i<lsts.length; i++) {
      tot += lsts[i].length;
    }
    
    if (tot > 0) {
      throw new Error("Could not resolve multiple inheritance");
    }
    
    return lst;
  }
  
  if (parents.length == 1) {
    var cs = [];
    var p = parents[0];
    
    if ("__clsorder__" in p) {
      var pcs = p.__clsorder__;
      for (var i=0; i<pcs.length; i++) {
        cs.push(pcs[i]);
      }
    }
    
    cs.push(p);
    obj.__clsorder__ = cs;
  } else if (parents.length > 0) {
    var lsts = [];
    
    for (var i=0; i<parents.length; i++) {
      var cpy = [];
      var corder = parents[i].__clsorder__;
      
      for (var j=0; j<corder.length; j++) {
        cpy.push(corder[j]);
      }
      
      lsts.push(cpy);
    }
    
    obj.__clsorder__ = merge(parents, lsts);
  }
  
  //new object prototype
  proto = Object.create(Object.prototype);
  delete proto.toString;
     
  //build prototype chain
  var cs = obj.__clsorder__;
  
  if (is_single) {
    var cs2 = [];
    for (var i=0; i<cs.length; i++) {
      var p = cs[i];
      cs2.push(p.prototype);
    }
  } else {
    var thekeys = []
    for (var k=0; k<cs.length; k++) {
      var p2 = cs[k];
      thekeys.push(_get_obj_keys(p2.prototype));
    }
    
    var st = _time_ms();
    var cs2 = [];
    for (var i=0; i<cs.length; i++) {
      cs2.push(Object.create(Object.prototype));
      
      var p = cs[i];
      var keys = _get_obj_keys(p.prototype);
      
      for (var j=0; j<keys.length; j++) {
        var des = Object.getOwnPropertyDescriptor(p.prototype, keys[j]);
        
        if (des != undefined && (des.get != undefined || des.set != undefined)) {
          __typesystem_copy_prop(cs2[i], p.prototype, keys[j]);
          continue;
        }
        
        var val = p.prototype[keys[j]];
        var bad = false;
        
        for (var k=0; !bad && k<i; k++) {
          if (k == i) continue;
          var p2 = cs[k];
          
          if (p2.__prototypeid__ == p.__prototypeid__) continue;
          
          var keys2 = thekeys[k];
          for (var l=0; !bad && l<keys2.length; l++) {
            var des2 = Object.getOwnPropertyDescriptor(p2.prototype, keys2[l]);
            
            if (des2 != undefined && (des2.get != undefined || des2.set != undefined)) {
              continue;
            }
            
            if (p2.prototype[keys2[l]] === val) {
              bad = true;
              break;
            }
          }
        }
        
        if (!bad)
          __typesystem_copy_prop(cs2[i], p.prototype, keys[j]);
      }
    }
    
    var time = _time_ms()-st;
    if (time > 10) {
      //console.log(time, cs2.length);
    }
  }
  
  function excluded(k) {
    return exclude.hasOwnProperty(k) && k != "toString";
  }
  
  for (var i=0; i<cs2.length; i++) {
    if (is_single) {
      cs2[i].__prototypeid__ = cs[i].__prototypeid__;
      cs2[i].constructor = cs[i];
      cs2[i].__class__ = cs[i].name;
    }
    
    var p = cs2[i];
    var keys = _get_obj_keys(p);
    
    for (var j=0; j<keys.length; j++) {      
      if (excluded(keys[j]))
        continue;
      if (keys[j] == "toString" && p[keys[j]] == Object.prototype.toString)
        continue;
      
      __typesystem_copy_prop(proto, p, keys[j]);
    }
    
    if (is_single && i > 0) {
      var keys2 = _get_obj_keys(cs2[i-1]);
      
      for (var j=0; j<keys2.length; j++) {
        if (excluded(keys2[j])) continue;
        if (keys2[j] in cs2[i]) continue;
        
        __typesystem_copy_prop(cs2[i], cs2[i-1], keys2[j]);
      }
      
      cs2[i].prototype == cs2[i-1];
    }
  }
  
  if (cs2.length > 0)
    proto.prototype = cs2[cs2.length-1];
  
  proto.priors = obj.__clsorder__;
  proto.constructor = obj;
  proto.__prototypeid__ = _prototype_id_gen++;
  proto.__class__ = obj.name;
  
  obj.__mergesteps = mergesteps;
  obj.prototype = proto;
  obj.__prototypeid__ = proto.__prototypeid__;
  obj.__parents__ = parents;
  obj.__subclass_map__ = {};
  obj.__subclass_map__[obj.__prototypeid__] = obj
  var name = obj.name;
  obj.__hash__ = function() { return name };
  
  //add to instanceof helper map
  for (var i=0; i<cs2.length; i++) {
    if (!("__subclass_map__" in cs[i])) {
      if (!("__prototypeid__" in cs[i])) {
        cs[i].__prototypeid__ = _prototype_id_gen++;
        cs[i].prototype.__prototypeid__ = cs[i].__prototypeid__;
      }
      cs[i].__subclass_map__ = {};
      cs[i].__subclass_map__[cs[i].__prototypeid__] = cs[i];
    }
    
    cs[i].__subclass_map__[obj.__prototypeid__] = obj;
  }
  
  obj.__statics__ = {};
  
  //add inherited statics
  obj.__flatstatics__ = {}
  for (var i=0; i<cs.length; i++) {
    if (!("__statics__" in cs[i])) continue;
    var keys = _get_obj_keys(cs[i].__statics__);
    
    for (var j=0; j<keys.length; j++) {
      var k = keys[j];
      if (k == "__proto__" || excluded(k))
        continue;
      
      obj.__flatstatics__[k] = k;
      obj[k] = cs[i][k];
    }
  }
  
  for (var k in obj.__statics__) {
    obj.__flatstatics__[k] = obj.__statics__[k];
  }
  
  return obj;
}

function subclass_of(child, parent) {
  var clsorder = child.__clsorder__;
  for (var i=0; i<clsorder.length; i++) {
    var p = clsorder[i];
    
    if (p == parent || p.name == parent.name)
      return true;
  }
  
  return false;
}

function __instance_of(child, parent) {
  if (parent == undefined)
    return child == undefined;
  if (typeof child != "object" && typeof child != "function")
    return typeof child == typeof(parent); //return btypeof(child) == btypeof(parent);
  
  if ("__subclass_map__" in parent && "__prototypeid__" in child) {
    return child.__prototypeid__ in parent.__subclass_map__;
  } else {
    //console.log("falling back on normal instanceof");
    //console.log(parent.__subclass_map__, parent)
    return child instanceof parent;
  }
}

var instance_of = __instance_of;

function inherit(obj, parent) {
  if (handle_duplicate_calls(obj)) return;
  
  inherit_multiple(obj, [parent]);
}

function inherit_old(obj, parent) {
  if (handle_duplicate_calls(obj)) return;
  
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

function handle_duplicate_calls(cls) {
  if (cls.__prototypeid__ != undefined && !(cls.__prototypeid__ in native_types)) {
    console.trace("Warning: duplicate call to type system init; possible module cycle?", cls.name);
    return 1;
  }
  
  return 0;
}

function create_prototype(obj) {
  if (handle_duplicate_calls(obj)) return;
  
  defined_classes.push(obj);
  
  obj.prototype.constructor = obj;
  //obj.prototype.prototype = obj.prototype;
  obj.prototype.__prototypeid__ = _prototype_id_gen++;
  obj.prototype.__class__ = obj.name;
  
  obj.__prototypeid__ = obj.prototype.__prototypeid__;
  obj.__statics__ = [];
  obj.__clsorder__ = [];
  obj.__parents__ = [];
  obj.__subclass_map__ = {};
  obj.__subclass_map__[obj.__prototypeid__] = obj;
  var name = obj.name;
  obj.__hash__ = function() { return name };
  
  return obj;
}
EXPORT_FUNC(create_prototype)

function define_static(obj, name, val) {
  obj[name] = val;
  obj.__statics__[name] = name;
}

function prior(thisproto, obj) {
  return thisproto.prototype.prototype;
  /*
  var proto = obj.constructor.prototype;
  
  while (proto.__prototypeid__ != thisproto.__prototypeid__) {
    //console.log(obj.constructor.name, proto, obj.__prototypeid__);
    proto = proto.prototype;
  }
  
  return proto.prototype;*/
}
EXPORT_FUNC(prior)

function arr_iter(keys)
{
  this.keys = keys;
  this.cur = 0;
  
  this[Symbol.iterator] = function() {
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
  
  if (obj[Symbol.iterator]) {
    return obj[Symbol.iterator]();
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
  
  this[Symbol.iterator] = function() {
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
  
  [Symbol.iterator]() {
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
  if (obj[Symbol.iterator]) {
    return obj[Symbol.iterator]();
  } else {
    return new _KeyValIterator(obj);
  }
}

function define_docstring(func, docstr) {
  func.__doc__ = docstr;
  
  return func;
}
