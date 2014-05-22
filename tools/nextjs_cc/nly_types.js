"use strict";

function len(iter) {
  if (iter == undefined) return 0
  
  if (iter instanceof Array || typeof iter == "array") {
    return iter.length;
  }
  
  if (iter instanceof String || typeof iter == "string") {
    return iter.length;
  }
  
  var i = 0;
  for (var item in iter) {
    i++;
  }
  
  return i;
}

function pythonic_iter(val) {
  var do_arr = (val instanceof String || typeof val == "str")
  do_arr |= (val instanceof Array || typeof val == "array")
  
  if (do_arr) {
    var ret = [];
    for (var i=0; i<val.length; i++) {
      ret.push(val[i]);
    }
    
    return new GArray(ret);
  } else {
    return val;
  }
}

String.prototype.has = function(val) {
  return this.search(val) >= 0;
}

Array.prototype.has = function(val) {
  return this.indexOf(val) >= 0;
};

var _enumerate_ret = [0, 0];
function enumerate(iter) {
  var i = 0;
  //var ret = _enumerate_ret;
  
  var ret = []
  
  for (var item in pythonic_iter(iter)) {
    //ret[0] = i;
    //ret[1] = item;
    ret.push([i, item]);
    //yield ret;
    i++;
  }
  
  return new GArray(ret)
}

class NlyParser {
}

class NlyProd extends Array {
  constructor(len) {
    Array.call(this, len)
    
    this.length = len;
    this.linenos = new Array(len);
  }
}

class NlyProdFunc {
  constructor(order, grammar, func, name) {
    this.order = order;
    this.grammar = grammar;
    this.func = func;
    this.name = name;
  }
}

class NlyTokenDef {
}

class PDEF {
  constructor(grammar, func) {
    this.grammar = grammar;
    this.func = func;
  }
}

var NError = Error;