var int _prototype_id_gen = 1

#ifndef EXPORT
#define EXPORT
#define EXPORT_FUNC(func)
#endif

function inherit(obj, parent) {
  obj.prototype = Object.create(parent.prototype);
  obj.constructor = obj.prototype
  obj.prototype.prior = parent.prototype;
  obj.prototype.constructor = obj.prototype;
  obj.prototype.constructor.name = obj.name
  obj.prototype.__prototypeid__ = _prototype_id_gen++;
}
EXPORT_FUNC(inherit)

function create_prototype(obj) {
  obj.constructor = obj.prototype
  obj.prototype.constructor = obj.prototype;
  obj.prototype.constructor.name = obj.name
  obj.prototype.__prototypeid__ = _prototype_id_gen++;
}
EXPORT_FUNC(create_prototype)

function prior(thisproto, obj) {
  proto = obj.constructor;
  thisproto = thisproto.constructor;
  
  while (proto.__prototypeid__ != thisproto.__prototypeid__) {
    proto = proto.prior;
  }
  
  return proto.prior;
}
EXPORT_FUNC(prior)

debug_int_1 = 0;

function GArray<T>(Array<T> input) {
  Array<T>.call(this)
  
  if (input != undefined) {
    for (var i=0; i<input.length; i++) {
      this.push(input[i]);
    }
  }
}
EXPORT_FUNC(GArray)
inherit(GArray, Array);

GArray.prototype.__iterator__ = function() {
  return new GArrayIter<T>(this);
}
  
GArray.prototype.toJSON = function() {
  var arr = new Array(this.length);
  
  var i = 0;
  for (var i=0; i<this.length; i++) {
    arr[i] = this[i];
  }
  
  return arr;
}

GArray.prototype.remove = function(T item, Boolean ignore_existence) { //ignore_existence defaults to false
  var int idx = this.indexOf(item);
  
  if (ignore_existence == undefined)
    ignore_existence = false;
    
  if (idx < 0 || idx == undefined) {
    console.log("Yeek! Item " + item + " not in array");
    console.trace();
    
    if (!ignore_existence) {
      console.trace();
      throw "Yeek! Item " + item + " not in array"
    }
    
    return;
  }
  
  for (var int i=idx; i<this.length-1; i++) {
    this[i] = this[i+1];
  }
  
  this.length -= 1;
}

GArray.prototype.replace = function(T olditem, T newitem) { //ignore_existence defaults to false
  var int idx = this.indexOf(olditem);
  
  if (idx < 0 || idx == undefined) {
    console.log("Yeek! Item " + olditem + " not in array");
    console.trace();
    
    if (!ignore_existence)
      throw "Yeek! Item " + olditem + " not in array"

    return;
  }
  
  this[idx] = newitem;
}
/*
this.pop = function() {
  if (this.length == 0)
    return undefined;
  
  var ret = this[this.length-1];
  this.length--;
  
  return ret;
}
*/

GArray.prototype.toSource = function() : String {
  var s = "new GArray" + this.length + "(["
  
  for (var i=0; i<this.length; i++) {
    s += this[i];
    if (i != this.length-1)
      s += ", ";
  }
  
  s += "])";
  
  return s
}

GArray.prototype.toString = function() : String {
  var s = "[GArray: "
  for (var i=0; i<this.length; i++) {
    s += this[i];
    if (i != this.length-1)
      s += ", ";
  }
  
  s += "])";
  
  return s
}

/*
function obj_value_iter(obj) {
  this.obj = obj;
  this.iter = Iterator(obj);
  
  this.next = function() {
      try {
        return this.iter.next()[1];
      } catch (err) {
        if (err != StopIteration) {
          console.trace();
          throw err;
        } else {
          this.iter = Iterator(this.obj);
          throw StopIteration;
        }
      }
  }
  
  this.reset = function() {
    this.iter = Iterator(this.obj);
  }
  
  this.__iterator__() = function() {
    return this;
  }
}*/


function obj_value_iter(Object obj) {
  this.obj = obj;
  this.iter = Iterator(obj);
  
  this.next = function() {
    return this.iter.next()[1];
  }
  
  this.__iterator__ = function() {
    return this;
  }
}
EXPORT_FUNC(obj_value_iter)

//turns any iterator into an array
function list<T>(Iterator<T> iter) : GArray<T> {
  var lst = new GArray<T>();

  var i = 0;
  for (var item in iter) {
    lst.push(item);
    i++;
  }
  
  lst.length = i;
  
  return lst;
}
EXPORT_FUNC(list)

g_list = list;

function eid_list(GeoArrayIter<Element> iter) {
  GArray.call(this);
  
  for (var item in iter) {
    this.push([item.type, item.eid]);
  }
  
  return lst;
}
EXPORT_FUNC(eid_list)
inherit(eid_list, GArray);

Number.prototype.__hash__ = function() : String {
  return this;
}

String.prototype.__hash__ = function() : String {
  return this;
}

Array.prototype.__hash__ = function() : String {
  var s = ""
  for (var i=0; i<this.length; i++) {
    s += this[i].__hash__()+"|"
  }
  
  return s
}

//an iterator that allows removing elements from
//a set during iteration
function SafeSetIter<T>(set) {
  this.set = set
  this.iter = new SetIter(set)
  this.nextitem = undefined;
  
  this.__iterator__ = function() : SafeSetIter<T> {
    return this;    
  }
  
  this.next = function() : T {
    var iter = this.iter
    
    if (this.nextitem == undefined) {
      this.nextitem = iter.next();
    } else if (this.nextitem === StopIteration) {
      throw StopIteration;
    }
    
    var ret = this.nextitem;
    
    try {
      this.nextitem = iter.next();
    } catch (_error) {
      if (_error !== StopIteration) {
        throw _error;
      } else {
        this.nextitem = StopIteration;
      }
    }
    
    return ret;
  }
}
EXPORT_FUNC(SafeSetIter)

/* an even safer version, if the above one doesn't work
function SafeSetIter<T>(set) {
  this.set = set
  this.arr = list(set);
  this.cur = 0;
  
  this.__iterator__ = function() : SafeSetIter<T> {
    return this;    
  }
  
  this.next = function() : T {
    if (this.cur >= this.arr.length)
      throw StopIteration;
    
    return this.arr[this.cur++];
  }
} */

function SetIter<T>(set) {
  this.set = set
  this.iter = Iterator(set.items)
  
  this.next = function() : T {
    var iter = this.iter
    var items = this.set.items
    
    var item = iter.next();
    
    /*skip over any built-in properties*/
    while (!items.hasOwnProperty(item[0])) {
      item = iter.next()
    }
    
    return item[1]
  }
}
EXPORT_FUNC(SetIter)

function set<T>(T input) {
  this.items = {}
  this.length = 0;
  
  if (input != undefined) {
    if (input instanceof Array || input instanceof String) {
      for (var i=0; i<input.length; i++) {
        this.add(input[i]);
      }
    } else {
      for (var item in input) {
        this.add(item);
      }
    }
  }
}
EXPORT_FUNC(set)

create_prototype(set)

set.prototype.toJSON = function() {
  var arr = new Array(this.length);
  
  var i = 0;
  for (var item in this.items) {
    arr[i] = this.items[item];
    i += 1
  }
  
  return arr;
}

set.prototype.toSource = function() : String {
  return "new set(" + list(this).toSource() + ")";
}

set.prototype.toString = function() : String {
  return "new set(" + list(this).toString() + ")";
}

set.prototype.add = function(T item) {
  /*if (item == undefined || item == null) {
    console.trace(item);
  }*/
  
  if (!(item.__hash__() in this.items)) { //!this.items.hasOwnProperty(item.__hash__())) {
    this.length += 1;
    this.items[item.__hash__()] = item;
  }
}

set.prototype.remove = function(T item) {
  delete this.items[item.__hash__()];
  this.length -= 1;
}

set.prototype.safe_iter =  function() : Iterator {
  return new SafeSetIter<T>(this);
}

set.prototype.__iterator__ = function() : Iterator {
  return new SetIter<T>(this);
}

set.prototype.union = function(set<T> b) {
  newset = new set<T>(this);
  
  for (var T item in b) {
    newset.add(item);
  }
  
  return newset;
}

set.prototype.has = function(T item) {
  if (item == undefined) {
    console.trace();
  }
  return this.items.hasOwnProperty(item.__hash__());
}

function GArrayIter<T>(GArray<T> arr) {
  this.arr = arr;
  this.cur = 0;
  
  this.next = function() : T {
    if (this.cur >= this.arr.length) {
      this.cur = 0;
      throw StopIteration;
    } else { 
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
    var iter = this.iter;
    var items = this.hash.items;
    
    var item = iter.next();
    
    while (!items.hasOwnProperty(item[0])) {
      item = iter.next();
    }
    
    return this.hash.keymap[item[0]];
  }
}
EXPORT_FUNC(HashKeyIter)

function hashtable() {
  this.items = {};
  this.keymap = {};
  this.length = 0;
}
EXPORT_FUNC(hashtable)

create_prototype(hashtable);

hashtable.prototype.add = function(key, item) {
  if (!this.items.hasOwnProperty(key.__hash__())) 
    this.length++;
  
  this.items[key.__hash__()] = item;
  this.keymap[key.__hash__()] = key;
}

hashtable.prototype.remove = function(key) {
  delete this.items[key.__hash__()]
  delete this.keymap[key.__hash__()]
  this.length -= 1;
}

hashtable.prototype.__iterator__ = function() {
  return new HashKeyIter(this)
}

hashtable.prototype.values = function() {
  var ret = new GArray();
  for (var k in this) {
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
  var newhash = new hashtable(this)
  
  for (var item in b) {
    newhash.add(item, b.get[item])
  }
  
  return newhash;
}

hashtable.prototype.has = function(item) {
  if (item == undefined)
    console.trace();
  return this.items.hasOwnProperty(item.__hash__())
}

function validate_mesh_intern(m) {
  var eidmap = {};
  
  for (var f in m.faces) {
    var lset = new set();
    var eset = new set();
    var vset = new set();
    
    
    for (var v in f.verts) {
      if (vset.has(v)) {
        console.trace();
        console.log("Warning: found same vert multiple times in a face");
      }
      vset.add(v);
    }
    
    for (var e in f.edges) {
      if (eset.has(e)) {
        console.trace();
        console.log("Warning: found same edge multiple times in a face");
      }
      
      eset.add(e);
    }
    
    for (var loops in f.looplists) {
      for (var l in loops) {
        if (lset.has(l)) {
          console.trace();
          return false;
        }
        
        lset.add(l);
      }
    }
  }
  
  for (var v in m.verts) {
    if (v._gindex == -1) {
      console.trace();
      return false;
    }
    
    if (v.loop != null && v.loop.f._gindex == -1) {
      console.trace();
      return false;
    }
    
    for (var e in v.edges) {
      if (e._gindex == -1) {
        console.trace();
        return false;
      }
      if (!e.vert_in_edge(v)) {
        console.trace();
        return false;
      }
    }
  }
  
  for (var e in m.edges) {
    if (e._gindex == -1) {
      console.trace();
      return false;
    }
    
    var i = 0;
    
    var lset = new set();
    var fset = new set();
    if (e.loop == null) 
      continue;
      
    var l = e.loop;
    do {
      if (lset.has(l)) {
        console.trace();
        return false;
      }
      lset.add(l);
      
      if (fset.has(l.f)) {
        console.trace();
        console.log("Warning: found the same face multiple times in an edge's radial list");
        //this is not a hard error, don't return false
      }
      fset.add(l.f);
      
      i++;
      if (i == 10000) {
        console.trace();
        return false;
      }
      
      if (l.f._gindex == -1) {
        console.trace();
        console.log("error with edge " + e.eid);
        return false;
      }
      
      l = l.radial_next;
    } while (l != e.loop);
  }
  
  for (var v in m.verts) {
    eidmap[v.eid] = v;
  }
  for (var e in m.edges) {
    eidmap[e.eid] = v;
  }
  for (var f in m.faces) {
    eidmap[f.eid] = v;    
  }
  
  for (var k in m.eidmap) {
    if (!(k in eidmap)) {
      console.trace();
      return true;
    }
  }
  
  for (var k in eidmap) {
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
    throw "Mesh validation error."
  }
}

function concat_array(a1, a2)
{
  var ret = new GArray();
  
  for (var i=0; i<a1.length; i++) {
    ret.push(a1[i]);
  }
  
  for (var i=0; i<a2.length; i++) {
    ret.push(a2[i]);
  }
  
  return ret;
}
EXPORT_FUNC(concat_array)

function get_callstack(err) {
  var callstack = [];
  var isCallstackPopulated = false;
  
  var err_was_undefined = err == undefined;
  
  if (err == undefined) {
    try {
      _idontexist.idontexist+=0; //doesn't exist- that's the point
    } catch(err1) {
      err = err1;
    }
  }
  
  if (err != undefined) {
    if (err.stack) { //Firefox
      var lines = err.stack.split('\n');
      var len=lines.length;
      for (var i=0; i<len; i++) {
        if (1) {
          lines[i] = lines[i].replace(/@http\:\/\/.*\//, "|")
          var l = lines[i].split("|")
          lines[i] = l[1] + ": " + l[0]
          lines[i] = lines[i].trim()
          callstack.push(lines[i]);
        }
      }
      
      //Remove call to printStackTrace()
      if (err_was_undefined) {
        callstack.shift();
      }
      isCallstackPopulated = true;
    }
#ifndef SERVER
    else if (window.opera && e.message) { //Opera
      var lines = err.message.split('\n');
      var len=lines.length;
      for (var i=0; i<len; i++) {
        if (lines[i].match(/^\s*[A-Za-z0-9\-_\$]+\(/)) {
          var entry = lines[i];
          //Append next line also since it has the file info
          if (lines[i+1]) {
            entry += ' at ' + lines[i+1];
            i++;
          }
          callstack.push(entry);
        }
      }
      //Remove call to printStackTrace()
      if (err_was_undefined) {
        callstack.shift();
      }
      isCallstackPopulated = true;
    }
#endif
  }
  
  var limit = 24;
  if (!isCallstackPopulated) { //IE and Safari
    var currentFunction = arguments.callee.caller;
    var i = 0;
    while (currentFunction && i < 24) {
      var fn = currentFunction.toString();
      var fname = fn.substring(fn.indexOf("function") + 8, fn.indexOf('')) || 'anonymous';
      callstack.push(fname);
      currentFunction = currentFunction.caller;
      
      i++;
    }
  }
  
  return callstack;
}
EXPORT_FUNC(get_callstack)

function print_stack(err) {
  var cs = get_callstack(err);
  
  for (var i=0; i<cs.length; i++) {
    console.log(cs[i]);
  }
}
EXPORT_FUNC(print_stack)

function time_ms() {
  if (window.performance)
    return window.performance.now();
  else
    return new Date().getMilliseconds();
}
EXPORT_FUNC(time_ms)

function movavg(length) {
  this.len = length;
  this.value = 0;
  this.arr = [];
}
EXPORT_FUNC(movavg)

create_prototype(movavg);
movavg.prototype._recalc = function() {
  if (this.arr.length == 0)
    return;

  var avg = 0.0;
  for (var i=0; i<this.arr.length; i++) {
    avg += this.arr[i];
  }
  
  avg /= this.arr.length;
  this.value = avg;
}
movavg.prototype.update = function(val) {
  if (this.arr.length < this.len) {
    this.arr.push(val);
  } else {
    this.arr.shift();
    this.arr.push(val);
  }
  
  this._recalc();
  
  return this.value;
}

movavg.prototype.valueOf = function() {
  return this.value; //"movavg(value=" + this.value + ")";
}

function nested_with_test() {
  this.scope_a = {a: 0};
  this.scope_b = {b: 1};
  
  this.next = function() {
    with ({scope_a: this.scope_a, scope_b: this.scope_b}) {
      function frame_1() {
        with (scope_a) {
          function frame_2() {
            with (scope_b) {
              console.log(a)
              console.log(b)
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
  console.log("testing nested with")
  var tst = new nested_with_test()
  tst.next() 
}

function Timer(interval_ms) {
  this.ival = interval_ms;
  this.normval = 0.0; //elapsed time scaled by timer interval
  this.last_ms = time_ms();
}
create_prototype(Timer);

Timer.prototype.ready = function() {
  this.normval = (time_ms() - this.last_ms) / this.ival;
  
  if (time_ms() - this.last_ms > this.ival) {
    this.last_ms = time_ms();
    return true;
  }
  
  return false;
}

function other_tri_vert(e, f) {
    for (var v in f.verts) {
        if (v != e.v1 && v != e.v2)
            return v;
    }
    
    return null;
}


var _sran_tab = [0.42858355099189227,0.5574386030715371,0.9436109711290556,
0.11901816474442506,0.05494319267999703,0.4089598843412747,
0.9617377622975879,0.6144736752713642,0.4779527665160106,
0.5358937375859902,0.6392009453796094,0.24893232630444684,
0.33278166078571036,0.23623349009987882,0.6007015401310062,
0.3705022651967115,0.0225052050200355,0.35908220770197297,
0.6762962413645864,0.7286584766550781,0.19885076794257972,
0.6066651236611478,0.23594878250486895,0.9559806203614414,
0.37878311003873877,0.14489505173573436,0.6853451367228348,
0.778201767931336,0.9629591508405009,0.10159174495809686,
0.9956652458055149,0.27241630290235785,0.4657146086929548,
0.7459995799823305,0.30955785437169314,0.7594519036966647,
0.9003876360971134,0.14415784566467216,0.13837285006138467,
0.5708662986155526,0.04911823375362412,0.5182157396751097,
0.24535476698939818,0.4755762294863617,0.6241760808125321,
0.05480018253112229,0.8345698022607818,0.26287656274013016,
0.1025239144443526];

function StupidRandom(seed) { //seed is undefined
  if (seed == undefined)
    seed = 0;

  this._seed = seed+1;
  this.i = 1;
    
  this.seed = function(seed) {
    this._seed = seed+1;
    this.i = 1;
  }
  
  this.random = function() {
    global _sran_tab;
    
    var tab = _sran_tab;
    var i = this.i;
    
    if (i < 0)
      i = Math.abs(i)-1;
    
    i = Math.max(i, 1)
    
    var i1 = Math.max(i, 0) + this._seed;
    var i2 = Math.ceil(i/4 + this._seed);
    var r1 = Math.sqrt(tab[i1%tab.length]*tab[i2%tab.length]);
    
    this.i++;
    
    return r1;
  }
}
create_prototype(StupidRandom);

var StupidRandom seedrand = new StupidRandom();

function get_nor_zmatrix(Vector3 no)
{
  var axis = new Vector3();
  var cross = new Vector3();
  
  axis.zero();
  axis[2] = 1.0;
  
  cross.load(no);
  cross.cross(axis);
  cross.normalize();
  
  var sign = axis.dot(no) > 0.0 ? 1.0 : -1.0
  
  var a = Math.acos(Math.abs(no.dot(axis)));
  var q = new Quat()
  
  q.axisAngleToQuat(cross, sign*a);
  var mat = q.toMatrix();
  
  return mat;
}