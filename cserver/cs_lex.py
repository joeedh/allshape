import sys, re
from ply import lex

reserved = []

states = [
  ("code", "exclusive"),
  ("binding", "exclusive"),
]

tokens = [
  "CODE",
  "CODE_ERR",
  "HTML",
  "BINDING",
  "ALL",
  "INCLUDE"
] + [r.upper() for r in reserved]

"""
t_LTHAN = r'\<'
t_GTHAN = r'\>'
t_DOLLAR = r'\$'
t_ID = r'[a-zA-Z_$]+[a-zA-Z0-9_$]*'
t_NUMBER = r'[0-9]+'
t_QUOTE = r'[\'"]'
t_POUND = r'\#'
#"""


def t_CODE_ERR(t):
  r'\#\>'
  
  return t
  
def do_lineno(t):
  t.lexer.lineno += t.value.count("\n")
  
def t_error(t):
  msg = "Illegal character '%s'" % t.value[0]
  sys.stderr.write(msg+"\n")
  t.lexer.skip(1)
  
  raise SyntaxError(msg)

def t_binding_error(t):
  msg = "Illegal character '%s'" % t.value[0]
  sys.stderr.write(msg+"\n")
  t.lexer.skip(1)
  
  raise SyntaxError(msg)
  
def t_code_error(t):
  msg = "Illegal character '%s'" % t.value[0]
  sys.stderr.write(msg+"\n")
  t.lexer.skip(1)
  
  raise SyntaxError(msg)

cur_binding = ""
cur_bindtype = ""
def t_BINDING(t):
  r'\<\#\=[a-zA-Z_]+[a-zA-Z0-9_*\[\]]*\ '
  global cur_binding, cur_bindtype
  cur_binding = ""
  cur_bindtype = t.value[3:].strip()
  
  t.lexer.push_state("binding")
  
def t_binding_BINDING(t):
  r'\#\>'
  
  global cur_binding
  
  t.value = cur_bindtype + "|" + cur_binding
  t.type = "BINDING"
  t.lexer.pop_state()
  
  return t
  
def t_binding_ALL(t):
  r'.|[\n\r\t ]'
  
  global cur_binding
  cur_binding += t.value
  do_lineno(t)

get_incl_re = re.compile(r'["<\'][a-zA-Z0-9_./\\]+[">\']')
def t_INCLUDE(t):
  r'\<\#include\s*["<\'][a-zA-Z0-9_./\\]+[">\']\s*\#\>'
  
  global get_incl_re
  m = get_incl_re.search(t.value)
  if m == None:
    t.type = "ERROR"
    return t
    
  spn = m.span()
  s = t.value[spn[0]:spn[1]]
  s = s[1:-1]
  
  t.value = s
  return t

"""
import re
pat = re.compile(r'\<\#include\s*["<\'][a-zA-Z0-9_./\\]+[">\']\s*\#\>')
tst = "<#include 'site/bleh.h' #>s"
m = pat.match(tst)
if m:
  re2 = re.compile(r'["<\'][a-zA-Z0-9_./\\]+[">\']')
  print(dir(m))
  m2 = re2.search(tst)
  print(m2.span())
  spn = m2.span()
  print(spn)
  s = tst[spn[0]: spn[1]]
  print(s)
sys.exit()
#"""

cur_code = ""
def t_CODE(t):
  r'\<\#(?!include)'
  
  global cur_code
  t.lexer.push_state("code")
  cur_code = ""
  
def t_code_CODE(t):
  r'\#\>'
  
  global cur_code
  
  t.value = cur_code
  t.type = "CODE"
  t.lexer.pop_state()
  
  return t
  
def t_code_ALL(t):
  r'.|[\n\r\t ]'
  
  global cur_code
  cur_code += t.value
  do_lineno(t)

def t_HTML(t):
  r'.|[\n\r\t ]'
  do_lineno(t)
  
  return t
  
lexer = lex.lex()

if __name__ == "__main__":
  tst = """
  <yay>
  
  <#
    int a = b;
  #>
  """
  
  lexer.input(tst)
  tok = lexer.token()
  while tok != None:
    print(tok)
    tok = lexer.token()
  
  