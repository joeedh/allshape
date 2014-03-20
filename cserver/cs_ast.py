import sys, traceback
from cs_global import glob

def tab(tlvl, tstr=" "):
  s = ""
  for i in range(tlvl):
    s += tstr
  return s
  
class Node (object):
  def __init__(self):
    self.children = []
    self.parent = None
    self.line = glob.g_line
    self.file = glob.g_file
    self.lexpos = glob.g_lexpos
  
  def __getitem__(self, item):
    return self.children[item]
    
  def __setitem__(self, item, val):
    self.children[item] = val
    
  def __len__(self):
    return len(self.children)
  
  def index(self, i):
    return self.children.index(i)
    
  def replace(self, oldnode, newnode):
    i = 0
    for c in self.children:
      if c == oldnode:
        break
      i += 1
    
    self.children[i] = newnode
    newnode.parent = self
    
  def _default_node(self, node):
    if type(node) == str:
      node = StrNode(node)
    
    return node
  
  def pop(self, i):
    self.children.pop(i);
    
  def add(self, node):
    node = self._default_node(node)
    
    self.children.append(node)
    node.parent = self
  
  def remove(self, node):
    self.children.remove(node)
    
  def insert(self, i, node):
    node = self._default_node(node)
    self.children.insert(i, node);
    node.parent = self
    
  def prepend(self, node):
    node = self._default_node(node)
    
    self.children.insert(0, node)
    node.parent = self
  
  def extra_str(self):
    return ""
  
  def copy_basic(self, n2):
    n2.line = self.line
    n2.file = self.file
    n2.lexpos = self.lexpos
    n2.final_type = self.final_type
    if hasattr(self, "template"):
      if self.template != None:
        n2.template = n2.template.copy()
      
  def copy(self):
    raise RuntimeError("Unimplemented copy function in type %s!"%str(type(self)))
  
  def copy_children(self, n2):
    n2.children[:] = []
    for c in self:
      n2.add(c.copy())
      
  def gen_js(self, tlevel):
    raise RuntimeError("Unimplemented gen_js function in type %s!"%str(type(self)))
  
  def get_line_str(self):
    name = str(type(self)).replace("js_ast.", "").replace("<class", "").replace(">", "").replace(" ", "").replace("'", "")
    
    c = self.extra_str()
    if len(c.strip()) > 0: c = " " + c
    
    return name + c
   
  def get_ntype_name(self):
    return str(type(self)).replace("js_ast.", "").replace("<class", "").replace(">", "").replace(" ", "").replace("'", "")
    
  def __str__(self, tlevel=0):
    t = tab(tlevel, "-")
    
    name = ""
    
    name += str(type(self)).replace("cs_ast.", "").replace("<class", "").replace(">", "").replace(" ", "").replace("'", "")
    if len(self.children) == 0:
      return t + name + " " + self.extra_str()
    else:
      s = t + name + " " + self.extra_str() + " {\n"
      for c in self.children:
        cs = c.__str__(tlevel+1)
        if not (cs.endswith("\n")):
          cs += "\n"
        
        s += cs
      s += t + "}\n"
      return s
  def __repr__(self):
    return str(self)

class StatementList(Node):
  pass

class StrNode(Node):
  def __init__(self, val):
    Node.__init__(self)
    self.val = val
  
  def extra_str(self):
    if self.val.replace(" ", "").replace("\t", "")[-1] != "\n":
      return "\n" + self.val
    else:
      return "\n" + self.val

class CodeNode(StrNode):
  pass

class BindingNode(StrNode):
  def __init__(self, val, type):
    StrNode.__init__(self, val)
    self.type = type

class HtmlNode(StrNode):
  pass 

class IncludeNode(StrNode):
  pass
  