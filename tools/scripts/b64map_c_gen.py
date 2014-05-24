import os, sys, time, random, struct, os.path

s = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
if len(sys.argv) > 1:
  s = sys.argv[1]
  print("Using encoding map:\n  '%s'" % s)
else:
  print("Using MIME standard encoding")
  
map = [0 for x in range(255)];

for i, c in enumerate(s):
  map[ord(c)] = i

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
  