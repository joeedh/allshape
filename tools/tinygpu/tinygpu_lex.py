# ------------------------------------------------------------
# calclex.py
#
# tokenizer for a simple expression evaluator for
# numbers and +,-,*,/
# ------------------------------------------------------------
import ply.lex as lex
from ply.lex import TOKEN
# List of token names.   This is always required

class Glob:
  g_line = 0
  g_error = False
  g_print_output = False
  g_print_tree = False
  g_print_lex = False
  g_make_test = False
  g_test_outpath = ""
  g_parse_failed = False
  g_pause_at_end = False
  g_print_parser_stacktrace = False
  g_print_msvc_errors = False
  
glob = Glob()

res = [
'if', 'then', 'else', 'while', 'do', 'function', 
'var', 'for', 'new', "return", "continue", "break",
'int', 'float', 'double', 'short', 'byte', 'void', 'struct',
'union', 'uniform', 'input', 'output', 'float16', 'bool', 
'builtin', 'true', 'false', 'highp', 'mediump', 'lowp',
'attribute', 'varying',
]

reserved = {}
for k in res:
  reserved[k] = k.upper()

for i in range(len(res)):
  res[i] = res[i].upper()

reserved_words = tuple(res)

"""
to use token states:

states = [
  ("main", "inclusive"|"exclusive") 

add state name as prefix to toke, e.g. t_main_token

stack management:

t.lexer.push_state("main")
t.lexer.pop_state()

get lex tokens between two stored positions (exclude comments and like by not returning them):
  t.lexer.lexdata[t.lexer.code_start:t.lexer.lexpos+1]
]
"""

states = [
  ("incomment", "exclusive"),
  ("instr", "exclusive")
]

tokens = (
   'COMMENT',
   'INC',
   'DEC',
   'GTHAN',
   'LTHAN',
   'EQUAL',
   'MOD',
   'GTHANEQ',
   'LTHANEQ',
   'NUMBER',
   'PLUS',
   'MINUS',
   'TIMES',
   'DIVIDE',
   'LPAREN',
   'RPAREN',
   'SEMI',
   'LBRACKET',
   'RBRACKET',
   'BNEGATE',
   'BAND',
   'BOR',
   'BXOR',
   'LAND',
   'LOR',
   'NOT',
   'ID',
   "NOTEQUAL",
   "STRINGLIT",
   "ASSIGN",
   "DOT",
   "BACKSLASH",
   "EMPTYLINE",
#   "NL",
   "COMMA",
   "LSBRACKET",
   "RSBRACKET",
   "COLON",
   "QEST",
   "SLASHR",
   "OPENCOM",
   "CLOSECOM",
   "ALL", #only used in states
   "newline",
   "ASSIGNPLUS",
   "ASSIGNMINUS", 
   "ASSIGNDIVIDE", 
   "ASSIGNTIMES",
   "ASSIGNBOR",
   "ASSIGNBAND",
   "ASSIGNBXOR"                  
) + reserved_words

# Regular expression rules for simple tokens
t_ASSIGNPLUS = r'\+='
t_ASSIGNMINUS = r'-='
t_ASSIGNDIVIDE = r'/='
t_ASSIGNTIMES = r'\*='
t_ASSIGNBOR = r'\|='
t_ASSIGNBAND = r'\&='
t_ASSIGNBXOR = r'\^='

t_BAND = r'&'
t_BOR = r'\|'
t_BXOR = r'\^'
t_LAND = r'&&'
t_LOR = r'\|\|'
t_NOTEQUAL = r'\!='
t_NOT = r'\!'
t_EQUAL = r'=='
t_GTHAN = r'\>'
t_LTHAN = r'\<'
t_GTHANEQ = r'\>='
t_LTHANEQ = r'\<='
t_INC = r'\+\+'
t_DEC = r'--'
t_PLUS    = r'\+'
t_MINUS   = r'-'
t_TIMES   = r'\*'
t_DIVIDE  = r'/'
t_MOD     = r'%'
t_LPAREN  = r'\('
t_RPAREN  = r'\)'
t_LBRACKET = r'\{'
t_RBRACKET = r'\}'
t_ASSIGN = r'='
t_DOT = r'\.'
t_BACKSLASH = r'\\'
t_COMMA = r','
t_LSBRACKET = r'\['
t_RSBRACKET = r'\]'
t_COLON = r'\:'
t_SEMI = r';'
t_QEST = r'\?'
t_ALL = r'ENOTHINGNODTHINGNOGTHINGNOHTHING'

#t_STRINGLIT = r'".*"'
strlit_val = ""
def t_STRINGLIT(t):
  r'\"'
  global strlit_val
  strlit_val = ""
  t.lexer.push_state("instr")
  
def t_instr_STRINGLIT(t):
  r'\"'
  global strlit_val
  t.lexer.pop_state()
  t.value = strlit_val
  return t

def t_instr_ALL(t):
  r'.|\n|\r';

  global strlit_val
  strlit_val += t.value
  
  t.lineno += '\n' in t.value
  
def t_SLASHR(t):
  r'\r+'

def t_OPENCOM(t):
  r'/\*'
  t.lexer.push_state("incomment")
  
def t_incomment_CLOSECOM(t):
  r'\*/'
  t.lexer.pop_state()

def t_incomment_ALL(t):
  r'[^/\*]+';
  
  if 0: #"\n" in t.value:
    print(t.value.count("\n"), repr(t.value))
    raise "wer"
  
  t.lexer.lineno += t.value.count("\n")

# Error handling rule
def t_incomment_error(t):
    #print("Illegal character '%s'" % t.value[0])
    t.lexer.skip(1)

#def t_incomment_newline(t):
#    r'\n+'
#    t.lexer.lineno += len(t.value)
    
# Error handling rule
def t_instr_error(t):
    print("Illegal character '%s'" % t.value[0])
    t.lexer.skip(1)
    
def t_COMMENT(t):
  r'//.*\n'
  
  #r'(/\*(.|\n|\r)*\*/)|'

  t.lexer.lineno += t.value.count("\n")

@TOKEN(r'[a-zA-Z_][a-zA-Z_0-9]*')
def t_ID(t):
    t.type = reserved.get(t.value, 'ID')    # Check for reserved words
    
    return t
    
# A regular expression rule with some action code
def t_NUMBER(t):
    r'(\d*\.\d+)|(\d+)'
    if "." in t.value:
      t.value = float(t.value)
    else:
      t.value = int(t.value)
    
    return t

def t_EMPTYLINE(t):
  r'\n[ \t]\n'
  t.lexer.lineno += t.value.count("\n")
  
# this rule finds newlines not preceded by backslashes, to handle
#multi-line statements
"""
def t_NL(t):
  r'(?<!\\)\n'
  
  #t.lexer.lineno += 1
  
  #if "\\" not in t.value:
  #  return t
"""

# Define a rule so we can track line numbers
def t_newline(t):
    r'\n+'
    t.lexer.lineno += len(t.value)
      
# A string containing ignored characters (spaces and tabs)
t_ignore  = ' \t'
t_instr_ignore  = ''
t_incomment_ignore = ''

# Error handling rule
def t_error(t):
    print("Illegal character '%s'" % t.value[0])
    t.lexer.skip(1)

# Build the lexer
class LexWithPrev():
  def __init__(self, lexer):
    self.lexer = lexer
    self.prev = None
    self.cur = None
    self.lineno = 0
    self.peeks = []
    
  def next(self):
    return self.lexer.next()
  
  def peek(self):
    p = self.lexer.token()

    self.peeks.append(p)
    return p
    
  def token(self):
    self.prev = self.cur;
    if len(self.peeks) > 0:
      self.cur = self.peeks.pop(0)
      return self.cur
    
    self.cur = self.lexer.token()
    
    if self.cur != None:
      self.cur.lexer = self
    
    self.lineno = self.lexer.lineno
    
    return self.cur
    
  def input(self, data):
    self.lexer.lineno = self.lineno
    self.lexer.input(data)
  
  def push(self, tok):
    self.peeks.insert(0, tok)
  
  def push_state(self, state):
    self.lexer.push_state(state)
  
  def pop_state(self):
    self.lexer.pop_state()
    
plexer = LexWithPrev(lex.lex())
