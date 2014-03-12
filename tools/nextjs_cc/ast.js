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

class NumLitNode extends ValNode {
  constructor(val) {
    ValNode.call(this, val);
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

class VarDeclNode extends IdentNode {
  constructor(val, expr=undefined, local=false) {
    IdentNode.call(this, val, local);
    this.val = val;
    if (expr != undefined)
      this.add(expr);
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

class KeywordNode extends ASTNode {
  constructor() {
    ASTNode.call(this);
  }
}

class ReturnNode extends KeywordNode {
  constructor(expr) {
    this.add(expr);
  }
}

class YieldNode extends KeywordNode {
  constructor(expr) {
    this.add(expr);
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

class ArrLitNode extends ASTNode {
  constructor() {
    ASTNode.call(this);
  }
}

class ObjLitNode extends ASTNode {
  constructor() {
    ASTNode.call(this);
    //each child should be an AssignNode
  }
}

class ExprListNode extends ASTNode {
  constructor() {
    ASTNode.call(this);
  }
}

class ExprNode extends ASTNode {
  constructor(node=undefined, has_params=false) {
    ASTNode.call(this);
    
    this.has_params = has_params;
    
    if (node != undefined)
      this.add(node);
  }
}

class FunctionNode extends ASTNode {
  constructor(name="(anonymous)") {
    ASTNode.call(this);
    this.name = name;
    
    //layout: exprlist(params), statementlist
  }
  
  extra_str() {
    return this.name;
  }
}

class NodeVisit {
  constructor(Boolean strict=false) {
    this.strict = strict;
  }
  
  visit(ASTNode n, int tlevel=0) {
    if (n == undefined) {
      throw new Error("Undefined passed to NodeVisit.visit()");
    }
    
    var this2=this;
    function traverse(c, tlevel2) {
      if (c == undefined) {
        throw new Error("Undefined node in internal nodevisit traverse()");
      }
      this2.visit(c, tlevel2);
    }
    
    var tn = n.constructor.name;
    if (!(tn in this)) {
      if (this.strict) {
        throw new Error("Unimplemented node type " + tn + " in nodevisit " + this.constructor.name);
      } else {
        for (var c in n) {
          this.visit(c);
        }
      }
    } else {
      this[tn](n, traverse, tlevel);
    }
  }
}

function tab(n) {
  var s = ""
  for (var i=0; i<n; i++) {
    s += "  ";
  }
  
  return s;
}

class WriterVisit extends NodeVisit {
  constructor() {
    NodeVisit.call(false);
    this.buf = "";
  }
  
  //returns whether or not to add a semicolon
  //after a statement
  endst(n) {
    var b = this.buf.trim();
    
    if (b.length == 0) return false;
    
    var add_semi = b[b.length-1] != "}";
    if (n != undefined) {
      add_semi = add_semi || (n instanceof VarDeclNode || n instanceof AssignNode || n instanceof BinOpNode);
    }
    
    return add_semi;
  }
  
  s(ASTNode n, String buf) {
    if (buf == undefined) {
      throw new Error("Don't forget to pass a node to .s()");
    }
    this.buf += buf;
  }
  
  FunctionNode(n, traverse, tlevel) {
    var t1 = tab(tlevel);
    
    this.s(n, "function " + n.name + "(");
    traverse(n[0], tlevel);
    this.s(n, ") {\n")
    traverse(n[1], tlevel+1);
    this.s(n, t1 + "}\n");
  }
  
  StatementList(n, traverse, tlevel) {
    var t1 = tab(tlevel);
    for (var c in n) {
      this.s(n, t1);
      traverse(c, tlevel);

      if (this.endst(c)) this.s(n, ";");
      
      this.s(n, "\n");
    }
  }
  
  ArrLitNode(n, traverse, tlevel) {
    this.s(n, "[");
    for (var i=0; i<n.length; i++) {
      var c = n[i];
      
      if (i > 0) this.s(c, ", ");
      traverse(c, tlevel);
    }
    this.s(n, "]");
  }
  
  ObjLitNode(n, traverse, tlevel) {
    this.s(n, "{");
    for (var i=0; i<n.length; i++) {
      var c = n[i];
      if (i > 0) this.s(n, ", ");
      traverse(c[0], tlevel);
      this.s(n, " : ")
      traverse(c[1], tlevel);
    }
    this.s(n, "}");
  }
  
  BinOpNode(n, traverse, tlevel) {
    traverse(n[0], tlevel);
    if (n.op == "instanceof") 
      this.s(n, " " + n.op + " ");
    else
      this.s(n, n.op);
    traverse(n[1], tlevel);
  }
  
  AssignNode(n, traverse, tlevel) {
    traverse(n[0]);
    this.s(n, " " + n.op + " ");
    traverse(n[1]);
  }
  
  ExprNode(n, traverse, tlevel) {
    if (n.has_params)
      this.s(n, "(")
    for (var c in n) {
      traverse(c, tlevel);
    }
    
    if (n.has_params)
      this.s(n, ")");
  }
  
  ExprListNode(n, traverse, tlevel) {
    for (var i=0; i<n.length; i++) {
      var c = n[i];
      if (i > 0) this.s(n, ", ");
      traverse(c, tlevel);
    }
  }
  
  IdentNode(n, traverse, tlevel) {
    this.s(n, n.val);
  }
  
  VarDeclNode(n, traverse, tlevel) {
    if (n.local) this.s(n, "var ");
    this.s(n, "bleh");
    
    if (n.length > 0) {
      this.s(n, " = ");
      traverse(n[0], tlevel);
    }
  }
  
  NumLitNode(n, traverse, tlevel) {
    this.s(n, n.val);
  }
  
  ReturnNode(n, traverse, tlevel) {
    this.s(n, "return ")
    traverse(n[0], tlevel);
  }
}
