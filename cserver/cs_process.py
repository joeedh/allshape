from cs_ast import *
import os, sys, os.path, time, random, math, struct
from cs_parse import JSCCError

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
    self.required_nodes = set()
  
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

from cs_cc import cs_parse
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
    buf = "  do_out(state, %s);\n" % html_to_c_str(node.val)
    
    
    self.s(buf)
    
  def CodeNode(self, node, scope, traverse, tlevel):
    if len(node.val.strip()) > 0:
      self.s(node.val)
    
  def BindingNode(self, node, scope, traverse, tlevel):
    type = node.type.replace("*", "STAR").replace("[", "A").replace("]", "A")
    buf = "  do_out(state, GETSTR(%s, %s));\n" % (type, node.val)
    self.s(buf)
  
  def IncludeNode(self, node, scope, traverse, tlevel):
    #eek!
    fpath = os.path.abspath(os.path.normpath(glob.g_file))
    fdir = os.path.split(fpath)[0]
    paths = [fdir, os.getcwd()]
    common = os.path.commonprefix(paths);
    paths = [p[len(common):] for p in paths]
    f = None
    npath = ""
    
    for p in paths:
      p = common + p
      if len(p) > 0 and not p.endswith("/") and not p.endswith("\\"):
        p += "/"
      
      try:
        f = open(p+node.val, "r")
        npath = os.path.abspath(os.path.normpath(p+node.val))
      except FileNotFoundError:
        continue
    
    if f == None:
      print("error including " + node.val + "!")
      raise JSCCError("error!");
    
    buf = f.read()
    f.close()
    
    glob.push()
    glob.g_file = npath
    try:
      n2 = cs_parse(buf)
      node.parent.replace(node, n2)
      traverse(n2)
      glob.pop()
    except JSCCError:
      glob.pop()
      print("error including " + node.val + "!")
      raise JSCCError("error!");
    
    if n2 == None or len(n2) == 0:
      print("error including " + node.val + "!")
      raise JSCCError("error!");
    
    
def gen_page_uid(docroot, filename):
  filename = os.path.abspath(os.path.normpath(filename))
  docroot = os.path.abspath(os.path.normpath(docroot))
  
  prefix = os.path.commonprefix([filename, docroot])
  uid = filename[len(prefix):]
  if uid[0] == "/" or uid[0] == "\\": uid = uid[1:]
  
  uid = uid.replace(".ccs", "").replace("/", "_").replace("\\", "_")
  uid = uid.replace(".", "").replace("-", "")
  
  return "_pg_"+uid
  
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

static int $$UID$$(HandlerInfo *state) {
$$CODE_HERE$$
}
"""
  uid = gen_page_uid(glob.g_docroot, glob.g_file)
  
  buf = buf.replace("$$CODE_HERE$$", vs.buf);
  if "$$UID$$" in buf:
    buf = buf.replace("$$UID$$", uid)
 
  return buf
  
def html_to_c_str(val, max_col=70):
  val = val.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r")
  val2 = ""
  for i in range(len(val)):
    val2 += val[i]
    if ((i+1)%max_col) == 0:
      val2 += "\\\n"
     
  return '"' + val2 + '"'
  