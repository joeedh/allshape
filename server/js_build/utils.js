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
    return ;
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

var _prototype_id_gen=1;
var defined_classes=new Array();
function inherit(obj, parent) {
 defined_classes.push(obj);
 obj.prototype = Object.create(parent.prototype);
 obj.prototype.prior = parent.prototype;
 obj.prototype.constructor = obj;
 obj.prototype.__prototypeid__ = _prototype_id_gen++;
 obj.prototype.__class__ = obj.name;
 obj.prototype.prototype = obj.prototype;
}
exports.inherit = inherit;
function create_prototype(obj) {
 defined_classes.push(obj);
 obj.prototype.constructor = obj;
 obj.prototype.prototype = obj.prototype;
 obj.prototype.__prototypeid__ = _prototype_id_gen++;
 obj.prototype.__class__ = obj.name;
}
exports.create_prototype = create_prototype;
function prior(thisproto, obj) {
 proto = obj.prototype;
 thisproto = thisproto.prototype;
 while (proto.__prototypeid__!=thisproto.__prototypeid__) {
  proto = proto.prior;
 }
 return proto.prior;
}
exports.prior = prior;
debug_int_1 = 0;
function GArray(input) {
 Array.call(this);
 if (input!=undefined) {
   for (var i=0; i<input.length; i++) {
     this.push(input[i]);
   }
 }
}
exports.GArray = GArray;
inherit(GArray, Array);
GArray.prototype.pack = function(data) {
 pack_int(data, this.length);
 for (var i=0; i<this.length; i++) {
   this[i].pack(data);
 }
}
GArray.prototype.__iterator__ = function() {
 return new GArrayIter(this);
}
GArray.prototype.toJSON = function() {
 var arr=new Array(this.length);
 var i=0;
 for (var i=0; i<this.length; i++) {
   arr[i] = this[i];
 }
 return arr;
}
GArray.prototype.remove = function(item, ignore_existence) {
 var idx=this.indexOf(item);
 if (ignore_existence==undefined)
  ignore_existence = false;
 if (idx<0||idx==undefined) {
   console.log("Yeek! Item "+item+" not in array");
   console.trace();
   if (!ignore_existence) {
     console.trace();
     throw "Yeek! Item "+item+" not in array";
   }
   return ;
 }
 for (var i=idx; i<this.length-1; i++) {
   this[i] = this[i+1];
 }
 this.length-=1;
}
GArray.prototype.replace = function(olditem, newitem) {
 var idx=this.indexOf(olditem);
 if (idx<0||idx==undefined) {
   console.log("Yeek! Item "+olditem+" not in array");
   console.trace();
   if (!ignore_existence)
    throw "Yeek! Item "+olditem+" not in array";
   return ;
 }
 this[idx] = newitem;
}
defined_classes = new GArray(defined_classes);
GArray.prototype.toSource = function() {
 var s="new GArray"+this.length+"([";
 for (var i=0; i<this.length; i++) {
   s+=this[i];
   if (i!=this.length-1)
    s+=", ";
 }
 s+="])";
 return s;
}
GArray.prototype.toString = function() {
 var s="[GArray: ";
 for (var i=0; i<this.length; i++) {
   s+=this[i];
   if (i!=this.length-1)
    s+=", ";
 }
 s+="])";
 return s;
}
function obj_value_iter(obj) {
 this.obj = obj;
 this.iter = Iterator(obj);
 this.next = function() {
  return this.iter.next()[1];
 }
 this.__iterator__ = function() {
  return this;
 }
}
exports.obj_value_iter = obj_value_iter;
function list(iter) {
 var lst=new GArray();
 var i=0;
 var __iter_item = __get_iter(iter);
 while (1) {
  try {
   var item = __iter_item.next();
   lst.push(item);
   i++;
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
 lst.length = i;
 return lst;
}
exports.list = list;
g_list = list;
function eid_list(iter) {
 GArray.call(this);
 var __iter_item = __get_iter(iter);
 while (1) {
  try {
   var item = __iter_item.next();
   this.push([item.type, item.eid]);
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
 return lst;
}
exports.eid_list = eid_list;
inherit(eid_list, GArray);
Number.prototype.__hash__ = function() {
 return this;
}
String.prototype.__hash__ = function() {
 return this;
}
Array.prototype.__hash__ = function() {
 var s="";
 for (var i=0; i<this.length; i++) {
   s+=this[i].__hash__()+"|";
 }
 return s;
}
function SafeSetIter(set) {
 this.set = set;
 this.iter = new SetIter(set);
 this.nextitem = undefined;
 this.__iterator__ = function() {
  return this;
 }
 this.next = function() {
  var iter=this.iter;
  if (this.nextitem==undefined) {
    this.nextitem = iter.next();
  }
  else 
   if (this.nextitem===StopIteration) {
    throw StopIteration;
  }
  var ret=this.nextitem;
  try {
   this.nextitem = iter.next();
  }
  catch (_error) {
    if (_error!==StopIteration) {
      throw _error;
    }
    else {
     this.nextitem = StopIteration;
    }
  }
  return ret;
 }
}
exports.SafeSetIter = SafeSetIter;
function SetIter(set) {
 this.set = set;
 this.iter = Iterator(set.items);
 this.next = function() {
  var iter=this.iter;
  var items=this.set.items;
  var item=iter.next();
  while (!items.hasOwnProperty(item[0])) {
   item = iter.next();
  }
  return item[1];
 }
}
exports.SetIter = SetIter;
function set(input) {
 this.items = {}
 this.length = 0;
 if (input!=undefined) {
   if (input instanceof Array||input instanceof String) {
     for (var i=0; i<input.length; i++) {
       this.add(input[i]);
     }
   }
   else {
    var __iter_item = __get_iter(input);
    while (1) {
     try {
      var item = __iter_item.next();
      this.add(item);
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
   }
 }
}
exports.set = set;
create_prototype(set);
set.prototype.pack = function(data) {
 pack_int(data, this.length);
 var __iter_item = __get_iter(this);
 while (1) {
  try {
   var item = __iter_item.next();
   item.pack(data);
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
}
set.prototype.toJSON = function() {
 var arr=new Array(this.length);
 var i=0;
 var __iter_item = __get_iter(this.items);
 while (1) {
  try {
   var item = __iter_item.next();
   arr[i] = this.items[item];
   i+=1;
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
 return arr;
}
set.prototype.toSource = function() {
 return "new set("+list(this).toSource()+")";
}
set.prototype.toString = function() {
 return "new set("+list(this).toString()+")";
}
set.prototype.add = function(item) {
 if (!(item.__hash__() in this.items)) {
   this.length+=1;
   this.items[item.__hash__()] = item;
 }
}
set.prototype.remove = function(item) {
 delete this.items[item.__hash__()];
 this.length-=1;
}
set.prototype.safe_iter = function() {
 return new SafeSetIter(this);
}
set.prototype.__iterator__ = function() {
 return new SetIter(this);
}
set.prototype.union = function(b) {
 newset = new set(this);
 var __iter_item = __get_iter(b);
 while (1) {
  try {
   var item = __iter_item.next();
   newset.add(item);
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
 return newset;
}
set.prototype.has = function(item) {
 if (item==undefined) {
   console.trace();
 }
 return this.items.hasOwnProperty(item.__hash__());
}
function GArrayIter(arr) {
 this.arr = arr;
 this.cur = 0;
 this.next = function() {
  if (this.cur>=this.arr.length) {
    this.cur = 0;
    throw StopIteration;
  }
  else {
   return this.arr[this.cur++];
  }
 }
 this.reset = function() {
  this.cur = 0;
 }
}
function HashKeyIter(hash) {
 this.hash = hash;
 this.iter = Iterator(hash.items);
 this.next = function() {
  var iter=this.iter;
  var items=this.hash.items;
  var item=iter.next();
  while (!items.hasOwnProperty(item[0])) {
   item = iter.next();
  }
  return this.hash.keymap[item[0]];
 }
}
exports.HashKeyIter = HashKeyIter;
function hashtable() {
 this.items = {}
 this.keymap = {}
 this.length = 0;
}
exports.hashtable = hashtable;
create_prototype(hashtable);
hashtable.prototype.add = function(key, item) {
 if (!this.items.hasOwnProperty(key.__hash__()))
  this.length++;
 this.items[key.__hash__()] = item;
 this.keymap[key.__hash__()] = key;
}
hashtable.prototype.remove = function(key) {
 delete this.items[key.__hash__()];
 delete this.keymap[key.__hash__()];
 this.length-=1;
}
hashtable.prototype.__iterator__ = function() {
 return new HashKeyIter(this);
}
hashtable.prototype.values = function() {
 var ret=new GArray();
 var __iter_k = __get_iter(this);
 while (1) {
  try {
   var k = __iter_k.next();
   ret.push(this.items[k]);
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
 return ret;
}
hashtable.prototype.keys = function() {
 return list(this);
}
hashtable.prototype.get = function(key) {
 return this.items[key.__hash__()];
}
hashtable.prototype.set = function(key, item) {
 if (!this.has(key)) {
   this.length++;
 }
 this.items[key.__hash__()] = item;
 this.keymap[key.__hash__()] = key;
}
hashtable.prototype.union = function(b) {
 var newhash=new hashtable(this);
 var __iter_item = __get_iter(b);
 while (1) {
  try {
   var item = __iter_item.next();
   newhash.add(item, b.get[item]);
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
 return newhash;
}
hashtable.prototype.has = function(item) {
 if (item==undefined)
  console.trace();
 return this.items.hasOwnProperty(item.__hash__());
}
function validate_mesh_intern(m) {
 var eidmap={}
 var __iter_f = __get_iter(m.faces);
 while (1) {
  try {
   var f = __iter_f.next();
   var lset=new set();
   var eset=new set();
   var vset=new set();
   var __iter_v = __get_iter(f.verts);
   while (1) {
    try {
     var v = __iter_v.next();
     if (vset.has(v)) {
       console.trace();
       console.log("Warning: found same vert multiple times in a face");
     }
     vset.add(v);
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
   var __iter_e = __get_iter(f.edges);
   while (1) {
    try {
     var e = __iter_e.next();
     if (eset.has(e)) {
       console.trace();
       console.log("Warning: found same edge multiple times in a face");
     }
     eset.add(e);
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
   var __iter_loops = __get_iter(f.looplists);
   while (1) {
    try {
     var loops = __iter_loops.next();
     var __iter_l = __get_iter(loops);
     while (1) {
      try {
       var l = __iter_l.next();
       if (lset.has(l)) {
         console.trace();
         return false;
       }
       lset.add(l);
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
 var __iter_v = __get_iter(m.verts);
 while (1) {
  try {
   var v = __iter_v.next();
   if (v._gindex==-1) {
     console.trace();
     return false;
   }
   if (v.loop!=null&&v.loop.f._gindex==-1) {
     console.trace();
     return false;
   }
   var __iter_e = __get_iter(v.edges);
   while (1) {
    try {
     var e = __iter_e.next();
     if (e._gindex==-1) {
       console.trace();
       return false;
     }
     if (!e.vert_in_edge(v)) {
       console.trace();
       return false;
     }
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
 var __iter_e = __get_iter(m.edges);
 while (1) {
  try {
   var e = __iter_e.next();
   if (e._gindex==-1) {
     console.trace();
     return false;
   }
   var i=0;
   var lset=new set();
   var fset=new set();
   if (e.loop==null)
    continue;
   var l=e.loop;
   do {
    if (lset.has(l)) {
      console.trace();
      return false;
    }
    lset.add(l);
    if (fset.has(l.f)) {
      console.trace();
      console.log("Warning: found the same face multiple times in an edge's radial list");
    }
    fset.add(l.f);
    i++;
    if (i==10000) {
      console.trace();
      return false;
    }
    if (l.f._gindex==-1) {
      console.trace();
      console.log("error with edge "+e.eid);
      return false;
    }
    l = l.radial_next;
   } while (l!=e.loop);
   
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
 var __iter_v = __get_iter(m.verts);
 while (1) {
  try {
   var v = __iter_v.next();
   eidmap[v.eid] = v;
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
 var __iter_e = __get_iter(m.edges);
 while (1) {
  try {
   var e = __iter_e.next();
   eidmap[e.eid] = v;
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
 var __iter_f = __get_iter(m.faces);
 while (1) {
  try {
   var f = __iter_f.next();
   eidmap[f.eid] = v;
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
 var __iter_k = __get_iter(m.eidmap);
 while (1) {
  try {
   var k = __iter_k.next();
   if (!(k in eidmap)) {
     console.trace();
     return true;
   }
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
 var __iter_k = __get_iter(eidmap);
 while (1) {
  try {
   var k = __iter_k.next();
   if (!(k in m.eidmap)) {
     console.trace();
     return true;
   }
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
 return true;
}
function validate_mesh(m) {
 if (!validate_mesh_intern(m)) {
   console.log("Mesh validation error.");
   throw "Mesh validation error.";
 }
}
function concat_array(a1, a2) {
 var ret=new GArray();
 for (var i=0; i<a1.length; i++) {
   ret.push(a1[i]);
 }
 for (var i=0; i<a2.length; i++) {
   ret.push(a2[i]);
 }
 return ret;
}
exports.concat_array = concat_array;
function get_callstack(err) {
 var callstack=[];
 var isCallstackPopulated=false;
 var err_was_undefined=err==undefined;
 if (err==undefined) {
   try {
    _idontexist.idontexist+=0;
   }
   catch (err1) {
     err = err1;
   }
 }
 if (err!=undefined) {
   if (err.stack) {
     var lines=err.stack.split('\n');
     var len=lines.length;
     for (var i=0; i<len; i++) {
       if (1) {
         lines[i] = lines[i].replace(/@http\:\/\/.*\//, "|");
         var l=lines[i].split("|");
         lines[i] = l[1]+": "+l[0];
         lines[i] = lines[i].trim();
         callstack.push(lines[i]);
       }
     }
     if (err_was_undefined) {
     }
     isCallstackPopulated = true;
   }
 }
 var limit=24;
 if (!isCallstackPopulated) {
   var currentFunction=arguments.callee.caller;
   var i=0;
   while (currentFunction&&i<24) {
    var fn=currentFunction.toString();
    var fname=fn.substring(fn.indexOf("function")+8, fn.indexOf(''))||'anonymous';
    callstack.push(fname);
    currentFunction = currentFunction.caller;
    i++;
   }
 }
 return callstack;
}
exports.get_callstack = get_callstack;
function print_stack(err) {
 try {
  var cs=get_callstack(err);
 }
 catch (err2) {
   console.log("Could not fetch call stack.");
   return ;
 }
 console.log("Callstack:");
 for (var i=0; i<cs.length; i++) {
   console.log(cs[i]);
 }
}
exports.print_stack = print_stack;
function time_ms() {
 if (window.performance)
  return window.performance.now();
 else 
  return new Date().getMilliseconds();
}
exports.time_ms = time_ms;
function movavg(length) {
 this.len = length;
 this.value = 0;
 this.arr = [];
}
exports.movavg = movavg;
create_prototype(movavg);
movavg.prototype._recalc = function() {
 if (this.arr.length==0)
  return ;
 var avg=0.0;
 for (var i=0; i<this.arr.length; i++) {
   avg+=this.arr[i];
 }
 avg/=this.arr.length;
 this.value = avg;
}
movavg.prototype.update = function(val) {
 if (this.arr.length<this.len) {
   this.arr.push(val);
 }
 else {
  this.arr.shift();
  this.arr.push(val);
 }
 this._recalc();
 return this.value;
}
movavg.prototype.valueOf = function() {
 return this.value;
}
function nested_with_test() {
 this.scope_a = {a: 0}
 this.scope_b = {b: 1}
 this.next = function() {
  with ({scope_a: this.scope_a, scope_b: this.scope_b}) {
    function frame_1() {
     with (scope_a) {
       function frame_2() {
        with (scope_b) {
          console.log(a);
          console.log(b);
        }
       }
       frame_2();
     }
    }
    frame_1();
  }
 }
}
function test_nested_with() {
 console.log("testing nested with");
 var tst=new nested_with_test();
 tst.next();
}
function Timer(interval_ms) {
 this.ival = interval_ms;
 this.normval = 0.0;
 this.last_ms = time_ms();
}
create_prototype(Timer);
Timer.prototype.ready = function() {
 this.normval = (time_ms()-this.last_ms)/this.ival;
 if (time_ms()-this.last_ms>this.ival) {
   this.last_ms = time_ms();
   return true;
 }
 return false;
}
function other_tri_vert(e, f) {
 var __iter_v = __get_iter(f.verts);
 while (1) {
  try {
   var v = __iter_v.next();
   if (v!=e.v1&&v!=e.v2)
    return v;
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
 return null;
}
var _sran_tab=[0.42858355099189227, 0.5574386030715371, 0.9436109711290556, 0.11901816474442506, 0.05494319267999703, 0.4089598843412747, 0.9617377622975879, 0.6144736752713642, 0.4779527665160106, 0.5358937375859902, 0.6392009453796094, 0.24893232630444684, 0.33278166078571036, 0.23623349009987882, 0.6007015401310062, 0.3705022651967115, 0.0225052050200355, 0.35908220770197297, 0.6762962413645864, 0.7286584766550781, 0.19885076794257972, 0.6066651236611478, 0.23594878250486895, 0.9559806203614414, 0.37878311003873877, 0.14489505173573436, 0.6853451367228348, 0.778201767931336, 0.9629591508405009, 0.10159174495809686, 0.9956652458055149, 0.27241630290235785, 0.4657146086929548, 0.7459995799823305, 0.30955785437169314, 0.7594519036966647, 0.9003876360971134, 0.14415784566467216, 0.13837285006138467, 0.5708662986155526, 0.04911823375362412, 0.5182157396751097, 0.24535476698939818, 0.4755762294863617, 0.6241760808125321, 0.05480018253112229, 0.8345698022607818, 0.26287656274013016, 0.1025239144443526];
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
  if (i<0)
   i = Math.abs(i)-1;
  i = Math.max(i, 1);
  var i1=Math.max(i, 0)+this._seed;
  var i2=Math.ceil(i/4+this._seed);
  var r1=Math.sqrt(tab[i1%tab.length]*tab[i2%tab.length]);
  this.i++;
  return r1;
 }
}
create_prototype(StupidRandom);
var seedrand=new StupidRandom();
function get_nor_zmatrix(no) {
 var axis=new Vector3();
 var cross=new Vector3();
 axis.zero();
 axis[2] = 1.0;
 cross.load(no);
 cross.cross(axis);
 cross.normalize();
 var sign=axis.dot(no)>0.0 ? 1.0 : -1.0;
 var a=Math.acos(Math.abs(no.dot(axis)));
 var q=new Quat();
 q.axisAngleToQuat(cross, sign*a);
 var mat=q.toMatrix();
 return mat;
}
var _o_basic_types={"String": 0, "Number": 0, "Array": 0, "Function": 0}
function is_obj_lit(obj) {
 if (obj.constructor.name in _o_basic_types)
  return false;
 if (obj.constructor.name=="Object")
  return true;
 if (obj.prototype==undefined)
  return true;
 return false;
}

//# sourceMappingURL=/content/../server/js_build/utils.js.sm
