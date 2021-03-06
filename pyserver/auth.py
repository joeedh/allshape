from logger import elog, mlog, alog
from db_engine import mysql_connect, mysql_reconnect, get_qs, \
                     estr, valid_pass, SQLParamError, sql_selectall, \
                     sql_insertinto, do_param_error, sq
import random, time, json
from utils import *
from math import *
import datetime
from config import json_mimetype, WITH_PY2
from db_engine import *
import db_engine

permissions = {"MODELER" : 1, "DRIVE_READ": 2, "DRIVE_WRITE": 4}
default_permission = permissions["MODELER"] | permissions["DRIVE_READ"] | permissions["DRIVE_WRITE"]

#r: refresh, a: access, u: upload
toktypes = {"R" : 1, "A": 2, "U" : 3} 

def rot_userid(userid):
  userid = str(userid)
  max_cols = 16-len(str(userid))
  for i in range(max_cols):
    userid = "0" + userid
    
  return key_rot(userid)

def unrot_userid(userid):
  userid = int(key_unrot(userid))
  return userid

def gen_token(toktype, userid):
  if toktype not in toktypes:
    raise RuntimeError("Invalid token type " + str(toktype))
    
  random.seed(time.time()*2.0*random.random())
  s = ""
  for i in range(32):
    code = int(random.random()*max_limit_code*0.99999)
    s += limit_code_rev[code]
  
  """
  s += "."
  us = hex(userid).replace("0x", "")
  for i in range(16-len(us)):
    us = "0" + us
  #"""
  
  s = toktype+"."+s
    
  return key_rot(s)

OAUTH_SCOPES = set(["username", "email", "name_last", "name_first", "drive"])
class AuthAPI_OAuthStart:
  basepath = "/api/auth/oauth"
  redirect_uri = 0
  valid_clients = {"allshape-wordpress": "werghow34"}
  
  def do_GET(self, serv):
    global OAUTH_SCOPES
    
    qs = get_qs(serv.path)
    qs2 = {}
    for k in qs:
      if type(qs[k]) in [list, tuple] and len(qs[k]) == 1:
        qs2[k] = qs[k][0]
      else:
        qs2[k] = qs[k]
    qs = qs2
    
    if "response_type" not in qs or "client_id" not in qs:
      alog("Invaild oauth request 1")
      serv.send_error(400)
      return
    
    if qs["response_type"] != "code":
      alog("Invaild oauth request 2")
      serv.send_error(400)
      return
      
    if "redirect_uri" in qs:
      self.redirect_uri = qs["redirect_uri"]
    
    scope = ""
    if "scope" in qs:
      scope = qs["scope"]
    
    state = None
    if "state" in qs:
      state = qs["state"]
      
    restype = qs["response_type"]
    clientid = qs["client_id"]
    
    if clientid not in self.valid_clients:
      alog("Invaild client id in oauth request")
      serv.send_error(401)
      return
    
    body = "<html><body>login</body></html>"
    body = bstr(body)
    
    serv.gen_headers("GET", len(body), "text/html")
    serv.wfile.write(body)

class AuthAPI_RefreshToken_WPHack:
  basepath = "/api/wpauthhack"
  
  def do_GET(self, serv):
    qs = get_qs(serv.path)
    if not ("user" in qs and "password" in qs):
      serv.send_error(400)
      return
    
    user = qs["user"][0]
    password = qs["password"][0]
    #HACK: wsgi is turning +'s into spaces? how odd
    password = password.replace(" ", "+")
    
    if not password.startswith("{SHA}"):
      password = "{SHA}" + password
    
    cur, con = mysql_connect()
    try:
      qstr = sql_selectall("users", ["username"], [user], [sq.user])
    except SQLParamError:
      alog("possible sql injection: \"" + user + "\"")
      serv.send_error(401)
      return
    
    cur.execute(qstr);
    ret = cur.fetchone()
    if ret == None:
      serv.send_error(401)
      return
    
    alog("Fetching refresh token for user %s. . ." % user)
		
    if ret["password"] != password:
      alog("Invalid password for |%s|, %s" % (user, password))
      serv.send_error(401)
      return
    
    userid = ret["userid"]
    tok = gen_token("R", userid)
    exprtime = datetime.datetime.now() + datetime.timedelta(days=12)
    
    alog("Refresh token for %s: %s" % (user, tok))
		
    cols   = ["tokenid", "userid", "type",       "permissions",      "expiration"]
    values = [tok,        userid,  toktypes["R"], default_permission, exprtime]
    types  = [sq.token,   sq.int,  sq.int,        sq.int,             sq.datetime]

    try:
      qstr = sql_insertinto("authtokens", cols, values, types)
    except SQLParamError:
      do_param_error("cols: " + str(cols) + ", values:" + str(values))
      serv.send_error(401)
      return
      
    """
    qstr = "INSERT INTO authtokens (tokenid,userid,type,permissions,expiration) VALUES("
    
    qstr += estr(tok)+","+estr(userid)+","
    qstr += estr(toktypes["R"])+","+estr(default_permission)+","
    qstr += estr(exprtime)+")"
    #"""
    
    cur.execute(qstr)
    con.commit()
    
    body = json.dumps({"refresh_token": str(tok), "result": 1})
    body = bstr(body)
    
    #serv.gen_headers("GET", len(body), json_mimetype)
    serv.wfile.write(body)
       
class AuthAPI_RefreshToken:
  basepath = "/api/auth"
  
  def do_GET(self, serv):
    qs = get_qs(serv.path)
    if not ("user" in qs and "password" in qs):
      serv.send_error(400)
      return
    
    user = qs["user"][0]
    password = qs["password"][0]
    #HACK: wsgi is turning +'s into spaces? how odd
    password = password.replace(" ", "+")
    
    if not valid_pass(password):
      alog("invalid pass format %s" % password)
      serv.send_error(401)
      return
      
    cur, con = mysql_connect()
    try:
      qstr = sql_selectall("users", ["username"], [user], [sq.user])
    except SQLParamError:
      do_param_error(user)
      serv.send_error(401)
      return
      
    cur.execute(qstr)
    ret = cur.fetchone()
    
    if ret == None:
      alog("invalid user %s" % user)
      serv.send_error(401)
      return
    
    alog("Fetching refresh token for user %s. . ." % user)
    
    passwd = ret["password"]
    userid = ret["userid"]
      
    if passwd != password:
      alog("Invalid password for %s, got: '%s', pass: '%s'" % (user, password, ret["password"]))
      serv.send_error(401)
      return
    
    tok = gen_token("R", userid)
    exprtime = datetime.datetime.now() + datetime.timedelta(days=12)
    
    alog("Refresh token for %s: %s" % (user, tok))
		
    cols   = ["tokenid", "userid", "type",       "permissions",      "expiration"]
    values = [tok,        userid,  toktypes["R"], default_permission, exprtime]
    types  = [sq.token,   sq.int,  sq.int,        sq.int,             sq.datetime]

    try:
      qstr = sql_insertinto("authtokens", cols, values, types)
    except SQLParamError:
      do_param_error("cols: " + str(cols) + ", values:" + str(values))
      serv.send_error(401)
      return
      
    """
    qstr = "INSERT INTO authtokens (tokenid,userid,type,permissions,expiration) VALUES("
    
    qstr += estr(tok)+","+estr(userid)+","
    qstr += estr(toktypes["R"])+","+estr(default_permission)+","
    qstr += estr(exprtime)+")"
    """
    
    cur.execute(qstr)
    con.commit()
    
    body = json.dumps({"refresh_token": str(tok), "result": 1})
    body = bstr(body)
    
    serv.gen_headers("GET", len(body), json_mimetype)    
    serv.wfile.write(body)

class AuthAPI_SessionToken:
  basepath = "/api/auth/session"
  
  def do_GET(self, serv):
    qs = get_qs(serv.path)
    if "refreshToken" not in qs:
      serv.send_error(400)
      return
    
    token = qs["refreshToken"][0]
    
    cur, con = mysql_connect()
    cur.execute("SELECT * FROM authtokens WHERE tokenid="+estr(token))
    
    ret = cur.fetchone()
    if ret == None:
      serv.send_error(401)
      return
    
    exprtime1 = ensure_datetime(ret["expiration"])
    
    if exprtime1 < datetime.datetime.now():
      alog("Expired token %s" % (token))
      serv.send_error(408)
      return
    
    userid = ret["userid"]
    tok = gen_token("A", userid)
    exprtime = datetime.datetime.now() + datetime.timedelta(hours=2)
		
    alog("Generated session token %s for user %s" % (tok, str(userid)))
    
    cols   = ["tokenid", "userid", "type",       "permissions",      "expiration"]
    values = [tok,        userid,  toktypes["A"], default_permission, exprtime]
    types  = [sq.token,   sq.int,  sq.int,        sq.int,             sq.datetime]

    try:
      qstr = sql_insertinto("authtokens", cols, values, types)
    except SQLParamError:
      do_param_error("cols: " + str(cols) + ", values:" + str(values))
      serv.send_error(401)
      return

    cur.execute(qstr)
    con.commit()
    
    body = json.dumps({"access_token": str(tok)})
    body = bstr(body)
    
    serv.gen_headers("GET", len(body), json_mimetype)
    serv.wfile.write(body)

class AuthAPI_GetUserInfo:
  basepath = "/api/auth/userinfo"
  
  def do_GET(self, serv):
    qs = get_qs(serv.path)
    
    #print("userinfo!")
    
    cur, con = mysql_connect()
    
    if "accessToken" not in qs:
      elog("access token wasn't provided")
      serv.send_error(400)
      return
    
    token = qs["accessToken"][0]
    
    userid = do_auth(token)
    
    if (userid == None):
      elog("invalid access")
      serv.send_error(401)
      return
    
    cur.execute("SELECT * FROM users WHERE userid="+estr(userid));
    ret = cur.fetchone();    
    
    body = json.dumps({"username": ret["username"],
                       "userid": rot_userid(ret["userid"]),
                       "name_last": ret["name_last"],
                       "name_first": ret["name_first"],
                       "email": ret["email"],
                       "permissions": ret["permissions"],
                       "last_login": str(ret["last_login"])})
    
    body = bstr(body)
    
    serv.gen_headers("GET", len(body), json_mimetype)    
    serv.wfile.write(body) 
    
def do_auth(tok):
  cur, con = mysql_connect()
  try:
    cur.execute("SELECT * FROM authtokens WHERE tokenid="+estr(tok))
  except db_engine.DBError:
    cur, con = mysql_reconnect()
    cur.execute("SELECT * FROM authtokens WHERE tokenid="+estr(tok))
    
  ret = cur.fetchone()
  if ret == None: 
    elog("nonexistent access token " + str(tok));
    return None
      
  if ret["type"] != toktypes["A"]:
    elog("invalid access token " + str(tok))
    return None
    
  exprtime1 = ensure_datetime(ret["expiration"])
  if exprtime1 < datetime.datetime.now():
    elog("expired access token " + str(tok))
    return None
      
  return ret["userid"]
