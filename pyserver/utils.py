from math import *
import sys, datetime
from logger import elog, mlog, alog

def bstr_py3(s):
  if type(s) == bytes: return s
  else: return bytes(str(s), "ascii")
  
def bstr_py2(s):
  return str(s)
  
import sys
if sys.version_info.major > 2:
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

_sran_tab = [0.42858355099189227,0.5574386030715371,0.9436109711290556,
0.11901816474442506,0.05494319267999703,0.4089598843412747,
0.9617377622975879,0.6144736752713642,0.4779527665160106,
0.5358937375859902,0.6392009453796094,0.24893232630444684,
0.33278166078571036,0.23623349009987882,0.6007015401310062,
0.3705022651967115,0.0225052050200355,0.35908220770197297,
0.6762962413645864,0.7286584766550781,0.19885076794257972,
0.6066651236611478,0.23594878250486895,0.9559806203614414,
0.37878311003873877,0.14489505173573436,0.6853451367228348,
0.778201767931336,0.9629591508405009,0.10159174495809686,
0.9956652458055149,0.27241630290235785,0.4657146086929548,
0.7459995799823305,0.30955785437169314,0.7594519036966647,
0.9003876360971134,0.14415784566467216,0.13837285006138467,
0.5708662986155526,0.04911823375362412,0.5182157396751097,
0.24535476698939818,0.4755762294863617,0.6241760808125321,
0.05480018253112229,0.8345698022607818,0.26287656274013016,
0.1025239144443526]

class StupidRandom: #seed is optional
  def __init__(self, seed):
    if seed == None:
      seed = 0
  
    self._seed = seed+1
    self.i = 1
    
  def seed(self, seed):
    self._seed = seed+1
    self.i = 1
  
  def random(self):
    global _sran_tab
    tab = _sran_tab
    
    i = self.i
    
    if (i < 0):
      i = abs(i)-1
    
    i = max(i, 1)
    
    i1 = int(max(i, 0) + self._seed)
    i2 = int(ceil(i/4 + self._seed))
    r1 = sqrt(tab[i1%len(tab)]*tab[i2%len(tab)])
    
    self.i += 1
    
    return r1

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
    r = floor(_keyrot_rnd.random()*24.0)
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
    r = floor(_keyrot_rnd.random()*24.0)
    limitcode = (limitcode + max_limit_code - r) % max_limit_code
    
    c = limit_code_rev[limitcode]
    s2 += c
  
  if len(key) > 0:
    s2 += key[len(key)-1]
  
  return s2

if __name__ == "__main__":
  s1 = key_rot("000000001.00000005")
  print(s1, key_unrot(s1))
