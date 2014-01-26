SERVER_VERSION = 0.01;
if (String.startsWith==undefined) {
  String.prototype.startsWith = function(str) {
   if (str.length>this.length)
    return false;
   for (var i=0; i<str.length; i++) {
     if (this[i]!=str[i])
      return false;
   }
   return true;
  }
}
if (String.contains==undefined) {
  String.prototype.contains = function(str) {
   if (str.length>this.length)
    return false;
   for (var i=0; i<this.length-str.length+1; i++) {
     var found=true;
     for (var j=0; j<str.length; j++) {
       if (this[i+j]!=str[j]) {
         found = false;
         break;
       }
     }
     if (found)
      return true;
   }
   return false;
  }
}
String.prototype.find = function(str) {
 if (str.length>this.length)
  return false;
 for (var i=0; i<this.length-str.length+1; i++) {
   var found=true;
   for (var j=0; j<str.length; j++) {
     if (this[i+j]!=str[j]) {
       found = false;
       break;
     }
   }
   if (found)
    return i;
 }
 return -1;
}
function is_str(str) {
 return typeof str=="string"||typeof str=="String";
}
function get_type_name(obj) {
 if (obj==undefined)
  return "undefined";
 var c;
 try {
  var c=obj.toSource();
 }
 catch (Error) {
   c = "";
 }
 if (obj.toString().startsWith("[object ")) {
   var c2=obj.toString().replace("[object ", "").replace("]", "");
   if (c2!="Object"&&c2!="Array") {
     return c2;
   }
 }
 if (c.contains(">")&&c.contains("<")&&!c.contains(" ")&&!c.contains(",")&&!c.contains(".")) {
   c = c.replace(">", "").replace("<", "");
   if (c!="Object"&&c!="Array") {
     return c;
   }
 }
 if (obj.constructor.name!=undefined&&obj.constructor.name!="")
  return obj.constructor.name;
 if (obj.constructor==MouseEvent)
  return "MouseEvent";
 if (obj.constructor==KeyEvent)
  return "KeyEvent";
 if (obj.constructor==KeyboardEvent)
  return "KeyboardEvent";
 return "(unknown)";
}
log_cache = {}
slog_queue = [];
flush_queue = false;
last_queue_time = 0;
function server_log(msg) {
 if (msg!=undefined) {
   if (log_cache.hasOwnProperty(msg))
    return;
   log_cache[msg] = msg;
   slog_queue.push(msg);
 }
 console.log(window.performance.now()-last_queue_time);
 if ((slog_queue.length>0&&window.performance.now()-last_queue_time>1500)||flush_queue) {
   flush_queue = false;
   console.log("flushing...");
   var req=new XMLHttpRequest();
   req.open("POST", "/logger", true);
   req.setRequestHeader("Content-type", "text/text");
   req.onreadystatechange = function() {
    if (req.readyState==4&&req.status==200) {
      var resp=req.responseText;
      console.log("read response", resp);
    }
   }
   buf = "";
   for (var i=0; i<slog_queue.length; i++) {
     buf+=slog_queue[i]+"\n";
   }
   req.send(buf);
   slog_queue = [];
   last_queue_time = window.performance.now();
 }
}
function flush_server_log() {
 flush_queue = true;
 server_log();
}
function arr_iter(keys) {
 this.keys = keys;
 this.cur = 0;
 this.__iterator__ = function() {
  return this;
 }
 this.next = function() {
  if (this.cur>=this.keys.length) {
    throw StopIteration;
  }
  return this.keys[this.cur++];
 }
}
try {
 var i=StopIteration;
}
catch (error) {
  StopIteration = {"SI": 1}
}
__use_Iterator = false;
_do_frame_debug = false;
_do_iter_err_stacktrace = true;
FrameContinue = {"FC": 1}
FrameBreak = {"FB": 1}
function getattr(obj, attr) {
 return obj[attr];
}
function setattr(obj, attr, val) {
 obj[attr] = val;
}
function delattr(obj, attr) {
 delete obj[attr];
}
function __get_iter(obj) {
 if (obj==undefined) {
   console.trace();
   print_stack();
   throw "Invalid iteration over undefined value";
 }
 if (obj.__proto__.hasOwnProperty("__iterator__")||obj.hasOwnProperty("__iterator__")) {
   return obj.__iterator__();
 }
 else {
  if (__use_Iterator) {
    return Iterator(obj);
  }
  else {
   keys = [];
   for (var k in obj) {
     keys.push(k);
   }
   return new arr_iter(keys);
  }
 }
}
function __get_iter2(obj) {
 if (obj.__proto__.hasOwnProperty("__iterator__")||obj.hasOwnProperty("__iterator__")) {
   return obj.__iterator__();
 }
 else {
  var keys=[];
  for (var k in obj) {
    keys.push([k, obj[k]]);
  }
  return new arr_iter(keys);
 }
}
try {
 _tst = Iterator({});
}
catch (Error) {
  __use_Iterator = false;
  Iterator = __get_iter2;
}
utils = require("../../server/js_build/utils.js");
inherit = utils.inherit;
create_prototype = utils.create_prototype;
set = utils.set;
GArray = utils.GArray;
hashtable = utils.hashtable;
print_stack = utils.print_stack;
utils = require("../../server/js_build/utils.js");
with (utils) {
  limit_code = {"0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9}
  limit_code_rev = {}
  var c=10;
  for (var i=65; i<91; i++) {
    limit_code[String.fromCharCode(i)] = c++;
  }
  limit_code["."] = c++;
  limit_code["?"] = c++;
  max_limit_code = c;
  var __iter_k = __get_iter(limit_code);
  while (1) {
   try {
    var k = __iter_k.next();
    limit_code_rev[limit_code[k]] = k;
   }
   catch (_for_err) {
     if (_for_err!==StopIteration) {
       if (_do_iter_err_stacktrace)
        print_stack(_for_err);
       throw _for_err;
       break;
     }
     break;
   }
  }
  _sran_tab = [0.42858355099189227, 0.5574386030715371, 0.9436109711290556, 0.11901816474442506, 0.05494319267999703, 0.4089598843412747, 0.9617377622975879, 0.6144736752713642, 0.4779527665160106, 0.5358937375859902, 0.6392009453796094, 0.24893232630444684, 0.33278166078571036, 0.23623349009987882, 0.6007015401310062, 0.3705022651967115, 0.0225052050200355, 0.35908220770197297, 0.6762962413645864, 0.7286584766550781, 0.19885076794257972, 0.6066651236611478, 0.23594878250486895, 0.9559806203614414, 0.37878311003873877, 0.14489505173573436, 0.6853451367228348, 0.778201767931336, 0.9629591508405009, 0.10159174495809686, 0.9956652458055149, 0.27241630290235785, 0.4657146086929548, 0.7459995799823305, 0.30955785437169314, 0.7594519036966647, 0.9003876360971134, 0.14415784566467216, 0.13837285006138467, 0.5708662986155526, 0.04911823375362412, 0.5182157396751097, 0.24535476698939818, 0.4755762294863617, 0.6241760808125321, 0.05480018253112229, 0.8345698022607818, 0.26287656274013016, 0.1025239144443526];
  function StupidRandom(seed) {
   if (seed==undefined)
    seed = 0;
   this._seed = seed+1;
   this.i = 1;
   this.seed = function(seed) {
    this._seed = seed+1;
    this.i = 1;
   }
   this.random = function() {
    var tab=_sran_tab;
    var i=this.i;
    if (i<0) {
      i = Math.abs(i)-1;
    }
    i = Math.max(i, 1);
    var i1=Math.max(i, 0)+this._seed;
    var i2=Math.ceil(i/4+this._seed);
    var r1=Math.sqrt(tab[i1%tab.length]*tab[i2%tab.length]);
    this.i++;
    return r1;
   }
  }
  create_prototype(StupidRandom);
  _keyrot_rnd = new StupidRandom(0);
  function key_rot(key) {
   key = key.toString().toUpperCase();
   s2 = "";
   if (key.length>0) {
     var c=key[key.length-1];
     if (!(c in limit_code)) {
       throw "Invalid string for key_rot!";
     }
     _keyrot_rnd.seed(limit_code[c]);
   }
   for (var i=0; i<key.length-1; i++) {
     var c=key[i];
     if (!(c in limit_code)) {
       console.log(c);
       throw "Invalid string for key_rot!";
     }
     var limitcode=limit_code[c];
     var r=Math.floor(_keyrot_rnd.random()*24.0);
     limitcode = (limitcode+r)%max_limit_code;
     c = limit_code_rev[limitcode];
     s2+=c;
   }
   if (key.length>0) {
     s2+=key[key.length-1];
   }
   return s2;
  }
  function key_unrot(key) {
   key = key.toString().toUpperCase();
   s2 = "";
   if (key.length>0) {
     var c=key[key.length-1];
     if (!(c in limit_code)) {
       console.log(c);
       throw "Invalid string for key_rot!";
     }
     _keyrot_rnd.seed(limit_code[c]);
   }
   for (var i=0; i<key.length-1; i++) {
     var c=key[i];
     if (!(c in limit_code)) {
       throw "Invalid string for key_rot!";
     }
     var limitcode=limit_code[c];
     var r=Math.floor(_keyrot_rnd.random()*24.0);
     limitcode = (limitcode+max_limit_code-r)%max_limit_code;
     c = limit_code_rev[limitcode];
     s2+=c;
   }
   if (key.length>0) {
     s2+=key[key.length-1];
   }
   return s2;
  }
  function SFileDB_Backend() {
  }
  create_prototype(SFileDB_Backend);
  SFileDB_Backend.prototype.get_file = function(id) {
  }
  SFileDB_Backend.prototype.set_file_meta = function(id, meta) {
  }
  SFileDB_Backend.prototype.prepare_file_upload = function(id) {
  }
  SFileDB_Backend.prototype.file_upload_chunk = function(id, token) {
  }
  SFileDB_Backend.prototype.get_upload_cur = function(id, token) {
  }
  SFileDB_Backend.prototype.get_upload_status = function(id, token) {
  }
  SFileDB_Backend.prototype.file_link_dir = function(id) {
  }
  SFileDB_Backend.prototype.create_file = function(name, mimetype, parent) {
  }
  SFileDB_Backend.prototype.create_folder = function(name, parent) {
  }
  function SFileDB() {
   this.cur_id = 1;
   this.userkey = 0;
   this.gen_id = function(filename) {
    function gen_id(cols, id) {
     hex = id.toString(16);
     var slen=cols-hex.length;
     for (var i=0; i<slen; i++) {
       hex = "0"+hex;
     }
     return hex;
    }
    return key_rot(this.userkey+"."+gen_id(8, this.cur_id++));
   }
  }
  function SFile(id, name) {
   this.id = id;
   this.name = new String(name);
   this.mime = "application/binary";
   this.parents = new set();
   this.labels = {"trashed": false}
   this.modified_time = "";
   this.access_time = "";
   this.trashed_time = "";
  }
}
