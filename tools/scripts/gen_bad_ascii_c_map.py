import os, sys, os.path

if len(sys.argv) > 1:
  badchar = sys.argv[1]
else:
  badchar = "_"

s = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
s += "-=/\\\"';:><.,|`~!@#$%^&*()_+1234567890-="

s = set(s)

map = [ord(badchar) for x in range(255)];

for i, c in enumerate(s):
  map[ord(c)] = ord(c)

colimit = 60

s2 = "char _b64map[255] = {\n  "
ci = 0

for i in range(255):
  s3 = ""
  if i > 0: s3 += ","
  
  if ci >= colimit:
    s3 += "\n  "
    ci = 0
    
  s3 += "%2d" % (map[i])
  
  
  s2 += s3
  ci += len(s3)

s2 += "\n};\n"
print(s2);
  