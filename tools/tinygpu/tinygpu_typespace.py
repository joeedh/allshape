from tinygpu_ast import *
import sys, os, os.path, io, struct, random, time, math

class TypeSpace:
  def __init__(self, data):
    self.types = {}
    self.functions = {}
    self.globals = {}
    self._error = []
    self.structs = {}
    self.data = data
    self.lines = data.split("\n")
    self.op_map = \
    {'+': 'add', '-': 'sub', '/': 'div', '*': 'mul', 
     '==': 'equals', '<': 'lt', '>': 'gt', '>=': 'gte',
     '<=': 'lte', '&&': 'and', '||': 'or', '%': 'mod', 
     '&': 'band', '|': 'bor', '^': 'xor', '~': 'bitinv',
     '<<': 'lshift', '>>': 'rshift', "!=": "noteq", 
     "++": "inc", "--": "dec"}

    self.op_order = [".", "++", "--", "!", "%", "/", 
                    "*", "+", "-", "<", ">", "==", "!=", ">=", 
                    "<=", "&&", "||", "&", "|", "^", "?", ":"]
                    
    self.op_type_map = {'float': 'f32'}
    self.builtin_type_map = {'sampler2D': 'sampler2D', 'f32': 'f32', 'float': 'f32', 'vec2': 'vec2', 'bool': 'bool', 'float16': 'float', 'int': 'int', 'void': 'void'}
    
    self.logical_ops = set(["||", "&&", "!"])
    
    for v in list(self.op_type_map.values()):
      self.op_type_map[v] = v
      
  def resolve_binop_type(self, t1, t2, op, scope):
    return t2
  
  def has_error(self):
    return len(self._error) != 0
  
  def print_msvc_errors(self):
    files = glob.files
    
    #we're not tracking files yet, so just pick the first one
    for line, msg in self._error:
      sys.stderr.write("%s(%d): error: %s\r\n"%(files[0], line+1, msg))
    
  def print_errors(self):
    if glob.g_print_msvc_errors:
      self.print_msvc_errors()
      return
    
    sys.stderr.write("\r\n")
    #sys.stderr.write(r"..\..\tinygpu_mathlib.tg(10): error: Bad" + "\r\n");
    for line, msg in self._error:
      sys.stderr.write("Error at line %i: %s\r\n" % (line+1, msg))
      sys.stderr.write("  " + self.lines[line] + "\r\n")
      
  def error(self, line, msg):
    self._error.append([line, msg])
    raise GSParseError("Error at line %i: %s" % (line+1, msg))
  
  def get_arr_stream_type(self, node, scope={}):
    if type(node) == IdentNode:
      return node.ret_type
    elif type(node) == ArrayRefNode:
      return self.get_arr_stream_type(node.children[0], scope)
    elif type(node) == BinOpNode:
      t1 = self.get_arr_stream_type(node.children[0], scope)
      t2 = self.get_arr_stream_type(node.children[1], scope)
      
      return t2 if type(t2) != BuiltinTypeNode else t1
    
  def get_type(self, t, scope={}, line=0):
    if t in scope:
      t = scope[t]
    elif t in self.globals:
      return self.globals[t]
    elif t in self.types:
      t = self.types[t]
    elif t in self.functions:
      t = self.functions[t]
    else:
      self.error(line, "Could not resolve type for variable %s"%t)
    return t

  def get_type_name(self, t, scope={}, convert_glsl_types=True):
    if type(t) == TypeRefNode:
      return t.type
    elif type(t) == NumLitNode:
      return self.get_type_name(t.ret_type, scope, convert_glsl_types)
    elif type(t) == VarDeclNode:
      return self.get_type_name(t.type, scope, convert_glsl_types)
    elif type(t) == IdentNode:
      if t.val in scope:
        t = scope[t.val]
      elif t.val in self.globals:
        return self.globals[t.val]
      elif t.val in self.types:
        t = self.types[t]
      else:
        self.error(t.line, "Could not resolve type for variable %s"%t.val)
      return self.get_type_name(t, scope, convert_glsl_types)
    elif type(t) == BuiltinTypeNode:
      if convert_glsl_types and t.type in self.builtin_type_map:
        return self.builtin_type_map[t.type]
      else:
        return t.type
    elif type(t) == StructTypeNode:
      return t.name
    elif type(t) == ArrTypeNode:
      return self.get_type_name(t.type, scope, convert_glsl_types)
    elif type(t) == ExprNode:
      return self.get_type_name(t.children[0], scope, convert_glsl_types) if len(t.children) > 0 else None
    elif type(t) == FunctionNode:
      return self.get_type_name(t.children[0])
  
  #creates constant initializers for basic and emulated
  #types
  def gen_num_lit(self, node, gen_expr, scope):
    ret_type = node.ret_type
    if ret_type == None:
      ret_type = node.parent.ret_type
    if type(ret_type) == VarDeclNode:
      ret_type = ret_type.ret_type2
        
    if ret_type.type not in self.op_type_map:
      return str(node.val)
    
    tname = self.op_type_map[ret_type.type]
    if tname != "f32":
      return "%s_new(%s)"%(self.op_type_map[ret_type.type], str(node.val))

    sgn = -1.0 if node.val < 0.0 else 1.0;
    
    if node.val == 0.0:
      exp = 0.0;
      mant = -1.0;
    else:
      val = math.fabs(node.val);
      exp = math.floor(math.log(val) / math.log(2));
      mant = val/(2.0**exp) - 1.0;
    
    n1 = NumLitNode(float(exp)); n1.ret_type = BuiltinTypeNode("float16")
    n2 = NumLitNode(float(mant)); n2.ret_type = BuiltinTypeNode("float16")
    n3 = NumLitNode(float(sgn)); n3.ret_type = BuiltinTypeNode("float16")
    
    n1 = gen_expr(n1, self, scope)
    n2 = gen_expr(n2, self, scope)
    n3 = gen_expr(n3, self, scope)
    
    return "%s(%s, %s, %s)" % (tname, n1, n2, n3)
  
  def gen_bin_expr(self, node, ctx, scope, gen_expr):
    def get_struct_node(n):
      if n.ret_type != None:
        n1 = self.get_type(self.get_type_name(n.ret_type, scope), scope, node.line)
      elif type(n) == IdentNode:
        n1 = self.get_type(n.val, scope, node.line)
        if type(n1) == VarDeclNode:
          n1 = n1.children[0]
        if type(n1) == TypeRefNode:
          n1 = self.get_type(n1.type, scope, node.line)
      return n1
      
    if node.op == ".":
      scope = dict(scope)
      n1 = get_struct_node(node.children[0])
      
      for k in n1.members:
        scope[k] = n1.members[k].ret_type
        
      n2 = self.get_type(node.children[1].val, scope)
      
      if len(node.children) > 0 and node.children[0].ret_type != None:
        stream_type = node.children[0].ret_type.stream_type
      else:
        stream_type = None
      
      if stream_type != None:
        c1 = gen_expr(node.children[0], ctx, scope)
        c2 = gen_expr(node.children[1], ctx, scope)
        
        code =  c1 + "+%i"%(n2.start)
      else:
        code = gen_expr(node.children[0], ctx, scope) + "." + gen_expr(node.children[1], ctx, scope)
    else:
      ntype = node.ret_type
      ntypestr = ""
      
      if type(ntype) == VarDeclNode:
        ntype = ntype.ret_type2
      if type(ntype) == BuiltinTypeNode:
        ntype = ntype.type
      if type(ntype) == TypeRefNode:
        ntypestr = ntype.type
      if type(ntype) == StructTypeNode:
        ntypestr = ntype.name
      if type(ntype) == str:
        ntypestr = ntype
      
      if gen_expr(node.children[0], ctx, scope) == "a4":
        pass #print("-", ntypestr, "+", ctx.get_type_name(ntype, scope, False))
        
      add_paren = False
      if type(node.parent) == BinOpNode:
        i1 = self.op_order.index(node.op)
        i2 = self.op_order.index(node.parent.op)
        if i1 > i2:
          add_paren = True
      
      code = ""
        
      s = gen_expr(node.children[0], ctx, scope)
      if node.op not in self.logical_ops and ntypestr in self.op_type_map:
        code = "%s_%s("%(self.op_type_map[ntypestr], self.op_map[node.op])
        code += "%s, %s)"%(gen_expr(node.children[0], ctx, scope), gen_expr(node.children[1], ctx, scope))
      else:
        if add_paren: code += "("
        code += gen_expr(node.children[0], ctx, scope) + node.op + gen_expr(node.children[1], ctx, scope)
        if add_paren: code += ")"
      
    return code
  
  def get_var_name(self, node, name=""):
    if type(node) == VarDeclNode:
      return node.name
    elif type(node) == IdentNode:
      return node.val
    elif type(node) == ArrTypeNode:
      return self.get_var_name(node.type)
      
    return ""
  
  def build_var_str(self, node, name=""):
    if type(node) == VarDeclNode:
      return self.build_var_str(node.type, " "+node.name)
    elif type(node) == IdentNode:
      return node.val
    elif type(node) == ArrTypeNode:
      if node.builtin_name != None:
        return node.builtin_name + name
        
      if len(node.children) > 0:
        return self.build_var_str(node.type) + name + self.build_var_str(node.children[0]) + "[%i]"%node.dim
      else:
        return self.build_var_str(node.type) + name + "[%i]"%node.dim
    elif type(node) == BuiltinTypeNode:
      if node.type in self.builtin_type_map:
        return self.builtin_type_map[node.type] + name
      else:
        return node.type + name
    elif type(node) == StructTypeNode:
      return node.name + name
    elif type(node) == TypeRefNode:
      t = self.get_type(node.type)
      return self.build_var_str(t, name)
      
    return ""
  
  def limited_eval(self, node):
    if type(node) in [IdentNode, StrLitNode, NumLitNode, BoolLitNode]:
      return node.val
    elif type(node) in [ExprNode, ExprListNode] and len(node.children) > 0:
      return self.limited_eval(node.children[-1])
    elif type(node) == BinOpNode:
      return self.limited_eval(node.children[1])
    elif type(node) == ArrayRefNode:
      None       
  
      
    
