from math import *
import sys, datetime
from logger import elog, mlog, alog
from config import WITH_PY2

#an important note: the keyrot/unrot functions are not
#for security purposes, they're just for obfuscation.

def _to_ascii(val):
  if sys.version[0] == "2":
    return str(val)
  else:
    return str(val, "latin-1")

def bstr_py3(s):
  if type(s) == bytes: return s
  else: return bytes(str(s), "ascii")
  
def bstr_py2(s):
  return str(s)
  
import sys
if not WITH_PY2:
  from io import StringIO
  bstr = bstr_py3
else:
  from StringIO import StringIO
  bstr = bstr_py2
  
def errlog(msg):
	elog(msg)

limit_code = {"0": 0, "1": 1, "2": 2,
              "3": 3, "4": 4, "5": 5,
              "6": 6, "7": 7, "8": 8, 
              "9": 9}

limit_code_rev = {}

c = 10
def gen_code():
  global c
  
  c += 1
  return c - 1

for i in range(65, 91):
  limit_code[chr(i)] = gen_code()

limit_code["."] = gen_code()
max_limit_code = c

for k in limit_code:
  limit_code_rev[limit_code[k]] = k

_rnd_table = [
  2396599, 1798863, 2424653, 864425, 3411264, 
  3454329, 2740820, 672041, 2183812, 1374757, 1048546, 
  3996342, 4179799, 186880, 3607721, 2529926, 1600547, 
  1189562, 2830964, 1916059, 2876667, 2775942, 557742, 
  3220496, 4120476, 4065846, 2572439, 185639, 17008, 
  561912, 3946789, 1270269, 1535702, 3767250, 1318517, 
  2302563, 1828818, 272601, 2451727, 3540223, 656058, 
  940763, 1731676, 154871, 2082874, 3430816, 2759352, 
  2237558, 3586602, 627827, 2379121, 1569378, 2522015, 
  473595, 3252686, 405188, 697769, 3386638, 3974855, 
  1817076, 1736754, 1029609, 1152171, 2588906
]
_max_rnd = 4194240.0;

class StupidRandom:
  def __init__(self, seed=None):
    self.i = 0;
    self.j = 0;
    self._seed = 0;
    self.max = _max_rnd;
    
    if seed != None:
      self.seed(seed);
  
  def seed(self, seed):
    self._seed = int(seed)
    self.i = self.j = 0 
    
  def random(self):
    i = self.i + self._seed*self.j;
    
    r1 = _rnd_table[(self.i+self._seed)%len(_rnd_table)]
    r2 = _rnd_table[i%len(_rnd_table)]
    
    self.i += 1
    self.j += 3
    
    return (r1+r2) % self.max
  
  def frandom(self):
    return self.next() / self.max

_keyrot_rnd = StupidRandom(0)

def key_rot(key):
  key = str(key).upper()
  s2 = ""
  
  if len(key) > 0:
    c = key[len(key)-1]
    
    if c not in limit_code:
      c = "."
    
    _keyrot_rnd.seed(limit_code[c])

  for i in range(len(key)-1):
    c = key[i]
    
    if c not in limit_code:
      c = "."
    
    limitcode = limit_code[c]
    r = floor(_keyrot_rnd.random()%24)
    limitcode = (limitcode + r) % max_limit_code
    
    c = limit_code_rev[limitcode]
    s2 += c
  
  if len(key) > 0:
    s2 += key[len(key)-1]
  
  return s2

def key_unrot(key):
  key = str(key).upper()
  s2 = ""
  
  if len(key) > 0:
    c = key[len(key)-1]
    if c not in limit_code:
      c = "."
    
    _keyrot_rnd.seed(limit_code[c])
  
  for i in range(len(key)-1):
    c = key[i]
    
    if c not in limit_code:
     c = "."
    
    limitcode = limit_code[c]
    r = floor(_keyrot_rnd.random()%24)
    limitcode = (limitcode + max_limit_code - r) % max_limit_code
    
    c = limit_code_rev[limitcode]
    s2 += c
  
  if len(key) > 0:
    s2 += key[len(key)-1]
  
  return s2

if __name__ == "__main__":
  s1 = key_rot("000000001.00000005")
  print(s1, key_unrot(s1))
