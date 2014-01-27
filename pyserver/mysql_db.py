from logger import elog, mlog, alog
import pymysql as mysql
import time, datetime, random, json
import os, sys, os.path, struct, traceback, gc, io, imp
from config import *
from utils import *

import sys
if not WITH_PY2:
  from urllib.parse import urlparse, parse_qs
else:
  from urlparse import urlparse, parse_qs

import pymysql.err

def get_qs(url):
  return parse_qs(urlparse(url)[4])

escape_map = {
  str : mysql.converters.escape_unicode,
  int : mysql.converters.escape_int,
  float : mysql.converters.escape_float,
  datetime.datetime : mysql.converters.escape_datetime,
  datetime.timedelta : mysql.converters.escape_timedelta,
  datetime.time : mysql.converters.escape_time,
  bool : mysql.converters.escape_bool,
  dict : mysql.converters.escape_dict
}
def estr(s):
  if type(s) in escape_map:
    func = escape_map[type(s)]
  else:
    s = str(s)
    func = mysql.converters.escape_string
    
  return str(func(s))

mysql_con_slots = [0, 0, 0, 0];
mysql_con_slot_cur = 0;

mysql_con = None

def mysql_execute(cur, con, estr):
  try:
    cur.execute(estr)
  except pymysql.err.Error:
    cur, con = mysql_reconnect()
    cur.execute(estr)
  
  return cur, con
  
def mysql_reconnect():
  global mysql_con
  
  print("reconnecting to mysql. . .");
  
  mysql_con = mysql.connect(cursorclass=\
    mysql.cursors.DictCursor, host=db_host,\
    user=db_user, passwd=db_passwd, db=db_db)
  
  return mysql_con.cursor(), mysql_con

def mysql_connect():
  #global mysql_con
  mysql_con_local = None
  
  #try to use only one connection
  if mysql_con_local == None: 
    try:
      mysql_con_local = mysql.connect(cursorclass=\
        mysql.cursors.DictCursor, host=db_host,\
        user=db_user, passwd=db_passwd, db=db_db)
    except pymysql.err.OperationalError:
      return None, None
      
  try:
    ret = mysql_con_local.cursor(), mysql_con_local
  except:
    elog("MySQL connection lost; attempting to re-connect. . .")
    mysql_con_local = mysql.connect(cursorclass=\
      mysql.cursors.DictCursor, host=db_host,\
      user=db_user, passwd=db_passwd, db=db_db)
    ret = mysql_con_local.cursor(), mysql_con_local
    
  return ret
  """
  global mysql_con_slot_cur
  global mysql_con_slots
  
  if mysql_con_slots[mysql_con_slot_cur] == 0:
    con = mysql.connect(cursorclass=mysql.cursors.DictCursor, host=db_host, user=db_user, \
     passwd=db_passwd, db=db_db)
    mysql_con_slots[mysql_con_slot_cur] = [con.cursor(), con]
  
  ret = mysql_con_slots[mysql_con_slot_cur]
  mysql_con_slot_cur = (mysql_con_slot_cur+1)%len(mysql_con_slots)
  
  return ret
  """
if __name__ == "__main__":
  #create_file(1, "yay", "bleh", 1);
  f = fetch_file(11)
  
  k = fileid_to_publicid(f["fileid"], f["userid"])
  
  print(f["userid"], f["fileid"])
  print(publicid_to_fileid(k))
  update_file(11, {"mimeType": "bleh", "custom_attr2": 3})
  
