import config;

mod = None
if config.serv_local:
  import fileapi_local as mod
else:
  import fileapi_db as mod

g = globals()
for k in dir(mod):
  if k[0] == "_": continue
  g[k] = getattr(mod, k)

