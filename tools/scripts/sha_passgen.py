import sys, hashlib, base64

if len(sys.argv) < 2:
  sys.stderr.write("usage: sha_passgen.py password")
  sys.exit(-1)
  
pas = sys.argv[1]

hash = hashlib.sha1()
hash.update(bytes(pas, "latin-1"))
hash = hash.digest()

ret = b"{SHA}"+base64.b64encode(hash)
print(ret)