import struct, random, sys, time
import math

def rint(max):
  return int(random.random()*max)

def pack_float_16(tst):
  sign = int(tst < 0.0)
  tst = math.fabs(tst)
  norm = math.floor(tst)
  
  if tst == 0: return 0, 0, 0, [0, 0]
  expo = int(math.floor(math.log(tst, 2.0)) if tst != 0.0 else 0.0)
    
  n = tst/2**expo - 1
  
  n2 = 1 if tst != 0.0 else 0
  i = 0
  while i < 10:
    n *= 2.0
    fi = math.floor(n)

    n2 += (1<<(10-i))*fi
    n = n - math.floor(n)
    i += 1
  
  mant = n2
  #mant = n2

  def single_and(a, b):
    #return a & (1<<b)
    n = math.floor(a/(2**(b)))
    
    ret = (2**b)*((n)%2)
    ret2 = a & (1<<b)
    
    if int(ret) != ret2:
      print("Eek!", ret, ret2, a, 1<<b, (a/(2**(b))))
    return ret

  bs = [0, 0]
  for i in range(8):
    bs[0] += single_and(mant, i)
    
  for i in range(10):
    bs[1] += single_and(mant>>8, i)
  
  if (expo >= (1<<5)): expo = (1<<5)
  
  bs[1] += (expo+15)<<3
  bs[1] += sign*128
  
  return 1*(not sign) + -1*sign, expo, mant, bytes

def f16_trunc(f1):
  s, e, m, b = pack_float_16(float(f1))
  f = 1
  for i in range(0, 11):
    f += 2**-i * (m&(1<<(11-i)) != 0)
  
  if (math.fabs(s*f*2**e-f1) == 2.0):
    print("Yeek!", f1, s*f*2**e)
  #print(math.fabs(s*f*2**e-f1))

  return s*f*2**e
  
#"""
class TruncMathClass:
  def __init__(self, n, ntype="f"):
    self.type = ntype
    
    if type(n) == type(self):
      self.f = float(n.f) if self.type == "f" else int(n.f)
    else:
      self.f = float(n) if self.type == "f" else int(n)
      self.pack()
    
  def pack(self):
    return
    if self.type == "f":
      self.f = f16_trunc(self.f) 
    elif self.type == "H":
      self.f = int(max(min(self.f, 65535), 0)) #struct.unpack(self.type, struct.pack(self.type, self.f))[0]
  
  def getb(self, b):
    if type(b) == type(self):
      return b.f
    else:
      return type(self)(b).f
  
  def __rpow__(self, a):
    return type(self)(a).__pow__(self)
  def __rmul__(self, a):
    return type(self)(a).__mul__(self)
  def __rdiv__(self, a):
    return type(self)(a).__div__(self)
  def __radd__(self, a):
    return type(self)(a).__add__(self)
  def __rsub__(self, a):
    return type(self)(a).__sub__(self)
  def __rgt__(self, a):
    return type(self)(a).__gt__(self)
  def __rlt__(self, a):
    return type(self)(a).__lt__(self)
  def __req__(self, a):
    return type(self)(a).__eq__(self)
  def __rtruediv__(self, a):
    return type(self)(a).__truediv__(self)
  def __rmod__(self, a):
    return type(self)(a).__mod__(self)
  def __rand__(self, a):
    return type(self)(a).__and__(self)
  def __rne__(self, a):
    return type(self)(a).__ne__(self)
  def __rrshift__(self, a):
    return type(self)(a).__rshift__(self)
  def __rlshift__(self, a):
    return type(self)(a).__lshift__(self)
  def __ror__(self, a):
    return type(self)(a).__or__(self)
  
  def __float__(self):
    return float(self.f)
    
  def __int__(self):
    return int(self.f)
  
  def __ne__(self, b):
    b = self.getb(b)
    return self.f != b
  
  def __lshift__(self, b):
    b = self.getb(b)
    return type(self)(int(self.f) << int(b))

  def __rshift__(self, b):
    b = self.getb(b)
    return type(self)(int(self.f) >> int(b))
  
  def __int__(self):
    return int(self.f)
    
  def __and__(self, b):
    b = self.getb(b)
    return type(self)(int(self.f) & int(b))

  def __or__(self, b):
    b = self.getb(b)
    return type(self)(int(self.f) | int(b))
  
  def __mod__(self, b):
    b = self.getb(b)
    return type(self)(self.f % b)

  def __truediv__(self, b):
    b = self.getb(b)
    return type(self)(self.f / b)
    
  def __mul__(self, b):
    b = self.getb(b)
    
    return type(self)(self.f * b)
  
  def __div__(self, b):
    b = self.getb(b)
    
    return type(self)(self.f / b)

  def __add__(self, b):
    b = self.getb(b)
    
    return type(self)(self.f + b)

  def __sub__(self, b):
    b = self.getb(b)
    
    return type(self)(self.f - b)

  def __ge__(self, b):
    b = self.getb(b)
    
    return self.f >= b

  def __gt__(self, b):
    b = self.getb(b)
    
    return self.f > b
    
  def __lt__(self, b):
    b = self.getb(b)
    
    return self.f < b
    
  def __le__(self, b):
    b = self.getb(b)
    
    return self.f <= b

  def __eq__(self, b):
    b = self.getb(b)
    
    return self.f == b
    
  def __pow__(self, b):
    b = self.getb(b)
    
    return type(self)(self.f**b)
  
  def __str__(self):
    return str(self.f)
  
  def __repr__(self):
    return str(self)

Float16 = TruncMathClass

def floor(f):
  return Float16(math.floor(Float16(f).f))
def ceil(f):
  return Float16(math.ceil(Float16(f).f))
def fabs(f):
  return Float16(math.fabs(Float16(f).f))
def abs(f):
  return Float16(math.fabs(Float16(f).f))
def log(f, c=math.e):
  return Float16(math.log(Float16(f).f, c))

class UInt16(TruncMathClass):
  def __init__(self, n):
    super(UInt16, self).__init__(n, ntype="H")
    
e = Float16(math.e)
"""
from math import e, floor, ceil, fabs, log
"""

tst =  25.112 #random.random()*200 #-random.random()*100000000000

bytes1 = struct.pack("f", tst)

tst = struct.unpack("f", bytes1)[0]

print("")
print(tst)
print("")

#2**(n-1)-1 = K
#log(k, 2) - 1 = n - 1
#log(k, 2) = n

sign = bytes1[3] & 128

expo0 = ((bytes1[3] & ~128)<<1) | (1 if (bytes1[2] & 128) else 0)
expo0 = expo0 - 127

mant = (bytes1[0] | bytes1[1]<<8 | (bytes1[2] & ~128)<<16) | (1 if expo0 != 0 else 0)

f = 1
for i in range(0, 23):
  f += 2**-i * (mant&(1<<(23-i)) != 0)

print("expo0:", expo0, " f:", f, f*(2**expo0)," mant:", mant)
print(f)
print(list(bytes1))
print("")


def pack_float_32(tst):
  sign = int(tst < 0.0)
  tst = math.fabs(tst)
  norm = math.floor(tst)
  
  try:
    expo = math.floor(math.log(tst, 2.0))
  except:
    expo = 0.0
    
  n = tst/2**expo - 1.0
  print(n)
  manto = float(n)

  expo += 127
  #16384
  bs = [0, 0, 0, 0]
  
  manto2 = manto*256
  manto = manto*256
  
  bs[2] = math.floor(manto*0.5) 
  bs[1] = math.floor(manto*128) - bs[2]*256
  bs[0] = 256.0*(manto*128 - bs[1] - bs[2]*256)
  
  bs[2] += (expo%2)*128
  bs[3] = expo*0.5
  bs[3] += sign*128

  bs = [int(b) for b in bs]

  return sign, expo, mant, bs

tst = 0.0
sign, exp, mant, bytes = pack_float_32(tst)
print(sign, exp, mant, list(bytes))
print(list(struct.pack("f", tst)))

#print("s", f16_trunc(0.3))

def int2_add(a1, b1, a2, b2):
  b3 = b1 + b2
  
  a3 = 0
  if a1 > a2 and 65535-a1 < a2:
      a3 = a2 - (65535-a1) - 1
      b3 += 1
  elif a2 > a1 and 65535-a2 < a1:
      a3 = a1 - (65535-a2) - 1
      b3 += 1
  else:
    a3 = a1 + a2
  
  return a3, b3

def split_int(i):
  return i&65535, (i>>16)&65535

i1 = (1<<15)-1
i2 = 3
a1, b1 = split_int(i1)
a2, b2 = split_int(i2)

"""
print((a1, b1))
print((a2, b2))
ret = int2_rshift(a1, b1, a2, b2)
print(ret)
i3 = int(ret[0]) | int((ret[1]<<16))

print(i1,  int(a1) | int((b1<<16)))
print("\n", "\r"+str(i3), i3-(int(i1)>>int(i2)), "\n")
#"""

int_max_minus_one = int((1<<25)-1)
int_max_half_m_n = int(((1<<25)/2)-1)

def i2_add(a, b):
  c = [0, 0]
  c[0] = a[0] + b[0]
  c[1] = a[1] + b[1]
  
  return c

def split_int(i):
  #form two's complement number
  if i >= int_max_half_m_n+1:
    i = int_max_half_m_n
  elif i < 0:
    i = int_max_minus_one+i+1
  
  return i&65535, (i>>16)&65535

int_max_split = split_int(int_max_minus_one)

def combine_int(i):
  i = i[0] | (i[1]<<16)

  if i >= int_max_half_m_n+1:
    i = -(int_max_minus_one-i+1)
  
  return i

def int_add(i1, i2):
  a1, b1 = i1
  a2, b2 = i2
  
  b3 = b1 + b2
  
  a3 = 0
  if a1 > a2 and 65535-a1 < a2:
      a3 = a2 - (65535-a1) - 1
      b3 += 1
  elif a2 > a1 and 65535-a2 < a1:
      a3 = a1 - (65535-a2) - 1
      b3 += 1
  else:
    a3 = a1 + a2
  
  return a3, b3

def int_negate(i1):
  i = [0, 0]
  
  print(int_max_split)
  
  i[0] = int_max_split[0] - i1[0]+1
  i[1] = int_max_split[1]*2 - i1[1]+1
  
  return i

def int_sub(i1, i2):
  return int_add(i1, int_negate(i2))
  
def int_rshift(i1, i2):
  a1, b1 = i1
  a2, b2 = i2

  if a2 <= 16:
    rem = (b1<<(16 - (a2%16))) & 65535
  else:
    rem = (b1>>(a2%16)) & 65535
  
  print("-----------", rem)
  a3 = ((a1>>a2) | rem) & 65535
  b3 = b1>>a2
  
  return int(a3), int(b3)

def int_lshift(i1, i2):
  a1, b1 = i1
  a2, b2 = i2
  
  if a2 <= 16:
    rem = a1>>(16-a2) & 65535#>>(a2)
  else:
    rem = a1<<(a2%16) & 65535
  
  print("--------", rem)
  a3 = (a1<<a2) & 65535
  b3 = ((b1<<a2) | rem) & 65535
  
  return int(a3), int(b3)

def int_mul(i1, i2):
  i = [0, 0]
  
  n = i1[0]*i2[0] + 65536*i1[0]*i2[1] + 65536*i2[0]*i1[1] + 4294967296*i1[1]*i2[1]
 
  b1 = floor(log(i1[0]) / log(2))
  b2 = floor(log(i2[0]) / log(2))
  
  print(b1 + b2)
  
  n2 = i1[0]*i2[0]
  if n2 > 65535:
    i[0] = int(math.fmod(n2, 65536))
    i[1] = int(n2)>>16
  
  print("-", n)
  
  i[0] = int(math.fabs(i[0]))
  i[1] = int(math.fabs(i[1]))
  return i

a = 642
b = 642
i1 = split_int(a)
i2 = split_int(b)

i3 = int_mul(i1, i2) #int_lshift(i1, i2)

print(i1, i2, i3, split_int(a*b))
print(combine_int(i1), combine_int(i2), combine_int(i3), a*b)

m_off = 1.0
class emulated_float(object):
  def __init__(self, n):
    self.div2 = 1.0
    
    if type(n) == emulated_float:
      self.mant = Float16(n.mant)
      self.sign = Float16(n.sign)
      self.exp = Float16(n.exp)
    else:
      if float(n) != 0.0:
        n = float(n)**-1.0

      self.sign = -1.0 if n < 0.0 else 1.0
      
      if n != 0:
        exp = (math.log(math.fabs(n), 2))
        exp = math.floor(exp)
        #exp = exp*0.3 + math.floor(exp)*(1-0.3)
        
        self.exp = Float16(exp)
      else:
        exp = 0
        self.exp = 0
      
      pw = 2.0**exp
      
      mant = math.fabs(float(n*self.div2)/float(pw))
      
      dif = self.exp - floor(self.exp)
      
      self.mant = Float16(mant-m_off)
      
    self.sign = Float16(self.sign)
    self.exp = Float16(self.exp)
    self.norm()
    
  def __float__(self):
    r1 = float(self.sign)*(float(self.mant)+m_off)*2**float(self.exp)
    #r1 = r1*(2 if self.div2 == 0.5 else 1)
    if r1 != 0.0: r1 **= -1
    return r1
  
  def copy(self):
    f = emulated_float(0.0)
    f.exp = self.exp
    f.sign = self.sign
    f.mant = self.mant
    return f
  
  def __lt__(self, b):
    b = emulated_float(b)
    
    if self.sign != b.sign:
      return self.sign < 0;
      
    ret = 0
    if self.exp != b.exp:
      if (self.exp < 0 and b.exp < 0):
        return self.exp > b.exp
      return self.exp < b.exp
    else:
      return self.mant-b.mant < -0.00001
      
  def __gt__(self, b):
    b = emulated_float(b)
    
    if self.sign != b.sign:
      return self.sign > 0;
      
    ret = 0
    if self.exp != b.exp:
      if (self.exp < 0 and b.exp < 0):
        return self.exp < b.exp
      return self.exp > b.exp
    else:
      return self.mant-b.mant > 0.00001
      
  def __sub__(self, b):
    b = emulated_float(b)
    b = b.copy()
    b.sign *= -1
    return self + b
  
  def is_zero(self):
    return float(self.mant+m_off) == 0.0
    
  def __add__(self, b):
    b = emulated_float(b)
    
    if self.is_zero():
      return emulated_float(b)
    elif b.is_zero():
      return self
    
    #ret1 = emulated_float(1.0) / self
    #ret2 = emulated_float(1.0) / b
    
    #ret3 =  emulated_float(1.0) / ret1.simple_add(ret2)
    #return ret3

    #return self.simple_add(b).__truediv__(self.__mul__(b))
    return self.__mul__(b).__truediv__(self.simple_add(b))
    
  def simple_add(self, b):
    b = emulated_float(b)
    f = emulated_float(0)
    
    if self.exp > b.exp:
      f1 = self; f2 = b
    else:
      f2 = self; f1 = b
    
    div = float(1<<int(float(f1.exp)-float(f2.exp)))
    #print("d", div)
    f.exp = Float16(f2.exp)
    #print("d", div)
    #print(f.mant)
    #print(f1.sign, f2.sign)
    f.mant = (m_off+f2.mant)*f2.sign + ((m_off+f1.mant)*div)*f1.sign - m_off
    #print("mant", f.mant, f.exp)
    
    if (f.mant < 0.0):
      f.sign = -1
      f.mant = fabs(f.mant + m_off) - m_off
    else:
      f.sign = -1 if (f1.sign < 0 and f2.sign < 0) else 1
    
    #"""
    #print("mant", f.mant, f.exp)
    
    f.norm()
    #print("mant", f.mant, f.exp)

    return f
  
  def norm(self):
    if self.mant >= m_off:
      self.mant += m_off
      
      n = floor(log(self.mant, 2.0))
      self.mant *= 1.0/(2**float(n))
      self.exp += n
      
      self.mant -= m_off
    elif self.mant < 0.0 and self.mant+m_off > 0.0:
      self.mant += m_off
      while self.mant < 1.0:
        self.mant *= 2.0
        self.exp -= 1
      self.mant -= m_off
      
  def __mul__(self, b):
    b = emulated_float(b)
    f = emulated_float(0)
    
    f.sign = self.sign*b.sign
    f.exp = b.exp+self.exp
    
    f.mant = (self.mant+m_off)*(b.mant+m_off) - m_off
    f.norm()
    
    return f  
    
  def __truediv__(self, b):
    b = emulated_float(b)
    f = emulated_float(0)
    
    f.sign = self.sign*b.sign
    f.exp = self.exp-b.exp
    
    if m_off+b.mant != 0:
      f.mant = (m_off+self.mant)/(m_off+b.mant) - m_off
      
    f.norm()
    return f
  
  def __str__(self):
    return str(self.__float__()) # + " " + str(self.sign)+"*"+str(self.mant)+"*2**" + str(self.exp)

ef = emulated_float
a = 0.659794
b = 0.666667
af = emulated_float(a)
bf = emulated_float(b)

af.exp = 5.0
af.mant = -0.95263671875
bf.exp = 7.0
bf.mant = -0.98828125

af.norm()
bf.norm()
f = af + bf

zero = ef(0.0)
f = ef(0.55) / ef(2.55)

print("\n")
print("ef:", f, f.exp, f.mant)


class math_funcs:
  def floor(self, f):
    #floating points numbers work by multiplying a power of 2 with
    #an offset (mantissa).  to find the floor of a number, one has to 
    #divide the offset by the recipricol of the power of two, floor that
    #(which we can do since we're using 16-bit float mantissas) then 
    #multiply it again.  things are complicated further still by the fact 
    #that our floats are actually reciprocals, so that precision is cantered
    #around 0.0, not the outer edges of the numeric range.
    
    f3 = emulated_float(1.0) / emulated_float(f)
    e1 = 1.0 / 2.0**(f3.exp)
    m2 = (m_off+f3.mant)/e1
    m2 = floor(m2)*e1
    
    f3exp = f3.exp
    f3.mant = m2 - m_off
    
    f3 = emulated_float(1.0) / f3
    
    if 0: #(f3-f) > ef(0.5): # > f:
      f3 = emulated_float(1.0) / emulated_float(f)
      e1 = 1.0 / 2.0**(f3.exp)
      m2 = (m_off+f3.mant)/e1
      m2 = (floor(m2)-1)*e1
      
      f3exp = f3.exp
      f3.mant = m2 - m_off
      
      f3 = emulated_float(1.0) / f3    
    return f3
  
  def log(self, f):
    f = emulated_float(f)
    steps = 5
    oldf = f
    
    x = -1*(f.exp+1)*math.log(2)
    y = f / ef(self.exp(float(x))) #self.exp(x)
    #print("x", x)
      
    #print("\n---", y, math.exp(x), self.exp(x), "\n")
    
    sum = emulated_float(0.0)
    f = (y-1)/(y+1)
    f2 = f
    
    d = emulated_float(0.0)
    c = emulated_float(0.0)    
    for i in range(0, steps):
      y = f2/(d*2+1.0) - c
      
      t = sum + y
      c = (t - sum) - y
      
      sum = t
      d += 1
      f2 = f2*f*f
      
      #print(sum*2+x, x, oldf, ef(math.exp(float(ef(x)+sum*2))))
     
    return sum*2.0+x
  
  def fabs(self, a):
    a = emulated_float(a)
    a.sign = 1;
    return a
    
  def sqrt(self, a):
    if (a > 2.0 or a < -2.0):
      r = a / 4
    else:
      r = a * 4
    
    steps = 9
    for i in range(steps):
      r = (a/r + r)*emulated_float(0.5)
    return r
  
  def exp(self, a):
    r = ef(2)

    r.exp = float(a)/log(2)
    ex2 = r.exp - math.floor(float(r.exp))

    r.exp = math.floor(r.exp)
    r.mant = float(self._exp1(ex2*log(2)) - 1.0)
    
    r.norm()
    r = ef(1.0) / r
    
    return r
    
  def _exp1(self, a):
    #print(a)
    steps = 8
    a = emulated_float(a)
    
    sum = emulated_float(a)
    a2 = a*a
    
    fact = emulated_float(2.0)
    c = 0
    for i in range(3, steps):
      y = a2/fact + c;
      t = sum + y
      c = (t - sum) - y
      sum = t
      
      fact *= emulated_float(i)
      a2 *= a
    return sum+1
    
  def pow(self, a, b):
    a = emulated_float(a)
    f = self.exp(self.log(a)*emulated_float(b))
    return f
    
  """
  def ceil(self, f):
    pass
    
  def exp(self, f):
    pass
  def sin(self, f):
    pass
  def cos(self, f):
    pass
  def tan(self, f):
    pass
  def asin(self, f):
    pass
  def acos(self, f):
    pass
  def atan(self, f):
    pass
  """

mf = math_funcs()

def test_mathfuncs(mf):
  funcs = []
  for d in dir(mf):
    if not d.startswith("_"):
      funcs.append([d, getattr(mf, d)])
 
  for f in funcs:
    if f[0].startswith("_"): continue
    
    print("Testing function %s..." % f[0])
    for i in range(6):
      rf = float((1<<4)*0.5 + 0.5*random.random()*(1<<4)) #**100
      rf2 = float((1<<4)*0.5 + 0.5*random.random()*(1<<4)) #**100

      if f[0] in ["pow", "exp"]:
        rf /= 4;
        rf2 /= 4;
      
      if f[0] in ["pow"]:
        r1 = f[1](emulated_float(rf), emulated_float(rf2))
        r2 = getattr(math, f[0])(rf, rf2)
      else:
        r1 = f[1](emulated_float(rf))
        r2 = getattr(math, f[0])(rf)
      
      if (fabs(float(r1) - float(r2)) > 0.0001):
        print("\n  ", rf)
        print("  ", (float(r1) - float(r2)))
        print("   ", float(r1), float(r2))
        
  print("")

random.seed(0)  
#test_mathfuncs(mf)
math_consts = {
  "log_of_2": math.log(2),
  "log_of_10": math.log(10),
  "sqrt_of_2": math.sqrt(2),
  "pi": math.pi,
  "e": math.e,
}

keys = list(math_consts.keys())
keys.sort()
for k in keys:
  tst = ef(1.0) / ef(math_consts[k])
  print("f32 f32_%s = f32(%.8f, %.8f, 1.0);" % (k, tst.exp, tst.mant))
  print("f32 f32_1_%s = f32(%.8f, %.8f, 1.0);" % (k, tst.exp, tst.mant))
  print("float16 f16_%s = %.8f;" % (k, math_consts[k]))
  print("float16 f16_1_%s = %.8f;" % (k, pow(math_consts[k], -1)))
 
  
#print(mf.log(ef(tst)), math.log(tst))

"""
  def prelog(self, f):
    f = emulated_float(f)
    
    return -1*(f.exp+1)*math.log(2)
    
    print(f.exp, "sdfds")
    
    if (f.exp < 0 and f > 3.0):
      m = f.exp
    else:
      m = f.exp+4
    
    m2 = emulated_float(2.0**(2.0-m)) #2 if f > 1.0 else 1024)
    m = emulated_float(m)
    
    s = m2/f
    
    a = (emulated_float(1.0)+s)*emulated_float(0.5)
    g = emulated_float(self.sqrt(s))

    for i in range(2):
      a2 = emulated_float(0.5)*(g + a)
      g2 = (self.sqrt(a*g))
      #print(a.exp, a.mant, g.exp, g.mant)
      
      #if (self.fabs(g2 - g) < 0.001):
      #  print("Breaking", self.fabs(g2 - g))
      #  break
      a = a2
      g = g2
    
    ag_mean = g
    
    a =  emulated_float(3.141592653589793) / float(emulated_float(2.0)*ag_mean) - float(m*emulated_float(0.6931471805599453))
    try:
      a2 = 3.141592653589793 / (2*float(ag_mean)) - float(m)*0.6931471805599453
    except ZeroDivisionError:
      a2 = 0.0
    
    #if (a < emulated_float(math.e)):
    #  a *= -1
      
    return a
#|            |
#v unfinished v
class emulated_float_with_32bitint_mantissa(object):
  def __init__(self, n):
    if type(n) == emulated_float:
      self.exp = UInt16(n.exp)
      self.sign = n.sign
      self.mant = UInt16(n.mant)
      self.mant1 = UInt16(n.mant1)
      self.mant2 = UInt16(n.mant2)
    else:
      self.sign = -1.0 if n < 0.0 else 1.0
      
      n = math.fabs(n)
      if n != 0:
        self.exp = UInt16(math.floor(math.log(math.fabs(n), 2)))
      else:
        self.exp = 0
      
      pw = 2**float(self.exp)
      self.mant = int((float(n)/float(pw) - 1.0)*float((1<<32)-1))
      
      self.mant1 = UInt16(self.mant & 65535)
      self.mant2 = UInt16((self.mant>>16) & 65535)
      
    self.sign = Float16(self.sign)
    self.exp = UInt16(self.exp)
    self.norm()
    
  def __float__(self):
    mant = int(self.mant1) | (int(self.mant2)<<16)
    mant = float(mant) / ((1<<32)-1)
    return float(self.sign)*((mant + 1.0)*2**float(self.exp))
  
  def copy(self):
    f = emulated_float(0.0)
    f.exp = self.exp
    f.sign = self.sign
    f.mant = self.mant
    return f
  
  def __lt__(self, b):
    b = emulated_float(b)
    
    ret = 0
    if self.exp != b.exp:
      return self.exp < b.exp
    else:
      return self.mant < b.mant
      
  def __sub__(self, b):
    b = emulated_float(b)
    b = b.copy()
    b.sign *= -1
    return self + b
  
  def __add__(self, b):
    #b = emulated_float(b)
    f = emulated_float(0)
    
    if self.exp > b.exp:
      f1 = self; f2 = b
    else:
      f2 = self; f1 = b
    
    f.mant1 = f2.mant1; f.mant2 = f2.mant2
    f.mant1, f.mant2 = int2_rshift(f.mant1, f.mant2, f1.exp-f2.exp, 0);
    f.exp = f1.exp
    
    print(f.mant1, f.mant2, "----------")
    
    if f1.sign == f2.sign:
      f.mant1, f.mant2 = int2_add(f.mant1, f.mant2, f1.mant1, f1.mant2)
    elif f1.sign == 1 and f2.sign == -1:
      f.mant1, f.mant2 = int2_sub(f.mant1, f.mant2, f1.mant1, f1.mant2)
    else:
      f.mant1, f.mant2 = int2_sub(f1.mant1, f1.mant2, f.mant1, f.mant2)

    print(f.mant1, f.mant2, "----------")
    
    #f.mant = UInt16(f.mant)
    return f
  
  def norm(self):
    return
    if self.mant > 1.0 or self.mant < 0.0:
      n = floor(log(self.mant, 2.0))
      self.mant *= 2**(n*-1)
      self.exp += n
  
  def __mul__(self, b):
    b = emulated_float(b)
    f = emulated_float(0)
    
    f.sign = self.sign*b.sign
    f.exp = b.exp+self.exp
    f.mant = self.mant*b.mant

    if f.mant > 1.0 or f.mant < 0.0:
      n = floor(log(f.mant, 2.0))
      f.mant *= 2**(n*-1)
      f.exp += n
    
    return f
  
  def __truediv__(self, b):
    b = emulated_float(b)
    f = emulated_float(0)
    
    f.sign = self.sign*b.sign
    f.exp = self.exp-b.exp
    f.mant = self.mant/b.mant
    
    if f.mant > 1.0 or f.mant < 0.0:
      n = floor(log(f.mant, 2.0))
      f.mant *= 2**(n*-1)
      f.exp += n
      
    return f
  
  def __str__(self):
    return str(self.__float__()) # + " " + str(self.sign)+"*"+str(self.mant)+"*2**" + str(self.exp)
    

class emulated_float(object):
  def __init__(self, n):
    if type(n) == emulated_float:
      self.mant = Float16(n.mant)
      self.sign = n.sign
      self.exp = Float16(n.exp)
    else:
      self.sign = -1.0 if n < 0.0 else 1.0
      
      n = math.fabs(n)
      if n != 0:
        self.exp = Float16(math.floor(math.log(math.fabs(n), 2)))
      else:
        self.exp = 0
      
      pw = 2.0**float(self.exp)
      self.mant = fabs(Float16(float(n)/float(pw) - 1.0))
      
    self.sign = Float16(self.sign)
    self.exp = Float16(self.exp)
    self.norm()
    
  def __float__(self):
    return float(self.sign)*((float(self.mant) + 1.0)*2**float(self.exp))
  
  def copy(self):
    f = emulated_float(0.0)
    f.exp = self.exp
    f.sign = self.sign
    f.mant = self.mant
    return f
  
  def __lt__(self, b):
    b = emulated_float(b)
    
    ret = 0
    if self.exp != b.exp:
      return self.exp < b.exp
    else:
      return self.mant < b.mant
      
  def __sub__(self, b):
    b = emulated_float(b)
    b = b.copy()
    b.sign *= -1
    return self + b
  
  def __add__(self, b):
    #b = emulated_float(b)
    f = emulated_float(0)
    
    if self.exp > b.exp:
      f1 = self; f2 = b
    else:
      f2 = self; f1 = b
    
    div = 2**(float(f1.exp)-float(f2.exp))
    
    f.exp = f2.exp
    
    f.mant = (1+f2.mant)*f2.sign + ((1+f1.mant)*div)*f1.sign - f1.sign
    f.sign = f1.sign
    
    if f.mant < 0.0:
      f.sign = -1
      f.mant *= -1
    else:
      f.sign = f1.sign
    
    f.norm()
    
    return f
  
  def norm(self):
    if self.mant >= 1.0:
      self.mant += 1
      
      n = floor(log(self.mant, 2.0))
      self.mant *= 1.0/(2**float(n))
      self.exp += n
      
      self.mant -= 1
  
  def __mul__(self, b):
    b = emulated_float(b)
    f = emulated_float(0)
    
    f.sign = self.sign*b.sign
    f.exp = b.exp+self.exp
    
    f.mant = b.mant + self.mant + self.mant*b.mant

    #f.norm()
    
    return f
  
  def __truediv__(self, b):
    b = emulated_float(b)
    f = emulated_float(0)
    
    f.sign = self.sign*b.sign
    f.exp = self.exp-b.exp
    if 1+b.mant != 0:
      f.mant = (1+self.mant)/(1+b.mant) - 1
      
    f.norm()
    return f
  
  def __str__(self):
    return str(self.__float__()) # + " " + str(self.sign)+"*"+str(self.mant)+"*2**" + str(self.exp)
    
"""
"""
def t_log(x):
  m = 1 if x > 1.0 else 40
  s = 4/(x*2.0**m)

  a = (1+s)/2
  g = math.sqrt(s)
  
  for i in range(4):
    a2 = 0.5*(a + g)
    g2 = (a*g)**0.5
    a = a2
    g = g2
  
  ag_mean = a
  
  a =  math.pi / (2*ag_mean) - m*math.log(2)
  return math.fabs(a)

def b16_log(x):
  if x == 0: return 0
  
  m = 1
  s = 4/(x*2.0**m)
  
  a = (1+s)/2
  g = math.sqrt(s)
  
  for i in range(6):
    a2 = 0.5*(a + g)
    g2 = (a*g)**0.5
    a = a2
    g = g2
  
  ag_mean = a

  a =  math.pi / (2*ag_mean) - m*math.log(2)
  return math.fabs(a) / math.log(2)
  
input = Float16(1)
print(b16_log(input), math.log(input) / math.log(2))
"""
def ag_mean(i1, i2):
  a = (i1+i2)/2
  g = math.sqrt(i1*i2)
  
  for i in range(8):
    a2 = 0.5*(a + g)
    g2 = (a*g)**0.5
    a = a2
    g = g2
    
  return a2