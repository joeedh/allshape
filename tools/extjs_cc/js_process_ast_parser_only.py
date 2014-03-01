import sys
from js_ast import *
from js_parser_only_ast import *

#the name of this file is long on purpose, to discourage
#its use outside the raw syntax parser.

def expand_harmony_class(cls):
  node = FunctionNode(cls.name, 0)  
  
  params = ExprListNode([])
  slist = StatementList()
  
  #find constructor method
  found_con = False
  for m in cls:
    if m.name == "constructor":
      if found_con: raise SyntaxError("Cannot have multiple constructor methods")
      if type(m) != MethodNode: raise SyntaxError("Constructors cannot be get/setters")
      
      found_con = True
      
      params = m[0]
      slist = m[1]
  
  parent = cls.parents[0] if len(cls.parents) != 0 else None
  
  if found_con == False:
    #build a default constructor
    m = MethodNode("constructor")
    print("generating default constructor...");
    
    params = ExprListNode([])
    slist = StatementList()
    if parent != None:
      bn = BinOpNode(IdentNode(parent), "apply", ".")
      args = ExprListNode([IdentNode("this"), IdentNode("arguments")])
      fn = FuncCallNode(bn)
      fn.add(args)
      slist.add(fn)
      
    m.add(params)
    m.add(slist)
    
    #cls.add(m)
    
  #do getters/setters
  gets = {}
  sets = {}
  props = set()
  
  for m in cls:
    if m.name == "constructor": continue
    if type(m) == MethodGetter:
      gets[m.name] = m
      props.add(m.name)
      
    if type(m) == MethodSetter:
      sets[m.name] = m
      props.add(m.name)
  
  def to_exprfunc(method):
    f = FunctionNode("(anonymous)", 0)
    
    f.children = method.children
    for c in f.children:
      c.parent = f
    
    f.type = method.type
    
    f.line = method.line
    f.lexpos = method.lexpos
    
    return f
    
  def gen_prop_define(prop, gets, sets, flags=[]):
    #since this is called from *within* the parser, we
    #can't use js_parse().  bleh!
    name_expr = BinOpNode(IdentNode("Object"), IdentNode("defineProperty"), ".");
    fcall = FuncCallNode(name_expr)
    
    exprlist = ExprListNode([])
    fcall.add(exprlist)
    
    params = ObjLitNode()
    if p in gets:
      an = AssignNode(IdentNode("get"), to_exprfunc(gets[p]))
      params.add(an)
    if p in sets:
      an = AssignNode(IdentNode("set"), to_exprfunc(sets[p]))
      params.add(an)
      
    exprlist.add(IdentNode("this"))
    exprlist.add(StrLitNode('"%s"'%prop))
    exprlist.add(params)
    
    return fcall;
  
  def gen_method(cls, m):
    f = FunctionNode(m.name)
    f.children = m.children
    f.name = "(anonymous)"
    
    for c in f.children:
      c.parent = f
    
    if not m.is_static:
      bn = BinOpNode(IdentNode(cls.name), IdentNode("prototype"), ".")
      bn = BinOpNode(bn, IdentNode(m.name), ".")
      an = AssignNode(bn, f)
      f = an
    else:
      pn = ExprListNode([IdentNode(cls.name), StrLitNode('"'+m.name+'"'), f])
      fc = FuncCallNode(IdentNode("define_static"))
      fc.add(pn)
      f = fc
    
    return f
    
  for p in props:
    n = gen_prop_define(p, gets, sets)
    slist.prepend(n)
    
  node.add(params)
  node.add(slist)
  
  #add stuff outside of the constructor function
  slist = StatementList()
  slist.add(node)
  node = slist
  
  if len(cls.parents) != 0:
    #XXX for now, we're just doing single inheritance
    p = cls.parents[0]
    
    #inherit(childcls, parentcls);
    fn = FuncCallNode(IdentNode("inherit"))
    fn.add(ExprListNode([IdentNode(cls.name), IdentNode(p)]))
    slist.add(fn)
  else:
    fn = FuncCallNode(IdentNode("create_prototype"))
    fn.add(ExprListNode([IdentNode(cls.name)]))
    slist.add(fn)
  
  #generate methods
  for m in cls:
    if type(m) != MethodNode: continue
    if m.name == "constructor": continue
    
    n = gen_method(cls, m)
    slist.add(n)
  
  return node