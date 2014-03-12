"use strict";

var CACHE_CYCLE_SIZE = 256;

function _cache_copy_object(obj) {
  var ob2;
  
  //"new obj.constructor(obj)" should, in theory, handle
  //subclasses of Strings, Booleans, and Numbers correctly.
  
  if (typeof obj == "string")
    return String(obj);
  else if (typeof obj == "number")
    return Number(obj);
  else if (typeof obj == "boolean")
    return Boolean(obj);
  else if (typeof obj == "function")
    return obj; //don't copy functions
  else if (obj instanceof String)
    return new obj.constructor(obj)
  else if (obj instanceof Number)
    return new obj.constructor(obj);
  else if (obj instanceof Boolean)
    return new obj.constructor(obj);
  else if (obj === undefined)
    return undefined;
  else if (obj === null)
    return null;
  else if (typeof(obj.copy) == "function")  //use obj.copy if it exists
    return obj.copy();
  
  //copy over any prototypical methods
  //not sure if non-prototypical methods are going to work
  //. . .
  if (obj.constructor && obj.constructor.prototype) {
    function F() {};
    F.prototype = obj.constructor.prototype;
    F.constructor = obj.constructor;
    
    ob2 = new F();
  }
  
  //we don't handle subtypes of arrays, since they often use 
  //different constructor parameters
  if (obj.constructor == Array || typeof obj == "array")
    ob2 = new Array(obj.length);
  else
    ob2 = {};
 
  var keys = Object.getOwnPropertyNames(obj);
  for (var i=0; i<keys.length; i++) {
    var k = keys[i];
    
    var d = Object.getOwnPropertyDescriptor(obj, k);
    if (("get" in d) || ("set" in d)) {
      Object.defineProperty(ob2, k, d);
    } else if (obj.hasOwnProperty(k) && k != "_c_id") {
      ob2[k] = _cache_copy_object(obj[k]);
    }
  }
  
  return ob2;
}

var copy_object_deep = _cache_copy_object;

var _cache_id_gen = 1;
class CacheCycle extends GArray {
  constructor(obj, tot) {
    Array.call(this, tot);
    
    for (var i=0; i<tot; i++) {
      this[i] = _cache_copy_object(obj);
      this[i]._cache_id = _cache_id_gen++;
    }
    
    this.cur = 0;
    this.length = tot;
  }
  
  next() {
    var ret = this[this.cur];
    this.cur = (this.cur+1) % this.length;
    
    return ret;
  }
};

var _c_idgen = 0;
class ObjectCache {
  constructor() {
    this.cycles = {};
    this.arrays = {};
    this.idmap = {};
  }
 
  cache_remove(obj) {
    if (obj == undefined || !("_cache_id" in obj)) {
      console.trace();
      console.log("WARNING: non-cached object ", obj, ", passed to ObjectCache.cache_remove");
      return;
    }
    
    var cycle = this.cycles[obj._cache_id];
    cycle.remove(obj);
    
    //delete cache reference
    delete obj._cache_id;
  }
  
  //fetches a cached  copy of templ.
  //note: you must pass the same templ
  //object each time to get the right
  //behavior.
  raw_fetch(templ, tot=CACHE_CYCLE_SIZE) {
    //return _cache_copy_object(templ); //XXX
    
    var id = templ._c_id;
    if (id == undefined) id = _c_idgen++;
    
    if (!(id in this.cycles)) {
      this.cycles[id] = new CacheCycle(templ, tot);
      var c = this.cycles[id];
      
      for (var i=0; i<c.length; i++) {
        this.idmap[c[i]._cache_id] = c;
      }
    }
    
    if (templ._c_id == undefined)
      templ._c_id = id;
    
    return this.cycles[id].next();
  }
  
  /*
    descriptor is an obj literal of the following layout:
    {
      [required parameter]
        obj : Object to be copied in to the cache system
      
      [optional parameters]
        init : Function to initialize (reset) obj copy
        cachesize : Size of obj cache
    }
  */
  
  is_cache_obj(obj) {
    return "_cache_id" in obj;
  }
  
  fetch(descriptor) {
    var d = descriptor;
    if (d.cachesize == undefined)
      d.cachesize = CACHE_CYCLE_SIZE;
    
    var obj = this.raw_fetch(d.obj, d.cachesize);
    if (d.init != undefined)
      d.init(obj);
    
    return obj;
  }
  
  getarr() {
    var arr = this.array(arguments.length);
    for (var i=0; i<arguments.length; i++) {
      arr[i] = arguments[i];
    }
    
    return arr;
  }
  
  array(int len) {
    var arr;
    
    if (!(len in this.arrays)) {
      arr = new Array(len);
      arr.length = len;
      this.arrays[len] = arr;
    } else {
      arr = this.arrays[len];
    }
    
    var arr2 = this.raw_fetch(arr);
    
    if (arr2.length > 8) {
      for (var i=0; i<arr2.length; i++) {
        arr2[i] = undefined;
      }
      arr2.length = len;
    }
    
    return arr2;
  }
}

var objcache = new ObjectCache()

var _itempl = {done : false, value : undefined};
function cached_iret() {
  //XXX
  //return {done : false, value : undefined};
  
  var ret = objcache.raw_fetch(_itempl);
  
  ret.done = false;
  ret.value = undefined;
  
  return ret;
}
