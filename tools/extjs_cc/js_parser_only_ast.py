#AST nodes that are used in intermediate stages of parsing,
#but are NEVER EVER in the final AST tree.

from js_ast import Node, IdentNode, NumLitNode, StrLitNode, FunctionNode, ExprListNode, ExprNode
from js_global import glob

class MethodNode(FunctionNode):
  def __init__(self, name, is_static=False):
    FunctionNode.__init__(self, name, glob.g_line)
    self.is_static = is_static
    
    #self[0] : params
    #self[1] : statementlist
    
class MethodGetter(MethodNode):
  def __init__(self, name, is_static=False):
    MethodNode.__init__(self, name, is_static)
    #getters do not take any function parameters,
    #but since we ultimately inherit
    #from FunctionNode we add an empty param list
    #here.
    self.add(ExprListNode([]))

class MethodSetter(MethodNode):
  def __init__(self, name, is_static=False):
    MethodNode.__init__(self, name, is_static)

class ClassNode(Node):
  def __init__(self, name, parents):
    Node.__init__(self)
    
    self.name = name
    self.parents = parents

