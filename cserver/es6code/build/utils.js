"use strict";
function Iter() {
}
create_prototype(Iter);
Iter.prototype.reset = function() {
}
Iter.prototype.next = function() {
}
function CanIter() {
}
create_prototype(CanIter);
CanIter.prototype.__iterator__ = function() {
}
var debug_int_1=0;
function GArray(input) {
 Array.call(this);
 if (input!=undefined) {
   for (var i=0; i<input.length; i++) {
     this.push(input[i]);
   }
 }
}
inherit_multiple(GArray, [Array]);
GArray.prototype.pack = function(data) {
 pack_int(data, this.length);
 for (var i=0; i<this.length; i++) {
   this[i].pack(data);
 }
}
GArray.prototype.has = function(item) {
 return this.indexOf(item)>=0;
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
GArray.prototype.insert = function(index, item) {
 for (var i=this.length; i>index; i--) {
   this[i] = this[i-1];
 }
 this[index] = item;
 this.length++;
}
GArray.prototype.prepend = function(item) {
 this.insert(0, item);
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
var defined_classes=new GArray(defined_classes);
function obj_value_iter(obj) {
 this.ret = {done: false, value: undefined}
 this.obj = obj;
 this.iter = Iterator(obj);
 this.next = function() {
  var reti=this.ret;
  var ret=this.iter.next();
  if (ret.done)
   return ret;
  reti.value = ret.value[1];
  return reti;
 }
 this.__iterator__ = function() {
  return this;
 }
}
function list(iter) {
 var lst=new GArray();
 var i=0;
 var __iter_item=__get_iter(iter);
 var item;
 while (1) {
  var __ival_item=__iter_item.next();
  if (__ival_item.done) {
    break;
  }
  item = __ival_item.value;
  lst.push(item);
  i++;
 }
 lst.length = i;
 return lst;
}
var g_list=list;
function eid_list(iter) {
 GArray.call(this);
 var __iter_item=__get_iter(iter);
 var item;
 while (1) {
  var __ival_item=__iter_item.next();
  if (__ival_item.done) {
    break;
  }
  item = __ival_item.value;
  this.push([item.type, item.eid]);
 }
 return lst;
}
inherit_multiple(eid_list, [GArray]);
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
function SafeSetIter(set1) {
 this.ret = {done: false, value: undefined}
 this.set = set1;
 this.iter = new SetIter(set1);
 this.nextitem = undefined;
}
create_prototype(SafeSetIter);
SafeSetIter.prototype.__iterator__ = function() {
 return this;
}
SafeSetIter.prototype.next = function() {
 throw new Error("Fix this before using");
 var reti=this.ret;
 var iter=this.iter;
 if (this.nextitem==undefined) {
   this.nextitem = iter.next();
 }
 var ret=this.nextitem;
 this.nextitem = iter.next();
 return ret;
}
function SetIter(set1) {
 this.ret = {done: false, value: undefined}
 this.set = set1;
 this.iter = Iterator(set1.items);
}
create_prototype(SetIter);
SetIter.prototype.next = function() {
 var reti=this.ret;
 var iter=this.iter;
 var items=this.set.items;
 var item=iter.next();
 if (item.done)
  return item;
 while (!items.hasOwnProperty(item.value[0])) {
  item = iter.next();
  if (item.done)
   return item;
 }
 reti.value = item.value[1];
 return reti;
}
function set(input) {
 this.items = {}
 this.length = 0;
 if (input!=undefined) {
   if (__instance_of(input, Array)||__instance_of(input, String)) {
     for (var i=0; i<input.length; i++) {
       this.add(input[i]);
     }
   }
   else {
    var __iter_item=__get_iter(input);
    var item;
    while (1) {
     var __ival_item=__iter_item.next();
     if (__ival_item.done) {
       break;
     }
     item = __ival_item.value;
     this.add(item);
    }
   }
 }
}
create_prototype(set);
set.prototype.pack = function(data) {
 pack_int(data, this.length);
 var __iter_item=__get_iter(this);
 var item;
 while (1) {
  var __ival_item=__iter_item.next();
  if (__ival_item.done) {
    break;
  }
  item = __ival_item.value;
  item.pack(data);
 }
}
set.prototype.toJSON = function() {
 var arr=new Array(this.length);
 var i=0;
 var __iter_item=__get_iter(this.items);
 var item;
 while (1) {
  var __ival_item=__iter_item.next();
  if (__ival_item.done) {
    break;
  }
  item = __ival_item.value;
  arr[i] = this.items[item];
  i+=1;
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
 var newset=new set(this);
 var __iter_item=__get_iter(b);
 var item;
 while (1) {
  var __ival_item=__iter_item.next();
  if (__ival_item.done) {
    break;
  }
  item = __ival_item.value;
  newset.add(item);
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
 this.ret = {done: false, value: undefined}
 this.arr = arr;
 this.cur = 0;
}
create_prototype(GArrayIter);
GArrayIter.prototype.next = function() {
 var reti=this.ret;
 if (this.cur>=this.arr.length) {
   this.cur = 0;
   this.ret = {done: false, value: undefined}
   reti.done = true;
   return reti;
 }
 else {
  reti.value = this.arr[this.cur++];
  return reti;
 }
}
GArrayIter.prototype.reset = function() {
 this.ret = {done: false, value: undefined}
 this.cur = 0;
}
function HashKeyIter(hash) {
 this.ret = {done: false, value: undefined}
 this.hash = hash;
 this.iter = Iterator(hash.items);
}
create_prototype(HashKeyIter);
HashKeyIter.prototype.next = function() {
 var reti=this.ret;
 var iter=this.iter;
 var items=this.hash.items;
 var item=iter.next();
 if (item.done)
  return item;
 while (!items.hasOwnProperty(item.value[0])) {
  if (item.done)
   return item;
  item = iter.next();
 }
 reti.value = this.hash.keymap[item.value[0]];
 return reti;
}
function hashtable() {
 this.items = {}
 this.keymap = {}
 this.length = 0;
}
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
 var __iter_k=__get_iter(this);
 var k;
 while (1) {
  var __ival_k=__iter_k.next();
  if (__ival_k.done) {
    break;
  }
  k = __ival_k.value;
  ret.push(this.items[k]);
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
 var __iter_item=__get_iter(b);
 var item;
 while (1) {
  var __ival_item=__iter_item.next();
  if (__ival_item.done) {
    break;
  }
  item = __ival_item.value;
  newhash.add(item, b.get[item]);
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
 var __iter_f=__get_iter(m.faces);
 var f;
 while (1) {
  var __ival_f=__iter_f.next();
  if (__ival_f.done) {
    break;
  }
  f = __ival_f.value;
  var lset=new set();
  var eset=new set();
  var vset=new set();
  var __iter_v=__get_iter(f.verts);
  var v;
  while (1) {
   var __ival_v=__iter_v.next();
   if (__ival_v.done) {
     break;
   }
   v = __ival_v.value;
   if (vset.has(v)) {
     console.trace();
     console.log("Warning: found same vert multiple times in a face");
   }
   vset.add(v);
  }
  var __iter_e=__get_iter(f.edges);
  var e;
  while (1) {
   var __ival_e=__iter_e.next();
   if (__ival_e.done) {
     break;
   }
   e = __ival_e.value;
   if (eset.has(e)) {
     console.trace();
     console.log("Warning: found same edge multiple times in a face");
   }
   eset.add(e);
  }
  var __iter_loops=__get_iter(f.looplists);
  var loops;
  while (1) {
   var __ival_loops=__iter_loops.next();
   if (__ival_loops.done) {
     break;
   }
   loops = __ival_loops.value;
   var __iter_l=__get_iter(loops);
   var l;
   while (1) {
    var __ival_l=__iter_l.next();
    if (__ival_l.done) {
      break;
    }
    l = __ival_l.value;
    if (lset.has(l)) {
      console.trace();
      return false;
    }
    lset.add(l);
   }
  }
 }
 var __iter_v=__get_iter(m.verts);
 var v;
 while (1) {
  var __ival_v=__iter_v.next();
  if (__ival_v.done) {
    break;
  }
  v = __ival_v.value;
  if (v._gindex==-1) {
    console.trace();
    return false;
  }
  if (v.loop!=null&&v.loop.f._gindex==-1) {
    console.trace();
    return false;
  }
  var __iter_e=__get_iter(v.edges);
  var e;
  while (1) {
   var __ival_e=__iter_e.next();
   if (__ival_e.done) {
     break;
   }
   e = __ival_e.value;
   if (e._gindex==-1) {
     console.trace();
     return false;
   }
   if (!e.vert_in_edge(v)) {
     console.trace();
     return false;
   }
  }
 }
 var __iter_e=__get_iter(m.edges);
 var e;
 while (1) {
  var __ival_e=__iter_e.next();
  if (__ival_e.done) {
    break;
  }
  e = __ival_e.value;
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
 var __iter_v=__get_iter(m.verts);
 var v;
 while (1) {
  var __ival_v=__iter_v.next();
  if (__ival_v.done) {
    break;
  }
  v = __ival_v.value;
  eidmap[v.eid] = v;
 }
 var __iter_e=__get_iter(m.edges);
 var e;
 while (1) {
  var __ival_e=__iter_e.next();
  if (__ival_e.done) {
    break;
  }
  e = __ival_e.value;
  eidmap[e.eid] = v;
 }
 var __iter_f=__get_iter(m.faces);
 var f;
 while (1) {
  var __ival_f=__iter_f.next();
  if (__ival_f.done) {
    break;
  }
  f = __ival_f.value;
  eidmap[f.eid] = v;
 }
 var __iter_k=__get_iter(m.eidmap);
 var k;
 while (1) {
  var __ival_k=__iter_k.next();
  if (__ival_k.done) {
    break;
  }
  k = __ival_k.value;
  if (!(k in eidmap)) {
    console.trace();
    return true;
  }
 }
 var __iter_k=__get_iter(eidmap);
 var k;
 while (1) {
  var __ival_k=__iter_k.next();
  if (__ival_k.done) {
    break;
  }
  k = __ival_k.value;
  if (!(k in m.eidmap)) {
    console.trace();
    return true;
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
   else 
    if (window.opera&&e.message) {
     var lines=err.message.split('\n');
     var len=lines.length;
     for (var i=0; i<len; i++) {
       if (lines[i].match(/^\s*[A-Za-z0-9\-_\$]+\(/)) {
         var entry=lines[i];
         if (lines[i+1]) {
           entry+=' at '+lines[i+1];
           i++;
         }
         callstack.push(entry);
       }
     }
     if (err_was_undefined) {
       callstack.shift();
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
function time_ms() {
 if (window.performance)
  return window.performance.now();
 else 
  return new Date().getMilliseconds();
}
function movavg(length) {
 this.len = length;
 this.value = 0;
 this.arr = [];
}
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
 var __iter_v=__get_iter(f.verts);
 var v;
 while (1) {
  var __ival_v=__iter_v.next();
  if (__ival_v.done) {
    break;
  }
  v = __ival_v.value;
  if (v!=e.v1&&v!=e.v2)
   return v;
 }
 return null;
}
var _sran_tab=[0.42858355099189227, 0.5574386030715371, 0.9436109711290556, 0.11901816474442506, 0.05494319267999703, 0.4089598843412747, 0.9617377622975879, 0.6144736752713642, 0.4779527665160106, 0.5358937375859902, 0.6392009453796094, 0.24893232630444684, 0.33278166078571036, 0.23623349009987882, 0.6007015401310062, 0.3705022651967115, 0.0225052050200355, 0.35908220770197297, 0.6762962413645864, 0.7286584766550781, 0.19885076794257972, 0.6066651236611478, 0.23594878250486895, 0.9559806203614414, 0.37878311003873877, 0.14489505173573436, 0.6853451367228348, 0.778201767931336, 0.9629591508405009, 0.10159174495809686, 0.9956652458055149, 0.27241630290235785, 0.4657146086929548, 0.7459995799823305, 0.30955785437169314, 0.7594519036966647, 0.9003876360971134, 0.14415784566467216, 0.13837285006138467, 0.5708662986155526, 0.04911823375362412, 0.5182157396751097, 0.24535476698939818, 0.4755762294863617, 0.6241760808125321, 0.05480018253112229, 0.8345698022607818, 0.26287656274013016, 0.1025239144443526];
function StupidRandom(seed) {
 if (seed==undefined)
  seed = 0;
 this._seed = seed+1;
 this.i = 1;
}
create_prototype(StupidRandom);
StupidRandom.prototype.seed = function(seed) {
 this._seed = seed+1;
 this.i = 1;
}
StupidRandom.prototype.random = function() {
 
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
function UnitTestError(msg) {
 Error.call(this, msg);
 this.msg = msg;
}
inherit(UnitTestError, Error);
function utest(func) {
 try {
  func();
 }
 catch (err) {
   if (__instance_of(err, UnitTestError)) {
     console.log("---------------");
     console.log("Error: Unit Test Failure");
     console.log("  "+func.name+": "+err.msg);
     console.log("---------------");
     return false;
   }
   else {
    print_stack(err);
    throw err;
   }
   return false;
 }
 console.log(func.name+" succeeded.");
 return true;
}
function do_unit_tests() {
 console.log("-----Unit testing-----");
 console.log("Total number of tests: ", defined_tests.length);
 console.log(" ");
 var totok=0, toterr=0;
 console.log("Defined tests:");
 for (var i=0; i<defined_tests.length; i++) {
   var test=defined_tests[i];
   console.log("  "+test.name);
 }
 console.log(" ");
 for (var i=0; i<defined_tests.length; i++) {
   var test=defined_tests[i];
   if (!utest(test))
    toterr++;
   else 
    totok++;
 }
 console.log("OK: ", totok);
 console.log("FAILED: ", toterr);
 console.log("-------------------");
 return toterr==0;
}
function EIDGen() {
 this.cur_eid = 1;
}
create_prototype(EIDGen);
define_static(EIDGen, "fromSTRUCT", function(unpacker) {
 var g=new EIDGen();
 unpacker(g);
 return g;
});
EIDGen.prototype.set_cur = function(cur) {
 this.cur_eid = Math.ceil(cur);
}
EIDGen.prototype.max_cur = function(cur) {
 this.cur_eid = Math.max(Math.ceil(cur)+1, this.cur_eid);
}
EIDGen.prototype.get_cur = function(cur) {
 return this.cur_eid;
}
EIDGen.prototype.gen_eid = function() {
 return this.cur_eid++;
}
EIDGen.prototype.gen_id = function() {
 return this.gen_eid();
}
EIDGen.prototype.toJSON = function() {
 return {cur_eid: this.cur_eid}
}
define_static(EIDGen, "fromJSON", function(obj) {
 var idgen=new EIDGen();
 idgen.cur_eid = obj.cur_eid;
 return idgen;
});
EIDGen.STRUCT = "\n  EIDGen {\n    cur_eid : int;\n  }";
function copy_into(dst, src) {
 console.log(dst);
 var keys2=list(obj_get_keys(src));
 for (var i=0; i<keys2.length; i++) {
   var k=keys2[i];
   dst[k] = src[k];
 }
 console.log(dst);
 return dst;
}
var __v3d_g_s=[];
function get_spiral(size) {
 if (__v3d_g_s.length==size*size)
  return __v3d_g_s;
 var arr=__v3d_g_s;
 var x=Math.floor((size-1)/2);
 var y=Math.floor((size-1)/2);
 var c;
 var i;
 if (size%2==0) {
   arr.push([x, y+1]);
   arr.push([x, y]);
   arr.push([x+1, y]);
   arr.push([x+1, y+1]);
   arr.push([x+1, y+2]);
   c = 5;
   i = 2;
   y+=2;
   x+=1;
 }
 else {
  arr.push([x, y]);
  arr.push([x+1, y]);
  arr.push([x+1, y+1]);
  c = 3;
  i = 2;
  x++;
  y++;
 }
 while (c<size*size-1) {
  var sign=(Math.floor(i/2)%2)==1;
  sign = sign ? -1.0 : 1.0;
  for (var j=0; j<i; j++) {
    if ((i%2==0)) {
      if (x+sign<0||x+sign>=size)
       break;
      x+=sign;
    }
    else {
     if (y+sign<0||y+sign>=size)
      break;
     y+=sign;
    }
    if (c==size*size)
     break;
    arr.push([x, y]);
    c++;
  }
  if (c==size*size)
   break;
  i++;
 }
 for (var j=0; j<arr.length; j++) {
   arr[j][0] = Math.floor(arr[j][0]);
   arr[j][1] = Math.floor(arr[j][1]);
 }
 return __v3d_g_s;
}
var _bt_h={"String": "string", "RegExp": "regexp", "Number": "number", "Function": "function", "Array": "array", "Boolean": "boolean", "Error": "error"}
function btypeof(obj) {
 if (typeof obj=="object") {
   if (obj.constructor.name in _bt_h)
    return _bt_h[obj.constructor.name];
   else 
    return "object";
 }
 else {
  return typeof obj;
 }
}
