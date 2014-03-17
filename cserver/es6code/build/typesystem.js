var defined_classes=new Array();
var defined_tests=new Array();
function create_test(obj) {
 defined_tests.push(obj);
}
var _prototype_id_gen=1;
function test_inherit_multiple() {
 function z() {
 }
 create_prototype(z);
 a = Array;
 a.prototype.test = function() {
  console.log("a", this.constructor.name);
 }
 function b() {
 }
 inherit_multiple(b, [a]);
 b.prototype.test = function() {
  console.log("b", this.constructor.name);
 }
 function c() {
 }
 inherit_multiple(c, [a]);
 c.prototype.test = function() {
  console.log("c", this.constructor.name);
 }
 function d() {
 }
 inherit_multiple(d, [b, c]);
 d.prototype.test1 = function() {
  console.log("d", this.constructor.name);
 }
 console.log("------------");
 var iof=__instance_of;
 var A=new a(), B=new b(), C=new c(), D=new d();
 console.log(iof(D, a), iof(D, b), iof(D, c), iof(D, z));
 new d().test();
 return [d, b, c, a];
}
function init_native_type(obj) {
 obj.__subclass_map__ = {}
 obj.__prototypeid__ = _prototype_id_gen++;
 obj.__subclass_map__[obj.__prototypeid__] = obj;
 obj.__clsorder__ = [];
 obj.__parents__ = [];
 obj.__statics__ = {}
 obj.prototype.__class__ = obj.name;
 obj.prototype.__prototypeid__ = obj.__prototypeid__;
}
init_native_type(Function);
init_native_type(Array);
init_native_type(Number);
init_native_type(String);
init_native_type(Boolean);
init_native_type(Error);
function inherit_multiple(obj, parents) {
 defined_classes.push(obj);
 parents.reverse();
 function merge(ps, lsts) {
  var lst=[];
  lsts.push(ps);
  for (var u=0; u<2000; u++) {
    if (lsts.length==0)
     break;
    for (var i=0; i<lsts.length; i++) {
      if (lsts[i].length==0)
       continue;
      var p=lsts[i][0];
      var bad=false;
      if (0) {
        for (var j=0; j<lst.length; j++) {
          if (lst[j].__prototypeid__==p.__prototypeid__) {
            bad = true;
            break;
          }
        }
      }
      for (var j=0; !bad&&j<lsts.length; j++) {
        if (i==j)
         continue;
        var l=lsts[j];
        for (var k=1; k<l.length; k++) {
          if (l[k].__prototypeid__==p.__prototypeid__) {
            bad = true;
            break;
          }
        }
      }
      if (!bad) {
        lst.push(p);
        lsts[i].splice(lsts[i].indexOf(p), 1);
        for (var j=0; j<lsts.length; j++) {
          var l=lsts[j];
          for (var k=0; k<l.length; k++) {
            if (l[k].__prototypeid__==p.__prototypeid__) {
              l.splice(l[k], 1);
              break;
            }
          }
        }
        if (lsts[i].length>0) {
          i-=1;
        }
        else {
         lsts[i].splice(i, 1);
         i-=1;
        }
      }
    }
  }
  var tot=0;
  for (var i=0; i<lsts.length; i++) {
    tot+=lsts[i].length;
  }
  if (tot>0) {
    throw new Error("Could not resolve multiple inheritance");
  }
  return lst;
 }
 if (parents.length==1) {
   var cs=[];
   var p=parents[0];
   if ("__clsorder__" in p) {
     var pcs=p.__clsorder__;
     for (var i=0; i<pcs.length; i++) {
       cs.push(pcs[i]);
     }
   }
   cs.push(p);
   obj.__clsorder__ = cs;
 }
 else {
  var lsts=[];
  for (var i=0; i<parents.length; i++) {
    lsts.push(parents[i].__clsorder__);
  }
  obj.__clsorder__ = merge(parents, lsts);
 }
 function _get_obj_keys(ob) {
  var ks=Object.getOwnPropertyNames(ob);
  if (ob.toString!=undefined)
   ks.push("toString");
  return ks;
 }
 var cs=obj.__clsorder__;
 var cs2=[];
 for (var i=0; i<cs.length; i++) {
   cs2.push(Object.create(Object.prototype));
   var p=cs[i];
   var keys=_get_obj_keys(p.prototype);
   for (var j=0; j<keys.length; j++) {
     var val=p.prototype[keys[j]];
     var bad=false;
     for (var k=0; !bad&&k<i; k++) {
       if (k==i)
        continue;
       var p2=cs[k];
       if (p2.__prototypeid__==p.__prototypeid__)
        continue;
       var keys2=_get_obj_keys(p2.prototype);
       for (var l=0; !bad&&l<keys2.length; l++) {
         if (p2.prototype[keys2[l]]==val) {
           bad = true;
           break;
         }
       }
     }
     if (!bad)
      cs2[i][keys[j]] = val;
   }
 }
 var exclude=["__prototypeid__", "__class__", "priors", "prototype", "constructor"];
 var eset={}
 for (var i=0; i<exclude.length; i++) {
   eset[exclude[i]] = exclude[i];
 }
 exclude = eset;
 delete exclude["toString"];
 function excluded(k) {
  return exclude.hasOwnProperty(k)&&k!="toString";
 }
 proto = Object.create(Object.prototype);
 delete proto.toString;
 for (var i=0; i<cs2.length; i++) {
   cs2[i].__prototypeid__ = cs[i].__prototypeid__;
   cs2[i].constructor = cs[i];
   cs2[i].__class__ = cs[i].name;
   var p=cs2[i];
   var keys=_get_obj_keys(p);
   for (var j=0; j<keys.length; j++) {
     if (excluded(keys[j]))
      continue;
     if (p[keys[j]]==Object.prototype.toString)
      continue;
     proto[keys[j]] = p[keys[j]];
   }
   if (i>0) {
     var keys2=_get_obj_keys(cs2[i-1]);
     for (var j=0; j<keys2.length; j++) {
       if (excluded(keys2[j]))
        continue;
       if (cs2[i][keys2[j]]!=undefined)
        continue;
       cs2[i][keys2[j]] = cs2[i-1][keys2[j]];
     }
     cs2[i].prototype==cs2[i-1];
   }
 }
 if (cs2.length>0)
  proto.prototype = cs2[cs2.length-1];
 proto.priors = obj.__clsorder__;
 proto.constructor = obj;
 proto.__prototypeid__ = _prototype_id_gen++;
 proto.__class__ = obj.name;
 obj.prototype = proto;
 obj.__prototypeid__ = proto.__prototypeid__;
 obj.__parents__ = parents;
 obj.__subclass_map__ = {}
 obj.__subclass_map__[obj.__prototypeid__] = obj;
 var name=obj.name;
 obj.__hash__ = function() {
  return name;
 }
 for (var i=0; i<cs2.length; i++) {
   if (!("__subclass_map__" in cs[i])) {
     if (!("__prototypeid__" in cs[i])) {
       cs[i].__prototypeid__ = _prototype_id_gen++;
       cs[i].prototype.__prototypeid__ = cs[i].__prototypeid__;
     }
     cs[i].__subclass_map__ = {}
     cs[i].__subclass_map__[cs[i].__prototypeid__] = cs[i];
   }
   cs[i].__subclass_map__[obj.__prototypeid__] = obj;
 }
 obj.__statics__ = {}
 for (var i=0; i<cs.length; i++) {
   if (!("__statics__" in cs[i]))
    continue;
   var keys=_get_obj_keys(cs[i].__statics__);
   for (var j=0; j<keys.length; j++) {
     var k=keys[j];
     if (k=="__proto__"||excluded(k))
      continue;
     obj.__statics__[k] = k;
     obj[k] = cs[i][k];
   }
 }
}
function __instance_of(child, parent) {
 if (parent==undefined)
  return child==undefined;
 if (typeof child!="object")
  return typeof child==typeof (parent);
 if ("__subclass_map__" in parent&&"__prototypeid__" in child) {
   return child.__prototypeid__ in parent.__subclass_map__;
 }
 else {
  return child instanceof parent;
 }
}
var instance_of=__instance_of;
function inherit(obj, parent) {
 inherit_multiple(obj, [parent]);
}
function inherit_old(obj, parent) {
 defined_classes.push(obj);
 obj.prototype = Object.create(parent.prototype);
 obj.prototype.prior = parent.prototype;
 obj.prototype.constructor = obj;
 obj.prototype.__prototypeid__ = _prototype_id_gen++;
 obj.prototype.__class__ = obj.name;
 obj.prototype.prototype = obj.prototype;
 var slist;
 if (parent.__statics__!=undefined) {
   slist = new Array(parent.__statics__.length);
   for (var i=0; i<slist.length; i++) {
     slist[i] = parent.__statics__[i];
   }
 }
 else {
  slist = [];
 }
 obj.__statics__ = slist;
 for (var i=0; i<slist.length; i++) {
   var st=slist[i];
   obj[st] = parent[st];
 }
}
function create_prototype(obj) {
 defined_classes.push(obj);
 obj.prototype.constructor = obj;
 obj.prototype.__prototypeid__ = _prototype_id_gen++;
 obj.prototype.__class__ = obj.name;
 obj.__prototypeid__ = obj.prototype.__prototypeid__;
 obj.__statics__ = [];
 obj.__clsorder__ = [];
 obj.__parents__ = [];
 obj.__subclass_map__ = {}
 obj.__subclass_map__[obj.__prototypeid__] = obj;
 var name=obj.name;
 obj.__hash__ = function() {
  return name;
 }
}
function define_static(obj, name, val) {
 obj[name] = val;
 obj.__statics__[name] = name;
}
function prior(thisproto, obj) {
 var proto=obj.constructor.prototype;
 while (proto.__prototypeid__!=thisproto.__prototypeid__) {
  proto = proto.prototype;
 }
 return proto.prototype;
}
function arr_iter(keys) {
 this.keys = keys;
 this.cur = 0;
 this.__iterator__ = function() {
  return this;
 }
 this.next = function() {
  if (this.cur>=this.keys.length) {
    return {value: undefined, done: true}
  }
  return {value: this.keys[this.cur++], done: false}
 }
}
function __get_iter(obj) {
 if (obj==undefined) {
   console.trace();
   print_stack();
   throw new Error("Invalid iteration over undefined value");
 }
 if ("__iterator__" in obj) {
   return obj.__iterator__();
 }
 else {
  var keys=[];
  for (var k in obj) {
    keys.push(k);
  }
  return new arr_iter(keys);
 }
}
var arr_iter=function(keys) {
 this.ret = {done: false, value: undefined}
 this.keys = keys;
 this.cur = 0;
 this.__iterator__ = function() {
  return this;
 }
 this.next = function() {
  if (this.cur>=this.keys.length) {
    this.ret.done = true;
    return this.ret;
  }
  this.ret.value = this.keys[this.cur++];
  return this.ret;
 }
}
function _KeyValIterator(obj) {
 this.ret = {done: false, value: [undefined, undefined]}
 this.i = 0;
 this.obj = obj;
 this.keys = Object.keys(obj);
}
create_prototype(_KeyValIterator);
_KeyValIterator.prototype.__iterator__ = function() {
 return this;
}
_KeyValIterator.prototype.next = function() {
 if (this.i>=this.keys.length) {
   this.ret.done = true;
   this.ret.value = undefined;
   return this.ret;
 }
 var k=this.keys[this.i];
 var v=this.obj[k];
 this.ret.value[0] = k;
 this.ret.value[1] = v;
 this.i++;
 return this.ret;
}
var Iterator=function(obj) {
 if ("__iterator__" in obj) {
   return obj.__iterator__();
 }
 else {
  return new _KeyValIterator(obj);
 }
}
function define_docstring(func, docstr) {
 func.__doc__ = docstr;
 return func;
}
