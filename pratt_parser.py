import ply.yacc as yacc
import ply.lex as lex
from ply.lex import TOKEN
from ply.lex import LexToken, Lexer

reserved_tokens = [
]

def pformat(obj, tab=0):
  t = ""
  for i in range(tab):
    t += "  "
  
  s = ""
  if type(obj) in [int, float]:
    return str(obj)
  elif type(obj) == str:
    return '"%s"' % obj
  elif type(obj) in [list, tuple]:
    s += "["
    for i, ob in enumerate(obj):
      if i > 0: s += ", "
      s += pformat(ob, tab)
    s += "]"
    return s
  elif type(obj) == dict:
    lst = list(obj)
    lst.sort()
    
    s += t + "{\n"
    for k in lst:
      if k.startswith("_"): continue
      s += t + "  " + k + " : " + pformat(obj[k], tab+1) + "\n"
    s += t + "}"
    return s
  return str(obj)
  
def pprint(obj):
  print(pformat(obj))

def t_ID(t):
  r'[$a-zA-Z_]+[a-zA-Z0-9_$]*'
  
  global reserved_tokens
  if (t.value in reserved_tokens):
    t.type = t.value.upper()
  return t
  
t_PLUS = r'\+'
t_MINUS = r'\-'
t_DIV = r'\/'
t_MUL = r'\*'
t_LPARAM = r'\('
t_RPARAM = r'\)'
t_DOT = r'\.'

def t_error(token):
  print("syntax error!", token);
  
tokens = [
  "ID", "PLUS", "MINUS", "DIV", "MUL", "LPARAM", "RPARAM", "DOT"
] + reserved_tokens;

reserved_tokens = set(reserved_tokens);

class LexWithPrev():
  def __init__(self, lexer):
    self.lexer = lexer
    self.prev = None
    self.cur = None
    self.lineno = 0
    self.lexpos = 0
    self.peeks = []
    self.rawlines = []
    self.prev_lexpos = 0

    self.comment = None
    self.comment_id = 0
    self.comments = {}
    
    lexer.comment = None
    lexer.comment_id = 0
    lexer.comments = {}
    
  def next(self):
    t = self.token()
    if t == None: raise StopIteration
    
    return t
  
  def peek(self):
    p = self.lexer.token()
    
    if p == None: return p
    
    p.lineno = self.lexer.lineno;
    p.lexer = self;
    
    self.peeks.append([p, self.lexer.lexpos])
    return p
  
  def token(self):
    self.prev = self.cur;
    if len(self.peeks) > 0:
      self.prev_lexpos = self.lexpos
      self.cur, self.lexpos = self.peeks.pop(0)
      
      self.cur.lexpos = self.lexpos
      self.cur.prev_lexpos = self.prev_lexpos
      
      return self.cur
    
    self.cur = self.lexer.token()
    
    if self.cur != None:
      self.cur.lexer = self
      self.cur.lineno = self.lexer.lineno
      self.cur.prev_lexpos = self.prev_lexpos
      
    self.lineno = self.lexer.lineno
    self.prev_lexpos = self.lexpos;
    self.lexpos = self.lexer.lexpos
    
    return self.cur
    
  def input(self, data):
    self.comment_id = 0
    self.lineno = self.lexer.lineno = 0
    
    self.lexer.lineno = self.lineno
    self.lexer.input(data)
    self.rawlines = data.replace("\r\n", "\n").split("\n")
  
  def set_lexpos(self, lexpos):
    self.lexpos = lexpos
    self.lexer.lexpos = lexpos
  
  def push(self, tok):
    self.peeks.insert(0, [tok, tok.lexpos])
  
  def push_state(self, state):
    self.lexer.push_state(state)
  
  def pop_state(self):
    self.lexer.pop_state()

lexer = LexWithPrev(lex.lex())

ID_P = 0
PARAM_P = 1
PREFIX_P = 2
MUL_P = 3
SUM_P = 4
FUNC_P = 5

def prefix_op(tok):
  global prefix_tokmap
  prefix_tokmap[tok] = 1

def infix_op(tok, prec):
  global infix_tokmap
  infix_tokmap[tok] = prec
  
prefix_tokmap = {}

prefix_op("MINUS");
prefix_op("PLUS");
prefix_op("NAME");

infix_tokmap = {}
infix_op("PLUS", SUM_P);
infix_op("MINUS", SUM_P);
infix_op("MUL", MUL_P);
infix_op("DIV", MUL_P);

def prefix_parse(lexer, token):
  op = parse(lexer, 10);
  return {"type" : "unary", "op" : token.type, "rvalue" : op};

def infix_parse(lexer, expr, token, prec):
  right = parse(lexer, prec)
  return {"type" : "binary", "op" : token.type, "left" : expr, "right" : right}
  
def parse(lexer, prec=10, tree=None):
  tok = lexer.token()
  
  #handle left
  if tree == None:
    if tok.type == "ID":
      tree = {"type" : "ID", "val" : tok.value}
    elif tok.type in prefix_tokmap:
      tree = prefix_parse(lexer, tok)
    else:
      print("error!!!!")
  
  #handle right
  tok = lexer.peek()
  if tok == None:
    return tree
  
  if tok.type in infix_tokmap:
    prec2 = infix_tokmap[tok.type]
    
    if (prec2 > prec):
      return tree
    else:
      while (prec2 <= prec):
        tok = lexer.token();
        if tok == None: break
        
        prec2 = infix_tokmap[tok.type]
        tree = infix_parse(lexer, tree, tok, prec2)
        
  else:
    print("infix error!!!!")
    
  return tree
  
str1 = "a+b*c" #a + b * c - d - e"
lexer.input(str1)
ret = parse(lexer)

pprint(ret)

  