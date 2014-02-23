def find_node(node, ntype, strict=False, depth=0):
  if type(node) == ntype:
    if not (depth == 0 and strict):
      return node
    
  for n in node.children:
    ret = find_node(n, ntype, strict, depth+1)
    if ret != None: return ret
  return None

def traverse_i(n, ntype, func, i, cur=None, use_depth=False, 
             exclude=[], copy_children=False, depth=0):
  if cur == None:
    cur = [0]
  
  if type(n) in exclude and depth != 0:
    return
  
  if copy_children:
    cs = n[:]
  
  if type(n) == ntype: 
    if cur[0] == i:
      cur[0] += 1
      if use_depth:
        func(n, depth)
      else:
        func(n)
    else:
      cur[0] += 1
    
  if not copy_children:
    cs = n.children
    
  for c in cs:
    traverse_i(c, ntype, func, i, cur, use_depth, exclude, copy_children, depth+1)

def null_node(n):
  return n in [0, None]

def traverse(n, ntype, func, use_depth=False, 
             exclude=[], copy_children=False, 
             use_scope=False, scope=None, depth=0):
  if scope == None: scope = {}
  scope = handle_scope(n, scope)
  
  if type(n) in exclude and depth != 0:
    return

  if copy_children:
    cs = n[:]
  
  if type(n) == ntype: 
    if use_depth and use_scope:
      func(n, scope, depth)
    elif use_scope:
      func(n, scope)
    elif use_depth:
      func(n, depth)
    else:
      func(n)
  
  if not copy_children:
    cs = n.children
    
  for c in cs:
    traverse(c, ntype, func, use_depth, exclude, copy_children, use_scope, scope, depth+1)
     
class VarBinding:
  def __init__(self, node, name, type):
    self.node = node
    self.name = name
    self.type = type
  
  def copy(self):
    return VarBinding(self.node, self.name, self.type)
    
  def add(self, type):
    self.types.add(type)
    
  def remove(self, type):
    self.types.remove(type)
    
  def __getitem__(self, i):
    return self.types[i]
    
  def __setitem__(self, i, v):
    self.types[i] = v
    
  def __len__(self):
    return len(self.types)
    
class NodeScope:
  def __init__(self, parent=None): 
    self.scopestack = []
    self.scope = {}
    self.childscopes = []
    if parent != None:
      parent.childscopes.append(self)
      #for k in self.parent:
      #  self[k] = self.parent[k].copy()
        
    self.parent = parent    
  
  def __str__(self):
    return str(self.scope.keys())
  def __repr__(self):
    return str(self)
  
  def push(self):
    self.scopestack.append(self.scope)
    self.scope = dict(self.scope)
    if hasattr(glob, "g_debug_typeinfer") and glob.g_debug_typeinfer:
      print("===pushing...===")
    #for k in self.scope:
    #  self.scope[k] = self.scope[k].copy()
      
  def pop(self):
    if hasattr(glob, "g_debug_typeinfer") and glob.g_debug_typeinfer:
      print("===popping...===")
    d = self.scope
    self.scope = self.scopestack.pop(-1)
    return d
  
  def __getitem__(self, item):
    return self.scope[item]
  
  def __setitem__(self, item, val):
    self.scope[item] = val
  
  def __contains__(self, item):
    return item in self.scope
  
  def __delitem__(self, item):
    del self.scope[item]
    
  def __len__(self):
   return len(self.scope)
  
  def __iter__(self):
    return iter(self.scope)
  
  def keys(self):
    return self.scope.keys()
  
  def values(self):
    return self.scope.values()  
    
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

def handle_nodescope_pre(n, scope):
    if type(n) in [IdentNode, VarDeclNode]:
      """
      p = n.parent
      add = False
      while p not in [None, 0]:
        if type(p) in [FunctionNode, ForLoopNode, DoWhileNode, WhileNode, 
                       WithNode, CaseNode, DefaultCaseNode, IfNode, ElseNode,
                       TryNode, CatchNode]:
          break
        
        if type(p) in [AssignNode, VarDeclNode]:
          add = True
          break
          
        p = p.parent
      
      #if add and n.final_type != None:
      #  scope[n.val] = VarBinding(n, n.final_type, n.val)
      
      #"""
      pass
      
    elif type(n) in [FunctionNode, ForLoopNode, DoWhileNode, 
                     TryNode, CatchNode, SwitchNode, WhileNode,
                     IfNode, ElseNode]:
      if type(n) == FunctionNode:
        if n.parent == None or type(n.parent) in [StatementList, FunctionNode]:
          scope[n.name] = n #VarBinding(n, n.name, n.final_type)
          scope["this"] = n
      
      scope.push()
          
    elif type(n) == BinOpNode and n.op == ".":
      scope.push()

def handle_nodescope_post(n, scope):
    if type(n) in [FunctionNode, ForLoopNode, DoWhileNode, WhileNode, 
                   WithNode, CaseNode, DefaultCaseNode, IfNode, ElseNode,
                   TryNode, CatchNode]:
      scope.pop()
    elif type(n) == BinOpNode and n.op == ".":
      scope.pop()
    

def templates_match(n1, n2):
  if n1 != None and n2 == None: return False
  if n1 == None and n2 != None: return False
  
  return len(n1[0]) == len(n2[0])
  
def types_match(n1, n2, typespace):
  if type(n1) == TypeRefNode and n1.template == None:
    n1 = typespace.get_type(n1.type)
  if type(n2) == TypeRefNode and n2.template == None:
    n2 = typespace.get_type(n2.type)
    
  if type(n1) == IdentNode:
    n1 = typespace.get_type(n1.val)
  if type(n2) == IdentNode:
    n2 = typespace.get_type(n2.val)
  if type(n1) == BuiltinTypeNode and n1.type in typespace.functions:
    n1 = typespace.get_type(n1.type)
    
  if type(n2) == BuiltinTypeNode and n2.type in typespace.functions:
    n2 = typespace.get_type(n2.type)
  
  if type(n1) != type(n2): 
    if type(n1) == BuiltinTypeNode and type(n2) == IdentNode:
      if n1.type == "String" and n2.val == "String": return True
    if type(n2) == BuiltinTypeNode and type(n1) == IdentNode:
      if n2.type == "String" and n1.val == "String": return True
     
    if type(n1) == TemplateNode and type(n2) == FunctionNode:
      if type(n1.name_expr) == IdentNode and n1.name_expr.val == n2.val:
        return templates_match(n1, n2.template)
        
    if type(n2) == TemplateNode and type(n1) == FunctionNode:
      if type(n2.name_expr) == IdentNode and n2.name_expr.val == n1.val:
        return templates_match(n2, n1.template)
        
    return False
  if type(n1) == BuiltinTypeNode:
    return n1.compatible(n2)
  elif type(n1) == VoidTypeNode: return True
  elif type(n1) == FunctionNode:
    return n1 == n2
    
def handle_scope(n, scope):
    if type(n) in [IdentNode, VarDeclNode]:
      scope[n.val] = n
    elif type(n) in [FunctionNode, ForLoopNode, DoWhileNode, 
                     TryNode, CatchNode, SwitchNode, WhileNode,
                     IfNode, ElseNode]:
      scope = dict(scope)
      if type(n) == FunctionNode:
        scope[n.name] = n
    elif type(n) == BinOpNode and n.op == ".":
      scope = dict(scope)
    
    return scope
    
def flatten_statementlists(node, typespace):
  if node == None: 
    print("None passed to flatten_statementlists")
    return
    
  def visit_slists(n):
    if not null_node(n.parent) and type(n.parent) in [FunctionNode, StatementList]:
      p = n.parent
      i = p.children.index(n)
      p.children.remove(n)
      
      for c in n.children:
        p.insert(i, c)
        i += 1
  
  c = node.gen_js(0)
  traverse(node, StatementList, visit_slists, copy_children=True)  
  """
  if node.gen_js(0) != c:
    if typespace != None:
      typespace.error("Internal parser error in flatten_statementlists", node)
    return None
  #"""
  
  return node  

def kill_bad_globals(node, typespace):
  def recurse(n, scope, global_scope, tlevel=0):
    def descend(n2, start=0):
      for c in n2.children[start:]:
        recurse(c, scope, global_scope, tlevel)
    
    if type(n) == FunctionNode:
      if n.name != "(anonymous)":
        scope = dict(scope)
      else:
        scope = dict(global_scope)
      
      args = n.get_args()
      
      for i, a in enumerate(args):
        scope[a] = n[0][i];
        
      descend(n, 1);
    elif type(n) == BinOpNode and n.op == ".":
      scope = dict(scope) #not sure what to do here
      descend(n)
    elif type(n) == VarDeclNode:
      scope[n.val] = n;
      descend(n[0])
      
      if len(n) > 2:
        descend(n, 2);
    elif type(n) == AssignNode:
      if type(n.parent) == ObjLitNode:
        descend(n)
        return
        
      #if n[0].gen_js(0).replace(";", "").strip() == "mode":
      #  raise "sd"
      if type(n[0]) in [IdentNode, VarDeclNode] and n[0].val not in scope:
        print(scope.keys())
        typespace.error("Undeclared global %s"%n[0].val, n[0])      
      descend(n);
    else:
      descend(n);
  
  sc = {}
  recurse(node, sc, sc, 0);
  
from js_cc import js_parse
from js_ast_match import ast_match

typespace = None

def traverse_files(ntype, func, use_depth=False, exclude=[], copy_children=False):
  for n in typespace.filenodes:
    traverse(n, ntype, func, use_depth, exclude, copy_children)

def get_arg_name(arg):
  if type(arg) in [IdentNode, VarDeclNode]:
    return arg.val
  else:
    for c in arg.children:
      ret = get_arg_name(c)
      if type(ret) == str: return ret
  return None

  
def build_classes(nfiles):
  global typespace
  
  def func_visit(n):
    if n.name == "(anonymous)": return
    if n.name in typespace.func_excludes: return
    
    def find_this(n2):
      if n2.op == "." and type(n2[0]) == IdentNode and n2[0].val == "this":
        n.class_type = "class"
      
    if n.class_type == "func":
      traverse(n, BinOpNode, find_this, exclude={FunctionNode});
    
    p = n.parent
    while not null_node(p) and type(p) != FunctionNode:
      p = p.parent
    
    if type(p) == FunctionNode:
      if n.name in p.functions:
        msg = "Nested function %s in %s already exists" % (n.name, p.name)
        typespace.error(msg, n)
      
      p.functions[n.name] = n
    else:
      if n.name in typespace.functions:
        msg = "Function %s already exists" % (n.name)
        n2 = typespace.functions[n.name]
        msg += "\n\tPrevious definition at %s:%d" % (n2.file, n2.line)
        typespace.error(msg, n)
      
      typespace.functions[n.name] = n
    
    for i, c in enumerate(n[0].children):
      n.args[c.val] = c
      n.arg_is[c.val] = i
  
  def exprfunc_visit(n):
    if n.name != "(anonymous)": return
    
    #figure out if we're a method function
    
    #find parent function
    p = n.parent
    while not null_node(p) and type(p) != FunctionNode:
      p = p.parent
    
    p1 = p
    
    #find parent assignment
    path = []
    p = n.parent
    path.append(p)
    while not null_node(p) and type(p) not in [AssignNode, FunctionNode]:
      p = p.parent
      path.append(p)
     
    path.reverse()
    if len(path) == 0:
      return 
    if type(p) != AssignNode:
      return
      
    cs = p.children
    parent = None
    if type(p1) == FunctionNode:
      parent = p1
      is_valid = type(cs[0]) == BinOpNode\
                 and type(cs[0][0]) == IdentNode\
                 and type(cs[0][1]) == IdentNode\
                 and cs[0][0].val == "this"
    else:
      c = cs[0].gen_js(0)
      i = c.find(".prototype")
      if i < 0:
        is_valid = False
      else:
        parent = c[:c.find(".")]
        if parent not in typespace.functions:
          typespace.error("Could not find class function %s"%parent, n)
          
        parent = typespace.functions[parent]
        c = c[i:]
        is_valid = c.count(".") == 2
    
    if is_valid:
      if not func_is_class(parent):
        parent.class_type = "class"
      
      n.class_type = "method"
      c = cs[0].gen_js(0)
      c = c[c.rfind(".")+1:]
      
      if type(parent) == StatementList:
        typespace.error("yeek", n)
        
      n.path = parent.name + "." + c
      
      n.name = c
      parent.members[n.name] = n
      
    i = 0
  
  def new_visit(n):
    if type(n[0]) == IdentNode:
      if n[0].val not in typespace.functions:
        typespace.error("Could not find type constructor %s"%n[0].val, n)
      
      f = typespace.functions[n[0].val]
      if not func_is_class(f):
        f.class_type = "class"
  
  traverse_files(FunctionNode, func_visit)
  traverse_files(FunctionNode, new_visit)
  traverse_files(FunctionNode, exprfunc_visit)
  
  def build_members(node):
    if not func_is_class(node): return
    
    def visit(n):
      c = n[0].gen_js(0)
      print(c)
   
      if c.startswith("this.") and c.count(".") == 1 and c.count("(") == 0 and c.count("[") == 0:
        c = c[5:]
        #print(node.name + "." + c)
        if c in node.members and type(node.members[c]) == FunctionNode:
          if node.members[c] != n[1]:
            typespace.error("Overriding method functions is not allowed", n)
        elif c not in node.members:
          if n.type != None: n[1].type = n.type
          node.members[c] = n[1]
    for c in node[1:]:
      traverse(c, AssignNode, visit, exclude=[FunctionNode])
  
  def global_prototype_assignments(node):
    c = node[0].gen_js(0)
    if not ".prototype" in c: return
    
    if c.strip().endswith(".prototype") and c.count(".")==1 and c.count("[")==0 and c.count(")")==0:
      n = c[:c.find(".prototype")]
      if n not in typespace.functions:
        typespace.error("Could not find function %s"%n, node)
      
      n = typespace.functions[n]
      n.members["prototype"] = node[1]
    elif c.count(".") == 2 and c.count("[") == 0 and c.count("(") == 0:
      n = c[:c.find(".prototype")]
      c = c[c.rfind(".prototype.")+len(".prototype."):]
      
      if n not in typespace.functions:
        typespace.error("Could not find function %s"%n, node)
      
      n = typespace.functions[n]
      n.members[c] = node[1]
    
  traverse_files(AssignNode, global_prototype_assignments, exclude=[FunctionNode])
  
  def add_logrecs(n):
    if typespace.get_record(n) != None:
      enlist = typespace.get_record(n)
      for en in enlist:
        #print(n.get_path(), en.arg in [a.val for a in n[0]])
        en.func = n.get_path()
        n.logrecs.append(en)
        
  traverse_files(FunctionNode, add_logrecs)
        
  print("\n")
  traverse_files(FunctionNode, build_members)
  
  def base_inherit(node):
    parent = "Object"
    
    if "__iterator__" in node.members:
      parent = "CanIterate"
    elif "next" in  node.members and type(node.members["next"]) == FunctionNode:
      parent = "Iterator"
      
    parent = typespace.types[parent]
    node.class_parent = parent
  
  def resolve_inheritance(node):
    #search for .prototype = calls at the global level, as well as calls to
    #inherit()
    if not func_is_class(node): return
    
    #the easy case
    
    if "prototype" in node.members:
      n = node.members["prototype"]
      if type(n) == ObjLitNode:
        base_inherit(node, "Object")
      else:
        while type(n) == UnknownTypeNode:
          n = n[0]
        n1 = n
        n2 = js_parse("Object.create(obj.prototype);")[0]
        
        #normalize        
        n1 = js_parse(n1.gen_js(0), start_node=BinOpNode)
        if node_structures_match(n1, n2): #ast_match("Object.create($class.prototype);", n1, start_node=BinOpNode): # node_structures_match(n1, n2):
          parent = n1[1][1][0][0].val
          #print(node.name, parent)
          if parent not in typespace.functions:
            typespace.error("Unknown parent type %s"%parent, n1)
            
          parent = typespace.functions[parent]
          node.class_parent = parent
        else:
          typespace.error("Unknown parent code line: \"%s\""%n1.gen_js(1), n1)
        
    
  traverse_files(FunctionNode, resolve_inheritance)
  
  def resolve_inheritance_inherit(node):
    if node[0].gen_js(0) != "inherit": return
    
    js = node[0].gen_js(0)
    
    sn = js_parse("inherit(obj1, obj2)")[0]
    
    print(node, sn)
    ret = ast_match("inherit($class, $class);", node.gen_js(0));
    
    if not ret: #node_structures_match(node, sn):
      typespace.error("Could not parse inherit line", node)
    
    n = node[1][0]
    parent = node[1][1]
    
    tname = n.get_type_name()
    if tname not in typespace.functions:
      typespace.error("Could not find function %s"%tname, node)
    
    ptname = parent.get_type_name()
    if ptname not in typespace.functions:
      typespace.error("Could not find function %s"%ptname, node)
    
    n = typespace.functions[tname]
    parent = typespace.functions[ptname]
    
    if n.class_parent != None:
      typespace.error("Parent prototype for type %s is already set"%n.name, node)
    
    if not func_is_class(n):
      n.class_type = "class"
    if not func_is_class(parent):
      parent.class_type = "class"
    
    n.class_parent = parent
    
  traverse_files(FuncCallNode, resolve_inheritance_inherit)
  
  def resolve_basic_class_types(node):
    if not func_is_class(node): return
    if node.class_parent != None: return
    ntype = "Object"

    base_inherit(node)
  
  traverse_files(FunctionNode, resolve_basic_class_types)
  
  def set_child_class_refs(node):
    if not func_is_class(node): return
    
    #if node.name in node.class_parent.child_classes:
    #  typespace.error("Duplicate child class names detected", node)
    
    node.class_parent.child_classes[node.name] = node
  
  def find_iter_iters(node):
    if not func_is_class(node): return
    
    
    if not ("next" in node.members and type(node.members["next"]) == FunctionNode):
      return
    
    """
    found_it = [False]
    def find_stop_iter(n):
      if n.val == "StopIteration":
        found_it[0] = True
      
    traverse(node, IdentNode, find_stop_iter)
    """
    
    print(node.class_parent==None)
    #print(node.name)
    
  #traverse_files(FunctionNode, find_iter_iters)
  
  def find_root_types(node):
    if not func_is_class(node): return
  
    root = node
    while root.class_parent != None and root.class_parent.is_builtin == False:
      root = root.class_parent
      if not func_is_class(root):
        root.class_types = "class"
    
    root_types[root.name] = root
  
  traverse_files(FunctionNode, set_child_class_refs)

  root_types = {}
  traverse_files(FunctionNode, find_root_types)
  
  rts = list(root_types.keys())
  rts.sort()
  for r in rts:
    if root_types[r].class_parent != None:
      cname = root_types[r].class_parent.name
    else:
      cname = None
    #print(r, root_types[r].class_type, cname)


def node_structures_match(n1, n2):
  s1 = [n1]
  s2 = [n2]
  
  while len(s1) > 0 and len(s2) > 0:
    n1 = s1.pop(-1)
    n2 = s2.pop(-1)
    if type(n1) != type(n2): return False
    for c in n1.children:
      s1.append(c)
    for c in n2.children:
      s2.append(c)
  
  if len(s1) > 0 or len(s2) > 0: return False
  return True

def common_parent(n1, n2):
  p1 = n1
  p2 = n2
  
  lst1 = []
  while p1 != None and p1.name != "Object" and p1 != typespace.functions["Object"]:
    lst1.append(p1)
    p1 = p1.class_parent
    
  lst2 = []
  while p2 != None and p2.name != "Object" and p2 != typespace.functions["Object"]:
    lst2.append(p2)
    p2 = p2.class_parent
  
  for l in lst1:
    if l in lst2:
      return l
      
  return None

def process_logrec():
  global typespace
  
  printlist = []
  
  def return_rec_visit(n):
    if len(n.logrecs) == 0: return #only do functions with records
    
    t = odict()
    argtypes = odict()
    for en in n.logrecs:
      if en.vtype == "r": continue
      
      if en.arg not in t:
        t[en.arg] = []
      t[en.arg].append(en.type)

    #print(t)
    
    for k in t:
      types = []
      common = []
      
      for a in t[k]:
        if a not in typespace.functions:
          f = typespace.empty_type()
        else:
          f = typespace.functions[a]
        
        types.append(f)      
      
      tlen = len(types)
      for t2 in types[:]:
        if t2.name == "undefined":
          types.remove(t2)
      
      for j in range(tlen):
        i1 = 0
        i2 = 1
        while i1 < len(types):
          if i1 == 0: i2 = 1
          else: i2 = 0
          
          if len(types) == 1: break
          
          c = common_parent(types[i1], types[i2])
          while i2 < len(types):
            if i2 != i1:
              c = common_parent(types[i1], types[i2])
              if c != None:
                break
            i2 += 1
          
          if c != None:
            nn1 = types[i1]
            nn2 =  types[i2]
            types.remove(nn1)
            types.remove(nn2)
            
            types.insert(i1, c)
            
          i1 += 1
          
          if i2 >= len(types):
            i2 = 0
      
      argtypes[k] = types
    
    s = n.get_path() + "("
    for i, n2 in enumerate(n[0]):
      k = n2.val
      n.lrec_args[k] = []
      
      if i > 0: s += ", "
      if k in argtypes:
        if k in typespace.functions:
          cls = typespace.functions[k]
        
        for j, v in enumerate(argtypes[k]):
          if j > 0: s += "|"
          s += v.name
          n.lrec_args[k].append(v)
      else:
        n.lrec_args[k].append(typespace.empty_type())
        s += "(unknown type)"
      s += " " + k
    s += ")"
    if "()" not in s:
      if "(unknown type)" not in s:
        printlist.append(s)
      else:
        printlist.append("-" + n.get_path() + str([n3.val for n3 in n[0]]) + str(list(argtypes.keys())))
  traverse_files(FunctionNode, return_rec_visit)
  printlist.sort()
  
  f = open("signatures.txt", "w")
  f.write("\n============\n")
  
  for l in printlist:
    print(l)
    f.write(l+"\n")
  f.close()
  
  #[print(l) for l in printlist]
  
def is_root(node):
  return node.class_parent == None

def tab(t, tstr="  "):
  s = ""
  for i in range(t):
    s += tstr
  return s

def get_roots():
  global typespace  
  
  roots = []
  def print_tree(n, tlevel=0):
    s = tab(tlevel) + n.name
    print(s)
    for c in n.child_classes.values():
      print_tree(c, tlevel+1)
      
  for c in typespace.functions.values():
    if not func_is_class(c) or not is_root(c): continue
    roots.append(c)
  
  return roots

#we two sources of type information: user-supplied annotation,
#and the type log.  first we should validate the user type annoation,
#then we have to apply a series of rules to reduce the types.

class TypeSet:
  def __init__(self, input=[]):
    self.map = odict()
    self.data = []
    
    for i in input:
      self.add(i)
    
  def add(self, item):
    h = item.__setval__()
    if h in self.map: return
    
    self.map[h] = len(self.data)
    self.data.append(item)
    
  def remove(self, item):
    i = self.map[item.__setval__()]
    data = self.data[i]
    
    self.data.pop(i)
    del self.map[item.__setval__()]
  
  def __getitem__(self, item):
    return self.data[item]
  
  def __setitem__(self, idx, val):
    if item < 0 or item >= len(self):
      raise RuntimeError("Item out of bounds in TypeSet.__setitem__: len: %d, item: %s" % (len(self), str(item)))
    
    d = self.data[idx]
    self.data.remove(d)
    del self.datamap[d.__setval__()]
    
    self.datamap[val.__setval__()] = idx
    self.data[idx] = val

  def __iter__(self):
    def iter():
      for d in self.data:
        yield d
    return iter()
  
  def len(self):
    return len(self.data)
  
  def join(self, b):
    c = TypeSet(self)
    for d in b:
      c.add(d)
  
  def __add__(self, b):
    return self.join(self, b)
  
  def copy(self):
    return TypeSet(self)
  
  def __contains__(self, item):
    return item.__setval__() in self.map
    
  def __sub__(self, b):
    c = self.copy()
    
    for d in b:
      if d in c:
        c.remove(d)
        
    return c
  
def process_type_annotation():
  global typespace
  roots = get_roots()
  for node in roots:
    pass

def print_class_hiearchy():
  global typespace  
  
  def print_tree(n, tlevel=0):
    s = tab(tlevel) + n.name
    print(s)
    
    lst = list(n.child_classes.keys())
    lst.sort();
    for k in lst:
      c = n.child_classes[k]
      print_tree(c, tlevel+1)
    
  roots = []    
  for k in typespace.functions:
    c = typespace.functions[k]
    if not func_is_class(c) or not is_root(c): continue
    roots.append(k)
  
  roots.sort()
  for k in roots:
    print_tree(typespace.functions[k])

def handle_dot_scope(n, scope):
  pass
  
def handle_scope_infer(n, scope):
    if type(n) in [IdentNode, VarDeclNode]:
      scope[n.val] = n
    elif type(n) in [FunctionNode, ForLoopNode, DoWhileNode, 
                     TryNode, CatchNode, SwitchNode, WhileNode,
                     IfNode, ElseNode]:
      scope = NodeScope(scope)
      if type(n) == FunctionNode:
        scope[n.name] = n
    elif type(n) == BinOpNode and n.op == ".":
      scope = handle_dot_scope(n, scope)
    
    return scope

def set_const_types():
  global typespace
  
  def visit_num(n):
    if n.type != None: return
    
    if type(n.val) == float: n.type = BuiltinTypeNode("float")
    else: n.type = BuiltinTypeNode("int")
    
  def visit_str(n):
    if n.type != None: return
    
    n.type = typespace.functions["String"]
    
  def visit_reg(n):
    if n.type != None: return
    
    n.type = typespace.functions["String"]
    
  traverse_files(NumLitNode, visit_num);
  traverse_files(StrLitNode, visit_str);
  traverse_files(RegExprNode, visit_reg);

def filter_binop_assigns():
  global typespace
  
  def visit_binop(n):
    if n.op != "=": return
    if type(n.parent) not in [StatementList, FunctionNode]: return
    
    assign = AssignNode(n[0], n[1], "=")
    assign.type = n.type
    
    n.parent.replace(n, assign)
    
  traverse_files(BinOpNode, visit_binop)
  
def infer_types(ts):
  global typespace
  typespace = ts
  
  filter_binop_assigns()
  
  build_classes(ts.filenodes)
  process_logrec()
  
  if glob.g_do_annote:
    process_type_annotation()
  
  if glob.g_print_classes:
    print_class_hiearchy()
  
  set_const_types()

from js_global import glob
from js_typespace import *
from js_ast import *
from js_util_types import *

import js_ast
node_types = set()

for k in js_ast.__dict__:
  n = js_ast.__dict__[k]
  try:
    if not issubclass(getattr(js_ast, k), Node):
      continue;
  except TypeError:
    continue
  node_types.add(k)

  