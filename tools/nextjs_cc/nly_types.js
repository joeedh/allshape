"use strict";

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