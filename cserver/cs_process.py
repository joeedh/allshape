from cs_ast import *

def traverse(n, ntype, func, use_depth=False, 
             exclude=[], copy_children=False, 
             depth=0):
  
  if type(exclude) != list and type(exclude) != tuple and issubclass(exclude, Node):
    exclude = [exclude]
  
  if type(n) in exclude and depth != 0:
    return

  if copy_children:
    cs = n[:]
  
  if type(n) == ntype: 
    if use_depth and use_scope:
      func(n, scope, depth)
    elif use_depth:
      func(n, depth)
    else:
      func(n)
  
  if not copy_children:
    cs = n.children
    
  for c in cs:
    traverse(c, ntype, func, use_depth, exclude, copy_children, depth+1)

class NodeVisit:
  def __init__(self):
    pass
  
  def traverse(self, node, scope={}, tlevel=0):
    if scope == None and tlevel != 0:
      raise RuntimeError("emit called without scope")
      
    if scope == None: scope = NodeScope()
    
    typestr = type(node).__name__
    if not hasattr(self, typestr) and typestr in self.required_nodes:
      raise RuntimeError("Unimplemented node visit for node type %s", typestr)
    
    if not hasattr(self, typestr):
      for c in node.children:
        self.traverse(c, scope, tlevel)
    else:
      getattr(self, typestr)(node, scope, self.traverse, tlevel)

def compact_strnodes(n, ntype):
  cur = None
  
  dellist = []
  for i in range(len(n)):
    c = n[i]
    if type(c) == ntype:
      if cur == None:
        cur = c
      else:
        cur.val += c.val
        dellist.append(c)
    else:
      cur = None
      compact_strnodes(c, ntype)
    
  for c in dellist:
    n.remove(c)

class GenTemplateVisit(NodeVisit):
  def __init__(self):
    NodeVisit.__init__(self)
    self.buf = ""
  
  def s(self, s):
    self.buf += s
  
  def StatementList(self, node, scope, traverse, tlevel):
    for c in node:
      traverse(c)
      
  def HtmlNode(self, node, scope, traverse, tlevel):
    buf = "  do_out(%s);\n" % html_to_c_str(node.val)
    
    
    self.s(buf)
    
  def CodeNode(self, node, scope, traverse, tlevel):
    self.s(node.val)
    
  def BindingNode(self, node, scope, traverse, tlevel):
    type = node.type.replace("*", "STAR").replace("[", "A").replace("]", "A")
    buf = "  do_out(GETSTR(%s, %s));\n" % (type, node.val)
    self.s(buf)
  
def gen_template(n):
  vs = GenTemplateVisit()
  vs.traverse(n)
  
  if glob.g_build_main:
    buf = """
#include "boilerplate.h"
int main(int argc, char **argv) {
$$CODE_HERE$$
}
"""
  else:
    buf = """
#include "boilerplate.h"

int exec_page(void *ctx) {
$$CODE_HERE$$
}
"""
  
  buf = buf.replace("$$CODE_HERE$$", vs.buf);
  
  return buf
  
def html_to_c_str(val):
  val = val.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r")
  return '"' + val + '"'
  