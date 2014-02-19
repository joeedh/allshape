import tinygpu_lex
glob = tinygpu_lex.glob

class GSParseError (Exception):
  pass
  
class Node:
  def __init__(self):
    global glob
    
    self.children = []
    self.parent = 0
    
    #the purpose and format of .type varies with different types of nodes
    self.type = None
    if type(glob.g_line) != int:
      self.line = glob.g_line(1)
    else:
      self.line = glob.g_line
      
    #node return type
    self.ret_type = None
    self.stream_type = None
    
  def add(self, node):
    if type(node) == str:
      if node.startswith('"'):
        node = StrLitNode(node)
      else:
        node = IdentNode(node)
    elif type(node) == float:
        node = NumLitNode(node)
    
    self.children.append(node)
    node.parent = self
  
  def prepend(self, node):
    if type(node) == str:
      if node.startswith('"'):
        node = StrLitNode(node)
      else:
        node = IdentNode(node)
    elif type(node) == float:
        node = NumLitNode(node)
    
    self.children.insert(0, node)
    node.parent = self
  
  def extra_str(self):
    return ""
  
  def get_type_name(self):
    s = str(type(self)).replace("tinygpu_ast.", "").replace("<class", "")
    s = s.replace(">", "").replace(" ", "").replace("'", "").replace("Node", "")
    s += " " + self.extra_str()
    return s
    
  def __str__(self, tlevel=0):
    t = ""
    for i in range(tlevel):
      t += " "
      
    typestr = ""
    if self.ret_type != None:
      if type(self.ret_type) == BuiltinTypeNode:
        if type(self.ret_type.type) == str:
          typestr = self.ret_type.type + " "
        else:
          typestr = str(type(self.ret_type)) + " "
      elif type(self.ret_type) == StructTypeNode:
        typestr = "struct " + self.ret_type.name + " "
      elif type(self.ret_type) == NumLitNode:
        typestr += "nln_int" if tye(self.ret_type.val) == int else "nln_float"
      elif type(self.ret_type) != str:
        typestr += self.ret_type.get_type_name() + " "
      else:
        typestr += self.ret_type
        
    name = str(type(self)).replace("tinygpu_ast.", "").replace("<class", "").replace(">", "").replace(" ", "").replace("'", "")
    if len(self.children) == 0:
      return t + typestr + name + " " + self.extra_str()
    else:
      s = t + typestr + name + " " + self.extra_str() + " {\n"
      for c in self.children:
        cs = c.__str__(tlevel+1)
        if not (cs.endswith("\n")):
          cs += "\n"
        
        s += cs
      s += t + "}\n"
      return s
  def __repr__(self):
    return str(self)

class UnkownTypeNode(Node):
      pass
     
class NullStatement(Node):
  def __init__(self):
    super(NullStatement, self).__init__()
  
class ValueNode (Node):
  val = None

  def __init__(self):
    super(ValueNode, self).__init__()

  def extra_str(self):
    return str(self.val)
  
class IdentNode (ValueNode):
  def __init__(self, ident, local=False):
    super(IdentNode, self).__init__()
    self.val = ident
    self.local = local
  
  def extra_str(self):
    return self.val + ", " + str(self.local)
    
class StrLitNode (ValueNode):
  def __init__(self, str):
    super(StrLitNode, self).__init__()
    self.val = str

class NumLitNode (ValueNode):
  def __init__(self, num):
    super(NumLitNode, self).__init__()
    self.val = num
  
  def extra_str(self):
    return str(self.val) # + " " + str(type(self.val)).replace("<class ", "").replace(">", "").replace("'", "")
    
class BinOpNode (Node):
  def __init__(self, a, b, op):
    super(BinOpNode, self).__init__()
    self.op = op
    self.add(a);
    self.add(b);

  def extra_str(self):
    return str(self.op)

class BoolLitNode (Node):
  def __init__(self, val):
    super(BoolLitNode, self).__init__()
    self.val = val
    
class ExprNode (Node):
  def __init__(self, exprnodes):
    super(ExprNode, self).__init__()
    for e in exprnodes:
      self.add(e)

class ArrayRefNode (Node):
  def __init__(self, var, ref):
    super(ArrayRefNode, self).__init__()
    self.dim = -1
    self.add(var)
    self.add(ref)
  
  def extra_str(self):
    return str(self.dim)
    
class ArrayLitNode (Node):
  def __init__(self, exprlist):
    super(ArrayLitNode, self).__init__()
    self.add(exprlist)

class ObjLitNode (Node):
  def __init__(self):
    self.name = "anonymous"
    self.is_prototype = False
    super(ObjLitNode, self).__init__()
    
#duplicate of ExprNode, but with different type to (hopefully) avoid chain confusion
class ExprListNode (ExprNode):
  def __init__(self, exprnodes):
    super(ExprListNode, self).__init__(exprnodes)
      
class NodeVarGroup (Node):
  pass
  
class TypeNode (Node):
  def __init__(self):
    super(TypeNode, self).__init__()
    self.modifiers = set()

class StructTypeNode(TypeNode):
  def __init__(self, name):
    super(StructTypeNode, self).__init__()
    self.name = name
  
  def extra_str(self):
    return self.name
    
class TypeRefNode(TypeNode):
  def __init__(self, type):
    super(TypeRefNode, self).__init__()
    self.type = type
  
  def extra_str(self):
    return str(self.type)
    
class ArrTypeNode(TypeNode):
  def __init__(self, dim):
    super(ArrTypeNode, self).__init__()
    self.dim = dim
    self.type = 0
    self.builtin_name = None
    
  def extra_str(self):
    return str(self.dim)

class BuiltinTypeNode (TypeNode):
  def __init__(self, type):
    super(BuiltinTypeNode, self).__init__()
    self.type = type
    
  def extra_str(self):
    return str(self.type)
    
class VarDeclNode (Node):
  def __init__(self, type, name):
    super(VarDeclNode, self).__init__()
    self.add(type)
    self.type = type
    self.modifiers = set()
    self.name = name
  
  def extra_str(self):
    s = ""
    for m in self.modifiers:
      s += m + " "
    
    s += self.name
    return s

class BuiltinVarDeclNode (VarDeclNode):
  pass
    
class VarRefNode (Node):
  def __init__(self, var):
    super(VarRefNode, self).__init__()
    self.add(var)

class NegateNode(Node):
  def __init__(self, expr):
    super(NegateNode, self).__init__()
    self.add(expr)   
    
  def extra_str(self):
    return ""

class LogicalNotNode(Node):
  def __init__(self, expr):
    super(LogicalNotNode, self).__init__()
    self.add(expr)   
    
  def extra_str(self):
    return ""
    
class AssignNode (Node):
  def __init__(self, var_ref, expr, flags=set(), mode="="):
    super(AssignNode, self).__init__()
    
    self.mode = mode
    self.add(var_ref)
    self.add(expr)
    self.flags = set(flags) #copy
  def extra_str(self):
    return self.mode
    
class StatementList (Node):
  def __init__(self):
    super(StatementList, self).__init__()

class FuncArgsNode (Node):
  def __init__(self, nametype): #nametype is either identnode or arrtypenode
    super(FuncArgsNode, self).__init__()
    self.add(nametype)

class FuncCallNode (Node):
  def __init__(self, name_expr):
    super(FuncCallNode, self).__init__()
    
    self.add(name_expr)
    
  def extra_str(self):
    return self.children[0].extra_str()

class FuncRefNode (Node):
  def __init__(self, name_expr):
    super(FuncCallNode, self).__init__()
    
    self.add(name_expr)
    
  def extra_str(self):
    return self.children[0].extra_str()

class FunctionNode (StatementList):
  def __init__(self, name, lineno=0):
    super(FunctionNode, self).__init__()
    self.name = name
    self.glsl_builtin = False
    self.glsl_name = name
    self.output_name = name
    
  def extra_str(self):
    return self.name

class IfNode(Node):
  def __init__(self, expr):
    super(IfNode, self).__init__()
    self.add(expr)   
    
  def extra_str(self):
    return ""

class TryNode(Node):
  def __init__(self):
    super(TryNode, self).__init__()
    
  def extra_str(self):
    return ""

class CatchNode(Node):
  def __init__(self, expr):
    super(CatchNode, self).__init__()
    self.add(expr)
    
  def extra_str(self):
    return ""
    
class WhileNode(Node):
  def __init__(self, expr):
    super(WhileNode, self).__init__()
    self.add(expr)   
    
  def extra_str(self):
    return ""

class ForCNode(Node):
  def __init__(self, s1, s2, s3):
    super(ForCNode, self).__init__()
    self.add(s1)
    self.add(s2)
    self.add(s3)
    
  def extra_str(self):
    return ""
  
class ForInNode(Node):
  def __init__(self, var, list):
    super(ForInNode, self).__init__()
    self.add(var)
    self.add(list)
    
  def extra_str(self):
    return ""
    
class ForLoopNode(Node):
  def __init__(self, expr):
    super(ForLoopNode, self).__init__()
    self.add(expr)   
    
  def extra_str(self):
    return ""
    
class DoWhileNode(Node):
  def __init__(self, expr):
    super(DoWhileNode, self).__init__()
    self.add(expr)   
    
  def extra_str(self):
    return ""
    
class ElseIfNode(Node):
  def __init__(self, expr):
    super(ElseIfNode, self).__init__()
    self.add(expr)   
    
  def extra_str(self):
    return ""

class ElseNode(Node):
  def __init__(self):
    super(ElseNode, self).__init__()
    
  def extra_str(self):
    return ""

class TrinaryCondNode(Node):
  def __init__(self, s1, s2, s3):
    super(TrinaryCondNode, self).__init__()
    self.add(s1)
    self.add(s2)
    self.add(s3)
    
  def extra_str(self):
    return ""

class KeywordNew(Node):
  def __init__(self, expr):
    super(KeywordNew, self).__init__()
    self.add(expr)
    
  def extra_str(self):
    return ""

class ReturnNode(Node):
  def __init__(self, expr):
    super(ReturnNode, self).__init__()
    self.add(expr)
    
  def extra_str(self):
    return ""

class ThrowNode(Node):
  def __init__(self, expr):
    super(ThrowNode, self).__init__()
    self.add(expr)
    
  def extra_str(self):
    return ""
    
class IncDec(Node):
  def __init__(self, expr):
    super(IncDec, self).__init__()
    self.add(expr)
  
  def extra_str(self):
    return ""

class PreInc(IncDec):
  pass
class PostInc(IncDec):
  pass
class PreDec(IncDec):
  pass
class PostDec(IncDec):
  pass

class ContinueNode (Node):
  pass
class BreakNode (Node):
  pass

def node_is_class(node):
  if type(node) != FunctionNode:
    return False
  return node.ret in ["class", "array", "generic"]

def func_is_class(node):
  if type(node) != FunctionNode:
    return False
  return node.ret in ["class", "array", "generic"]
