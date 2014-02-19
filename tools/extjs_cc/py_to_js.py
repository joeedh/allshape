import os, sys, time, random, math, re, imp, io

bracket = "__PLACEHOLDER_LBRACKET"

def replace_for_range(buf):
  def range_for_sub(m):
    gs = m.groups()
    
    print(gs)
    
    if len(gs) == 5 and gs[3].strip() != '':
      return "for (var %s=%s; %s<%s; %s++) %s" % (gs[0], gs[1], gs[0], gs[3], gs[0], bracket)
    else:
      return "for (var %s=0; %s<%s; %s++) %s" % (gs[0], gs[0], gs[1], gs[0], bracket)
  
  pat = r'for\s([a-zA-Z_]+[0-9a-zA-Z_]*)\sin\srange\(([a-zA-Z0-9_\[\]\+\-\*\%\/\(]*(\)(?!\:))*),?\s?([a-zA-Z0-9_\[\]\+\-\*\%\/\(]*(\)(?!\:))*)?\)\:'
  
  m = re.sub(pat, range_for_sub, buf)
  return m

def replace_for(buf):
    def for_sub(m):
      gs = m.groups()
      print(gs)
      
      return "for (var " + gs[0] + ") " + bracket
      
    pat = 'for\s(.*)\:'
    m = re.sub(pat, for_sub, buf)
    
    return m

def replace_def(buf):
    def for_sub(m):
      gs = m.groups()
      print(gs)
      
      return "function " + gs[0] + " " + bracket
      
    pat = 'def\s(.*)\:'
    m = re.sub(pat, for_sub, buf)
    
    return m

def replace_class(buf):
    def for_sub(m):
      gs = m.groups()
      print(gs)
      
      return "function " + gs[0] + " " + bracket + " //class"
      
    pat = 'class\s(.*)?\:'
    m = re.sub(pat, for_sub, buf)
    
    return m
    
def replace_pass(buf):
  return re.sub(r'pass', '', buf)

def replace_comment(buf):
  return re.sub(r'\#', '//', buf)

def destroy_triple_quotes(buf):
  lines = buf.split("\n")
  in_str = 0
  
  buf2 = ""
  for l in lines:
    if '"""' in l:
      if "#" in l and l.find("#") > l.find('"""'):
        in_str ^= 1
      else:
        in_str ^= 1
    
    if '"""' in l:
      l = l.replace('"""', "")
      if l.strip() == "": continue
      
    if not in_str:
      buf2 += l + "\n"
  return buf2
  
def add_rbrackets(buf):
  lines = buf.split("\n")
  
  def find_tablevel(s):
    j = 0
    tlvl = 0
    while j < len(s) and s[j] in [" ", "\t"]:
      tlvl += 1
      j += 1
      
    return tlvl
    
  def find_tablevel_str(s):
    j = 0
    tlvl = 0
    while j < len(s) and s[j] in [" ", "\t"]:
      tlvl += 1
      j += 1
      
    return s[:tlvl]
    
  buf2 = ""
  i = 0
  stack = []
  while i < len(lines):
    l = lines[i]

    l = lines[i]
    if l.strip() != "" and not l.strip().startswith("#"):
      t = find_tablevel(l)
      while len(stack) > 0 and stack[-1] >= t:
        
        print("yay, found closing place", stack[-1], t)
        print("line: ", l)
        ts = ""
        for j in range(stack[-1]):
          ts += " "
          
        buf2 += "\n" + ts + "}\n"
        stack.pop(-1)
        
    buf2 += l + "\n"

    if bracket in l:
      stack.append(find_tablevel(l))
      print(stack)
    
    i += 1
  
  buf2 = buf2.replace(bracket, "{")
  return buf2
  
def main(buf, inpath, outpath):
  _buf = """
  for i in range(2):
    print(b)
    
  for i in list(2):
    print("bleh")
    
  def a(b, c, d):
    pass
  
  \"""
  yay
     yay
  \"""
  class c:
    def __init__(self):
      pass
  
  class c(b):
    def __init__(self):
      pass
  """
  
  m = replace_for_range(buf)
  m = replace_for(m)
  m = replace_def(m)
  m = replace_class(m)
  m = destroy_triple_quotes(m)
  m = add_rbrackets(m)
  m = replace_pass(m)
  m = replace_comment(m)
  
  #"""
  file = open(outpath, "w")
  file.write(m)
  file.close()
  #"""
  
  print(m)

print(sys.argv)

if len(sys.argv) not in [2, 3]:
  print("Usage: py_to_js.py infile outfile")
else:
  infile = sys.argv[1]
  if len(sys.argv) == 3:
    outfile = sys.argv[2]
  else:
    outfile = infile

  file = open(infile)
  buf = file.read()
  file.close()
  
  main(buf, infile, outfile)
