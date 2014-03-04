"use strict";

class ASTNode extends Array {
  constructor() {
    Array.call(this);
    this.length = 0;
    this.type = 0;
    
    this.line = 0;
    this.lexpos = 0;
    this.col = 0;
    this.file = "";
  }
  
  toSource() {
    return this.toString();
  }
  
  toString(tlevel=0) {
    function tab(n) {
      var s = "";
      for (var i=0; i<n; i++) s += "  ";
      return s;
    }
    var t = tab(tlevel);
    
    var typestr = "";
    
    var s = t + typestr + this.constructor.name + " " + this.extra_str() + " {\n";
    for (var c in this) {
      if (c == undefined)
        break;
      s += c.toString(tlevel+1);
    }
    s += t + "}\n"
    return s
  }
  
  extra_str() {
    return ""
  }
  push(item) {
    if (typeof item == "string" || item.constructor.name == "String") {
      item = new IdentNode(item);
    }
    
    if (this.length != 0) {
      this[this.length-1].next = item;
      item.prev = this[this.length-1];
    } else {
      item.next = item.prev = undefined;
    }
    
    Array.prototype.push.call(this, item);
    item.parent = this;
  }
  
  add(item) {
    this.push(item);
  }
  
  __iterator__() {
    return new GArrayIter(this);
  }
  
  popAtIndex(i) {
    var item = this[i];
    
    if (i > 0)
      this[i-1].next = item.next;
    if (i < this.length-1)
      this[i+1].prev = item.prev;
    
    this.length--;
    
    var len = this.length;
    for (var j=i; j<len; j++) {
      this[j] = this[j+1];
    }
    
    return item;
  }
  
  //inserts a *before* index i
  insert(i, a) {
    for (var j=this.length; j>i; j--) {
      this[j] = this[j-1];
    }
    
    this[i] = a;
    this.length++;
  }
  
  prepend(n) {
    this.insert(0, n);
  }
  
  slice(a, b) {
    if (a < 0 || b < 0 || a >= this.length || b >= this.length) {
      throw new Error("Range error in slice("+a+","+b+")")
    }
    
    var arr = new GArray();
    for (var i=a; i<b; i++) {
      arr.push(this[i]);
    }
    
    return arr;
  }
  
  remove(n) {
    var i = this.indexOf(n);
    if (i < 0) {
      throw new Error("AST child not in node");
    }
    
    this.popAtIndex(i);
  }
  
  replace(a, b) {
    var i = this.indexOf(a);
    
    if (i < 0) {
      throw new Error("AST child not in node");
    }
    
    b.prev = a.prev;
    b.next = a.next;
    if (a.prev != undefined)
      a.prev.next = b;
    if (a.next != undefined)
      a.next.prev = b;
    b.parent = this;
    
    this[i] = b;
  }
}

class ValNode extends ASTNode {
  constructor(val) {
    ASTNode.call(this, val);
    this.val = val;
  }
  
  extra_str() : String {
    return this.val
  }
}
class IdentNode extends ValNode {
  constructor(val, local=false) {
    ValNode.call(this, val);
    this.local = local;
  }
  extra_str() : String {
    return this.val + " local=" + this.local
  }
}

class BinOpNode extends ASTNode {
  constructor(a, b, op) {
    ASTNode.call(this);
    
    this.add(a);
    this.add(b);
    this.op = op;
  }
  
  extra_str() {
    return this.op
  }
}

class AssignNode extends BinOpNode {
  constructor(a, b, assignop, local=false) {
    BinOpNode.call(this, a, b, assignop);
    this.local = local;
  }
}

class StatementList extends ASTNode {
  constructor() {
    ASTNode.call(this);
  }
}
