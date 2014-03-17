"use strict";
var DEFL_NAMELEN=64;
if (typeof String.prototype.toUTF8!="function") {
  String.prototype.toUTF8 = function() {
   var input=String(this);
   var b=[], i, unicode;
   for (var i=0; i<input.length; i++) {
     unicode = input.charCodeAt(i);
     if (unicode<=0x7f) {
       b.push(unicode);
     }
     else 
      if (unicode<=0x7ff) {
       b.push((unicode>>6)|0xc0);
       b.push((unicode&0x3f)|0x80);
     }
     else 
      if (unicode<=0xffff) {
       b.push((unicode>>12)|0xe0);
       b.push(((unicode>>6)&0x3f)|0x80);
       b.push((unicode&0x3f)|0x80);
     }
     else {
      b.push((unicode>>18)|0xf0);
      b.push(((unicode>>12)&0x3f)|0x80);
      b.push(((unicode>>6)&0x3f)|0x80);
      b.push((unicode&0x3f)|0x80);
     }
   }
   return b;
  }
}
Number.prototype.pack = function(data) {
 if (Number(Math.ceil(this))==Number(this)) {
   pack_int(data, this);
 }
 else {
  pack_float(data, this);
 }
}
String.prototype.pack = function(data) {
 pack_string(data, this);
}
Array.prototype.pack = function(data) {
 pack_int(data, this.length);
 for (var i=0; i<this.length; i++) {
   this[i].pack(data);
 }
}
function get_endian() {
 var d=[1, 0, 0, 0];
 d = new Int32Array((new Uint8Array(d)).buffer)[0];
 return d==1;
}
var little_endian=get_endian();
function str_to_uint8(str) {
 var uint8=[];
 for (var i=0; i<str.length; i++) {
   uint8.push(str.charCodeAt(i));
 }
 return new Uint8Array(uint8);
}
var _pack_stack=[];
var _rec_pack=false;
function rec_pack_struct(name) {
 _pack_rec(SchmTypes.OBJECT, name);
}
function push_pack_stack() {
 _pack_stack.push([]);
}
function pop_pack_stack() {
 return _pack_stack.pop(_pack_stack.length-1);
}
function pack_record_start() {
 _rec_pack = true;
 _pack_stack = [[]];
}
function pack_record_end() {
 _rec_pack = false;
}
function _pack_rec(type, data) {
 _pack_stack[_pack_stack.length-1].push([type, data]);
}
var _static_byte=new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]);
var _static_view=new DataView(_static_byte.buffer);
function pack_int(data, i) {
 if (_rec_pack) {
   _pack_rec(SchmTypes.INT);
 }
 _static_view.setInt32(0, i);
 for (var j=0; j<4; j++) {
   data.push(_static_byte[j]);
 }
}
function pack_byte(data, i) {
 if (_rec_pack) {
   _pack_rec(SchmTypes.BYTE);
 }
 data.push(i);
}
function pack_float(data, f) {
 if (_rec_pack) {
   _pack_rec(SchmTypes.FLOAT);
 }
 _static_view.setFloat32(0, f);
 for (var j=0; j<4; j++) {
   data.push(_static_byte[j]);
 }
}
function pack_double(data, f) {
 if (_rec_pack) {
   _pack_rec(SchmTypes.DOUBLE);
 }
 _static_view.setFloat64(0, f);
 for (var j=0; j<8; j++) {
   data.push(_static_byte[j]);
 }
}
function pack_vec2(data, vec) {
 if (_rec_pack) {
   _pack_rec(SchmTypes.VEC2);
   push_pack_stack();
 }
 pack_float(data, vec[0]);
 pack_float(data, vec[1]);
 if (_rec_pack) {
   pop_pack_stack();
 }
}
function pack_vec3(data, vec) {
 if (_rec_pack) {
   _pack_rec(SchmTypes.VEC3);
   push_pack_stack();
 }
 pack_float(data, vec[0]);
 pack_float(data, vec[1]);
 pack_float(data, vec[2]);
 if (_rec_pack) {
   pop_pack_stack();
 }
}
function pack_vec4(data, vec) {
 if (_rec_pack) {
   _pack_rec(SchmTypes.VEC4);
   push_pack_stack();
 }
 pack_float(data, vec[0]);
 pack_float(data, vec[1]);
 pack_float(data, vec[2]);
 pack_float(data, vec[3]);
 if (_rec_pack) {
   pop_pack_stack();
 }
}
function pack_quat(data, vec) {
 if (_rec_pack) {
   _pack_rec(SchmTypes.VEC4);
   push_pack_stack();
 }
 pack_float(data, vec[0]);
 pack_float(data, vec[1]);
 pack_float(data, vec[2]);
 pack_float(data, vec[3]);
 if (_rec_pack) {
   pop_pack_stack();
 }
}
function pack_mat4(data, mat) {
 var m=mat.getAsArray();
 for (var i=0; i<16; i++) {
   pack_float(data, m[i]);
 }
}
function pack_dataref(data, b) {
 if (_rec_pack) {
   _pack_rec(SchmTypes.DATAREF);
   push_pack_stack();
 }
 if (b!=undefined) {
   pack_int(data, b.lib_id);
   if (b.lib_lib!=undefined)
    pack_int(data, b.lib_lib.id);
   else 
    pack_int(data, -1);
 }
 else {
  pack_int(data, -1);
  pack_int(data, -1);
 }
 if (_rec_pack) {
   pop_pack_stack();
 }
}
function truncate_utf8(arr, maxlen) {
 var len=Math.min(arr.length, maxlen);
 var last_codepoint=0;
 var last2=0;
 var incode=false;
 var i=0;
 var code=0;
 while (i<len) {
  incode = arr[i]&128;
  if (!incode) {
    last2 = last_codepoint+1;
    last_codepoint = i+1;
  }
  i++;
 }
 if (last_codepoint<maxlen)
  arr.length = last_codepoint;
 else 
  arr.length = last2;
 return arr;
}
var _static_sbuf_ss=new Array(32);
function pack_static_string(data, str, length) {
 if (_rec_pack) {
   _pack_rec(SchmTypes.STATICSTRING, length);
   push_pack_stack();
 }
 if (length==undefined)
  throw new Error("'length' paremter is not optional for pack_static_string()");
 var arr=length<2048 ? _static_sbuf_ss : new Array();
 arr.length = 0;
 encode_utf8(arr, str);
 truncate_utf8(arr, length);
 for (var i=0; i<length; i++) {
   if (i>=arr.length) {
     data.push(0);
   }
   else {
    data.push(arr[i]);
   }
 }
 if (_rec_pack) {
   pop_pack_stack();
 }
}
function test_str_packers() {
 function static_string_test() {
  var arr=[];
  var teststr="12345678"+String.fromCharCode(8800);
  console.log(teststr);
  var arr2=[];
  encode_utf8(arr2, teststr);
  console.log(arr2.length);
  pack_static_string(arr, teststr, 9);
  if (arr.length!=9)
   throw new UnitTestError("Bad length "+arr.length.toString());
  arr = new DataView(new Uint8Array(arr).buffer);
  var str2=unpack_static_string(arr, new unpack_ctx(), 9);
  console.log(teststr, str2);
  console.log("'12345678'", "'"+str2+"'");
  if (str2!="12345678")
   throw new UnitTestError("Bad truncation");
 }
 static_string_test();
 return true;
}
create_test(test_str_packers);
var _static_sbuf=new Array(32);
function pack_string(data, str) {
 if (_rec_pack) {
   _pack_rec(SchmTypes.STRING);
   push_pack_stack();
 }
 _static_sbuf.length = 0;
 encode_utf8(_static_sbuf, str);
 pack_int(data, _static_sbuf.length);
 for (var i=0; i<_static_sbuf.length; i++) {
   data.push(_static_sbuf[i]);
 }
 if (_rec_pack) {
   pop_pack_stack();
 }
}
function unpack_bytes(data, uctx, len) {
 var ret=new DataView(data.buffer.slice(uctx.i, uctx.i+len));
 uctx.i+=len;
 return ret;
}
function unpack_array(data, uctx, unpacker) {
 var len=unpack_int(data, uctx);
 var list=new Array(len);
 for (var i=0; i<len; i++) {
   list[i] = unpacker(data, uctx);
 }
 return list;
}
function unpack_garray(data, uctx, unpacker) {
 var len=unpack_int(data, uctx);
 var list=new GArray();
 for (var i=0; i<len; i++) {
   list.push(unpacker(data, uctx));
 }
 return list;
}
function unpack_dataref(data, uctx) {
 var block_id=unpack_int(data, uctx);
 var lib_id=unpack_int(data, uctx);
 return new DataRef(block_id, lib_id);
}
function unpack_byte(data, uctx) {
 var ret=data.getInt8(uctx.i);
 uctx.i+=1;
 return ret;
}
function unpack_int(data, uctx) {
 var ret=data.getInt32(uctx.i);
 uctx.i+=4;
 return ret;
}
function unpack_float(data, uctx) {
 var ret=data.getFloat32(uctx.i);
 uctx.i+=4;
 return ret;
}
function unpack_vec2(data, uctx) {
 var x=unpack_float(data, uctx);
 var y=unpack_float(data, uctx);
 return new Vector2([x, y]);
}
function unpack_vec3(data, uctx) {
 var vec=new Vector3();
 var x=unpack_float(data, uctx);
 var y=unpack_float(data, uctx);
 var z=unpack_float(data, uctx);
 vec[0] = x;
 vec[1] = y;
 vec[2] = z;
 return vec;
}
function unpack_vec4(data, uctx) {
 var x=unpack_float(data, uctx);
 var y=unpack_float(data, uctx);
 var z=unpack_float(data, uctx);
 var w=unpack_float(data, uctx);
 return new Vector4([x, y, z, w]);
}
function unpack_quat(data, uctx) {
 var x=unpack_float(data, uctx);
 var y=unpack_float(data, uctx);
 var z=unpack_float(data, uctx);
 var w=unpack_float(data, uctx);
 return new Quat([x, y, z, w]);
}
function unpack_mat4(data, uctx) {
 var m=new Array(16);
 for (var i=0; i<16; i++) {
   m[i] = unpack_float(data, uctx);
 }
 return new Matrix4(m);
}
function encode_utf8(arr, str) {
 for (var i=0; i<str.length; i++) {
   var c=str.charCodeAt(i);
   while (c!=0) {
    var uc=c&127;
    c = c>>7;
    if (c!=0)
     uc|=128;
    arr.push(uc);
   }
 }
}
function decode_utf8(arr) {
 var str="";
 var i=0;
 while (i<arr.length) {
  var c=arr[i];
  var sum=c&127;
  var j=0;
  var lasti=i;
  while (i<arr.length&&(c&128)) {
   j+=7;
   i++;
   c = arr[i];
   c = (c&127)<<j;
   sum|=c;
  }
  if (sum==0)
   break;
  str+=String.fromCharCode(sum);
  i++;
 }
 return str;
}
function test_utf8() {
 var s="a"+String.fromCharCode(8800)+"b";
 var arr=[];
 encode_utf8(arr, s);
 var s2=decode_utf8(arr);
 if (s!=s2) {
   throw new Error("UTF-8 encoding/decoding test failed");
 }
 return true;
}
var _static_arr_uss=new Array(32);
function unpack_static_string(data, uctx, length) {
 var str="";
 if (length==undefined)
  throw new Error("'length' cannot be undefined in unpack_static_string()");
 var arr=length<2048 ? _static_arr_uss : new Array(length);
 arr.length = 0;
 var done=false;
 for (var i=0; i<length; i++) {
   var c=unpack_byte(data, uctx);
   if (c==0) {
     done = true;
   }
   if (!done&&c!=0) {
     arr.push(c);
   }
 }
 truncate_utf8(arr, length);
 return decode_utf8(arr);
}
var _static_arr_us=new Array(32);
function unpack_string(data, uctx) {
 var str="";
 var slen=unpack_int(data, uctx);
 var arr=slen<2048 ? _static_arr_us : new Array(slen);
 arr.length = slen;
 for (var i=0; i<slen; i++) {
   arr[i] = unpack_byte(data, uctx);
 }
 return decode_utf8(arr);
}
function unpack_ctx() {
 this.i = 0;
}
create_prototype(unpack_ctx);
function send_mesh(mesh) {
 var buf=new ArrayBuffer(2);
 var uint=new Uint8Array(buf);
 uint[0] = 35;
 uint[1] = 36;
 var data=[];
 mesh.pack(data);
 console.log(data);
 localStorage.mesh_bytes = data;
}



function NetStatus() {
 this.progress = 0;
 this.status_msg = "";
}
function NetJob(owner, iter, finish, error, status) {
 this.iter = iter;
 this.finish = finish;
 this.error = error;
 this.status = status;
 this.status_data = new NetStatus();
 this.value = undefined;
}
create_prototype(NetJob);
function parse_headers(headers) {
 var ret={}
 if (headers==undefined)
  return ret;
 var in_name=true;
 var key="";
 var value="";
 for (var i=0; i<headers.length; i++) {
   var c=headers[i];
   if (c=="\n") {
     ret[key.trim()] = value.trim();
     key = "";
     value = "";
     in_name = true;
     continue;
   }
   else 
    if (c=="\r") {
     continue;
   }
   if (in_name) {
     if (c==" "||c=="\t") {
       continue;
     }
     else 
      if (c==":") {
       in_name = false;
     }
     else {
      key+=c;
     }
   }
   else {
    value+=c;
   }
 }
 if (key.trim().length!=0) {
   ret[key.trim()] = value.trim();
 }
 return ret;
}
function api_exec(path, netjob, mode, data, mime, extra_headers, responseType) {
 var owner=netjob.owner;
 var iter=netjob.iter;
 if (mode==undefined)
  mode = "GET";
 if (mime==undefined)
  mime = "application/octet-stream";
 if (data==undefined) {
   data = "";
 }
 var error=netjob.error;
 if (error==undefined) {
   error = function(netjob, owner, msg) {
    console.log("Network Error: "+msg);
   }
 }
 var req=new XMLHttpRequest();
 req.open(mode, path, true);
 if (mode!="GET")
  req.setRequestHeader("Content-type", mime);
 if (extra_headers!=undefined) {
   var __iter_k=__get_iter(extra_headers);
   var k;
   while (1) {
    var __ival_k=__iter_k.next();
    if (__ival_k.done) {
      break;
    }
    k = __ival_k.value;
    req.setRequestHeader(k, extra_headers[k]);
   }
 }
 if (responseType==undefined)
  responseType = "text";
 req.responseType = responseType;
 req.onreadystatechange = function() {
  if (req.readyState==4&&(req.status>=200&&req.status<=300)) {
    var obj;
    netjob.headers = parse_headers(req.getAllResponseHeaders());
    console.log(netjob.headers);
    if (netjob.headers["Content-Type"]=="application/x-javascript") {
      try {
       obj = JSON.parse(req.response);
      }
      catch (_error) {
        error(netjob, owner, "JSON parse error");
        obj = {}
        return ;
      }
      netjob.value = obj;
    }
    else {
     netjob.value = req.response;
    }
    var reti=iter.next();
    if (reti.done) {
      if (netjob.finish) {
        netjob.finish(netjob, owner);
      }
    }
  }
  else 
   if (req.status>=400) {
    error(netjob, netjob.owner, req.responseText);
    console.log(req.readyState, req.status, req.responseText);
  }
 }
 req.send(data);
}
function AuthSessionGen(job, user, password, refresh_token) {
 this.scope = {access_token_7: undefined, password_0: password, job_0: job, user_0: user, refresh_token_0: refresh_token}
 this.ret = {done: false, value: undefined}
 this.state = 1;
 this.trystack = [];
 this.next = function() {
  var ret;
  var stack=this.trystack;
  try {
   ret = this._next();
  }
  catch (err) {
    if (stack.length>0) {
      var item=stack.pop(stack.length-1);
      this.state = item[0];
      this.scope[item[1]] = err;
      return this.next();
    }
    else {
     throw err;
    }
  }
  return ret;
 }
 this.push_trystack = function(catchstate, catchvar) {
  this.trystack.push([catchstate, catchvar]);
 }
 this.pop_trystack = function() {
  this.trystack.pop(this.trystack.length-1);
 }
 this._next = function() {
  var $__ret=undefined;
  var $__state=this.state;
  var scope=this.scope;
  while ($__state<10) {
   switch ($__state) {
    case 0:
     break;
    case 1:
     $__state = (scope.refresh_token_0==undefined) ? 2 : 5;
     break;
    case 2:
     scope.sha1pwd_2="{SHA}"+CryptoJS.enc.Base64.stringify(CryptoJS.SHA1(scope.password_0));
     api_exec("/api/auth?user="+scope.user_0+"&password="+scope.sha1pwd_2, scope.job_0);
     
     $__state = 3;
     break;
    case 3:
     $__ret = this.ret;
     $__ret.value = 1;
     
     $__state = 4;
     break;
    case 4:
     console.log("job.value: ", scope.job_0.value);
     scope.refresh_token_0 = scope.job_0.value["refresh_token"];
     
     $__state = 5;
     break;
    case 5:
     api_exec("/api/auth/session?refreshToken="+scope.refresh_token_0, scope.job_0);
     
     $__state = 6;
     break;
    case 6:
     $__ret = this.ret;
     $__ret.value = 1;
     
     $__state = 7;
     break;
    case 7:
     scope.access_token_7=scope.job_0.value["access_token"];
     scope.job_0.value = {refresh: scope.refresh_token_0, access: scope.access_token_7}
     
     $__state = 8;
     break;
    case 8:
     $__state = (scope.job_0.finish!=undefined) ? 9 : 10;
     break;
    case 9:
     scope.job_0.finish(scope.job_0, scope.job_0.owner);
     
     $__state = 10;
     break;
    case 10:
     break;
    default:
     console.log("Generator state error");
     console.trace();
     break;
   }
   if ($__ret!=undefined) {
     break;
   }
  }
  if ($__ret!=undefined) {
    this.ret.value = $__ret.value;
  }
  else {
   this.ret.done = true;
   this.ret.value = undefined;
  }
  this.state = $__state;
  return this.ret;
 }
}
function auth_session(user, password, finish, error, status) {
 var obj={}
 obj.job = new NetJob(obj, undefined, finish, error, status);
 obj.job.finish = finish;
 obj.iter = new AuthSessionGen(obj.job, user, password);
 obj.job.iter = obj.iter;
 obj.iter.next();
 return obj;
}
function call_api(iternew, args, finish, error, status) {
 var obj={}
 obj.job = new NetJob(obj, undefined, finish, error, status);
 var iter=new iternew(obj.job, args);
 iter.job = obj.job;
 obj.iter = obj.job.iter = iter;
 obj.iter.next();
 return obj;
}
function get_user_info(job, args) {
 this.scope = {args_0: args, job_0: job, token_1: undefined}
 this.ret = {done: false, value: undefined}
 this.state = 1;
 this.trystack = [];
 this.next = function() {
  var ret;
  var stack=this.trystack;
  try {
   ret = this._next();
  }
  catch (err) {
    if (stack.length>0) {
      var item=stack.pop(stack.length-1);
      this.state = item[0];
      this.scope[item[1]] = err;
      return this.next();
    }
    else {
     throw err;
    }
  }
  return ret;
 }
 this.push_trystack = function(catchstate, catchvar) {
  this.trystack.push([catchstate, catchvar]);
 }
 this.pop_trystack = function() {
  this.trystack.pop(this.trystack.length-1);
 }
 this._next = function() {
  var $__ret=undefined;
  var $__state=this.state;
  var scope=this.scope;
  while ($__state<3) {
   switch ($__state) {
    case 0:
     break;
    case 1:
     scope.token_1=g_app_state.session.tokens.access;
     api_exec("/api/auth/userinfo?accessToken="+scope.token_1, scope.job_0);
     
     $__state = 2;
     break;
    case 2:
     $__ret = this.ret;
     $__ret.value = undefined;
     
     $__state = 3;
     break;
    case 3:
     break;
    default:
     console.log("Generator state error");
     console.trace();
     break;
   }
   if ($__ret!=undefined) {
     break;
   }
  }
  if ($__ret!=undefined) {
    this.ret.value = $__ret.value;
  }
  else {
   this.ret.done = true;
   this.ret.value = undefined;
  }
  this.state = $__state;
  return this.ret;
 }
}
function get_dir_files(job, args) {
 this.scope = {path_1: undefined, args_0: args, job_0: job, token_1: undefined}
 this.ret = {done: false, value: undefined}
 this.state = 1;
 this.trystack = [];
 this.next = function() {
  var ret;
  var stack=this.trystack;
  try {
   ret = this._next();
  }
  catch (err) {
    if (stack.length>0) {
      var item=stack.pop(stack.length-1);
      this.state = item[0];
      this.scope[item[1]] = err;
      return this.next();
    }
    else {
     throw err;
    }
  }
  return ret;
 }
 this.push_trystack = function(catchstate, catchvar) {
  this.trystack.push([catchstate, catchvar]);
 }
 this.pop_trystack = function() {
  this.trystack.pop(this.trystack.length-1);
 }
 this._next = function() {
  var $__ret=undefined;
  var $__state=this.state;
  var scope=this.scope;
  while ($__state<7) {
   switch ($__state) {
    case 0:
     break;
    case 1:
     scope.token_1=g_app_state.session.tokens.access;
     scope.path_1=scope.args_0.path;
     
     $__state = 2;
     break;
    case 2:
     $__state = (scope.path_1==undefined) ? 3 : 4;
     break;
    case 3:
     api_exec("/api/files/dir/list?accessToken="+scope.token_1+"&id="+scope.args_0.id, scope.job_0);
     
     $__state = 6;
     break;
    case 4:
     
     $__state = 5;
     break;
    case 5:
     api_exec("/api/files/dir/list?accessToken="+scope.token_1+"&path="+scope.path_1, scope.job_0);
     
     $__state = 6;
     break;
    case 6:
     $__ret = this.ret;
     $__ret.value = undefined;
     
     $__state = 7;
     break;
    case 7:
     break;
    default:
     console.log("Generator state error");
     console.trace();
     break;
   }
   if ($__ret!=undefined) {
     break;
   }
  }
  if ($__ret!=undefined) {
    this.ret.value = $__ret.value;
  }
  else {
   this.ret.done = true;
   this.ret.value = undefined;
  }
  this.state = $__state;
  return this.ret;
 }
}
function upload_file(job, args) {
 this.scope = {c_3: undefined, job_0: job, upload_token_3: undefined, data_3: undefined, len_3: undefined, ilen_3: undefined, suffix_1: undefined, url_1: undefined, token_1: undefined, i_3: undefined, args_0: args, csize_3: undefined}
 this.ret = {done: false, value: undefined}
 this.state = 1;
 this.trystack = [];
 this.next = function() {
  var ret;
  var stack=this.trystack;
  try {
   ret = this._next();
  }
  catch (err) {
    if (stack.length>0) {
      var item=stack.pop(stack.length-1);
      this.state = item[0];
      this.scope[item[1]] = err;
      return this.next();
    }
    else {
     throw err;
    }
  }
  return ret;
 }
 this.push_trystack = function(catchstate, catchvar) {
  this.trystack.push([catchstate, catchvar]);
 }
 this.pop_trystack = function() {
  this.trystack.pop(this.trystack.length-1);
 }
 this._next = function() {
  var $__ret=undefined;
  var $__state=this.state;
  var scope=this.scope;
  while ($__state<8) {
   switch ($__state) {
    case 0:
     break;
    case 1:
     scope.suffix_1;
     scope.token_1=g_app_state.session.tokens.access;
     scope.url_1=scope.args_0.url;
     api_exec(scope.url_1, scope.job_0);
     
     $__state = 2;
     break;
    case 2:
     $__ret = this.ret;
     $__ret.value = 1;
     
     $__state = 3;
     break;
    case 3:
     console.log(scope.job_0.value);
     scope.upload_token_3=scope.job_0.value.uploadToken;
     scope.data_3=scope.args_0.data;
     scope.len_3=scope.data_3.byteLength;
     scope.csize_3=1024*256;
     scope.c_3=0;
     scope.ilen_3=Math.ceil(scope.len_3/scope.csize_3);
     console.log("beginning upload", scope.ilen_3);
     scope.i_3=0;
     
     $__state = 4;
     break;
    case 4:
     $__state = (scope.i_3<scope.ilen_3) ? 5 : 8;
     break;
    case 5:
     console.log("Uploading chunk "+(scope.i_3+1)+" of "+scope.ilen_3);
     scope.url_1="/api/files/upload?accessToken="+scope.token_1+"&uploadToken="+scope.upload_token_3;
     scope.size_5=scope.i_3==scope.ilen_3-1 ? scope.len_3%(scope.csize_3) : scope.csize_3;
     console.log(scope.i_3*scope.csize_3, scope.size_5, scope.data_3);
     scope.chunk_5=new DataView(scope.data_3, scope.i_3*scope.csize_3, scope.size_5);
     scope.last_5=scope.i_3*scope.csize_3+scope.size_5-1;
     scope.headers_5={"Content-Range": "bytes "+scope.c_3+"-"+(scope.c_3+scope.size_5-1)+"/"+scope.len_3}
     console.log(scope.headers_5["Content-Range"], scope.size_5, scope.c_3, scope.chunk_5);
     api_exec(scope.url_1, scope.job_0, "PUT", scope.chunk_5, undefined, scope.headers_5);
     
     $__state = 6;
     break;
    case 6:
     $__ret = this.ret;
     $__ret.value = undefined;
     
     $__state = 7;
     break;
    case 7:
     scope.c_3+=scope.size_5;
     scope.i_3++;
     
     $__state = 4;
     break;
    case 8:
     break;
    default:
     console.log("Generator state error");
     console.trace();
     break;
   }
   if ($__ret!=undefined) {
     break;
   }
  }
  if ($__ret!=undefined) {
    this.ret.value = $__ret.value;
  }
  else {
   this.ret.done = true;
   this.ret.value = undefined;
  }
  this.state = $__state;
  return this.ret;
 }
}
function get_file_data(job, args) {
 this.scope = {path_1: undefined, args_0: args, job_0: job, url_1: undefined, token_1: undefined}
 this.ret = {done: false, value: undefined}
 this.state = 1;
 this.trystack = [];
 this.next = function() {
  var ret;
  var stack=this.trystack;
  try {
   ret = this._next();
  }
  catch (err) {
    if (stack.length>0) {
      var item=stack.pop(stack.length-1);
      this.state = item[0];
      this.scope[item[1]] = err;
      return this.next();
    }
    else {
     throw err;
    }
  }
  return ret;
 }
 this.push_trystack = function(catchstate, catchvar) {
  this.trystack.push([catchstate, catchvar]);
 }
 this.pop_trystack = function() {
  this.trystack.pop(this.trystack.length-1);
 }
 this._next = function() {
  var $__ret=undefined;
  var $__state=this.state;
  var scope=this.scope;
  while ($__state<9) {
   switch ($__state) {
    case 0:
     break;
    case 1:
     scope.token_1=g_app_state.session.tokens.access;
     scope.path_1=scope.args_0.path;
     scope.url_1;
     
     $__state = 2;
     break;
    case 2:
     $__state = (scope.path_1==undefined) ? 3 : 4;
     break;
    case 3:
     scope.url_1 = "/api/files/get?accessToken="+scope.token_1+"&id="+scope.args_0.id;
     
     $__state = 6;
     break;
    case 4:
     
     $__state = 5;
     break;
    case 5:
     scope.url_1 = "/api/files/get?accessToken="+scope.token_1+"&path="+scope.path_1;
     
     $__state = 6;
     break;
    case 6:
     api_exec(scope.url_1, scope.job_0, undefined, undefined, undefined, undefined, "arraybuffer");
     
     $__state = 7;
     break;
    case 7:
     $__ret = this.ret;
     $__ret.value = undefined;
     
     $__state = 8;
     break;
    case 8:
     console.log(scope.job_0.value);
     
     $__state = 9;
     break;
    case 9:
     break;
    default:
     console.log("Generator state error");
     console.trace();
     break;
   }
   if ($__ret!=undefined) {
     break;
   }
  }
  if ($__ret!=undefined) {
    this.ret.value = $__ret.value;
  }
  else {
   this.ret.done = true;
   this.ret.value = undefined;
  }
  this.state = $__state;
  return this.ret;
 }
}
function BJSON() {
}
BJSON.UNDEFINED = 0;
BJSON.NULL = 1;
BJSON.STRING = 2;
BJSON.INT32 = 3;
BJSON.FLOAT32 = 4;
BJSON.BOOLEAN = 5;
BJSON.OBJECT = 6;
BJSON.ARRAY = 7;
BJSON.stringify = function(obj) {
 function clean(ob) {
  if (ob==undefined)
   return undefined;
  if (ob.hasOwnProperty("toJSON")) {
    return clean(ob.toJSON());
  }
  if (__instance_of(ob, String)||typeof ob=="string") {
    return new String(ob);
  }
  else 
   if (__instance_of(ob, Array)) {
    var a2=[];
    for (var i=0; i<ob.length; i++) {
      a2.push(clean(ob[i]));
    }
    return a2;
  }
  else 
   if (ob==undefined) {
    return undefined;
  }
  else 
   if (ob==null) {
    return null;
  }
  else 
   if (__instance_of(ob, Number)||__instance_of(ob, Boolean)||typeof ob=="number"||typeof ob=="boolean") {
    if (__instance_of(ob, Boolean)||typeof (ob)=="boolean")
     return new Boolean(ob);
    else 
     return new Number(ob);
  }
  else {
   var keys=obj_get_keys(ob);
   var ob2={}
   for (var i=0; i<keys.length; i++) {
     var k=keys[i];
     var val=clean(ob[k]);
     if (val!=undefined||ob[k]==undefined) {
       ob2[k] = val;
     }
   }
   return ob2;
  }
 }
 function serialize(data, ob) {
  if (ob==undefined) {
    pack_byte(data, BJSON.UNDEFINED);
  }
  else 
   if (__instance_of(ob, String)||typeof ob=="string") {
    pack_byte(data, BJSON.STRING);
    pack_string(data, ob);
  }
  else 
   if (__instance_of(ob, Array)) {
    pack_byte(data, BJSON.ARRAY);
    pack_int(data, ob.length);
    for (var i=0; i<ob.length; i++) {
      serialize(data, ob[i]);
    }
  }
  else 
   if (ob==null) {
    pack_byte(data, BJSON.NULL);
  }
  else 
   if (__instance_of(ob, Number)||__instance_of(ob, Boolean)||typeof ob=="number"||typeof ob=="boolean") {
    if (__instance_of(ob, Boolean)||typeof ob=="boolean") {
      pack_byte(data, BJSON.BOOLEAN);
      pack_byte(data, !!ob);
    }
    else 
     if (Math.floor(ob)==ob) {
      pack_byte(data, BJSON.INT32);
      pack_int(data, ob);
    }
    else {
     pack_byte(data, BJSON.FLOAT32);
     pack_float(data, ob);
    }
  }
  else {
   var keys=obj_get_keys(ob);
   pack_byte(data, BJSON.OBJECT);
   pack_int(data, keys.length);
   for (var i=0; i<keys.length; i++) {
     var k=keys[i];
     var val=ob[k];
     pack_string(data, k);
     serialize(data, val);
   }
  }
 }
 var obj=clean(obj);
 var data=[];
 serialize(data, obj);
 data = new DataView(new Uint8Array(data).buffer);
 return data;
}
BJSON.parse = function(data, uc) {
 if (!(__instance_of(data, DataView))) {
   if (__instance_of(data, ArrayView))
    data = DataView(data.buffer);
   else 
    if (__instance_of(data, ArrayBuffer)) {
     data = DataView(data);
   }
   else {
    throw new Error("Binary JSON parse error");
   }
 }
 if (uc==undefined)
  uc = new unpack_ctx();
 var type=unpack_byte(data, uc);
 switch (type) {
  case BJSON.UNDEFINED:
   return undefined;
  case BJSON.NULL:
   return null;
  case BJSON.STRING:
   return unpack_string(data, uc);
  case BJSON.INT32:
   return unpack_int(data, uc);
  case BJSON.FLOAT32:
   return unpack_float(data, uc);
  case BJSON.BOOLEAN:
   return Boolean(unpack_byte(data, uc));
  case BJSON.OBJECT:
   var obj={}
   var totkeys=unpack_int(data, uc);
   for (var i=0; i<totkeys; i++) {
     var k=unpack_string(data, uc);
     var v=BJSON.parse(data, uc);
     obj[k] = v;
   }
   return obj;
  case BJSON.ARRAY:
   var arr=[];
   var len=unpack_int(data, uc);
   for (var i=0; i<len; i++) {
     arr.push(BJSON.parse(data, uc));
   }
   return arr;
  default:
   throw new Error("corrupted binary JSON data");
 }
}
BJSON.UNDEFINED = 0;
BJSON.NULL = 1;
BJSON.STRING = 2;
BJSON.INT32 = 3;
BJSON.FLOAT32 = 4;
BJSON.BOOLEAN = 5;
BJSON.OBJECT = 6;
BJSON.ARRAY = 7;
