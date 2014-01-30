"use strict";

function get_endian() {
  var d = [1, 0, 0, 0]
  d = new Int32Array((new Uint8Array(d)).buffer)[0]
  
  return d == 1;
}

var little_endian = get_endian()

function str_to_uint8(String str) : Uint8Array
{
  var uint8 = [];
  
  for (var i=0; i<str.length; i++) {
    uint8.push(str.charCodeAt(i));
  }
  
  return new Uint8Array(uint8);
}

//data is always stored in big-endian network byte order

/*interface definition*/
var _static_byte = new Uint8Array([0, 0, 0, 0]);
var _static_view = new DataView(_static_byte.buffer);
function pack_int(Array<byte> data, int i)
{
  _static_view.setInt32(0, i);
  for (var j=0; j<4; j++) {
    data.push(_static_byte[j]);
  }
}

function pack_byte(Array<byte> data, byte i)
{
  data.push(i);
}

function pack_float(Array<byte> data, float f)
{
  _static_view.setFloat32(0, f);
  for (var j=0; j<4; j++) {
    data.push(_static_byte[j]);
  }
}

function pack_vec2(Array<byte> data, Vector2 vec)
{
  pack_float(data, vec[0]);
  pack_float(data, vec[1]);
  pack_float(data, vec[2]);
}

function pack_vec3(Array<byte> data, Vector3 vec)
{
  pack_float(data, vec[0]);
  pack_float(data, vec[1]);
  pack_float(data, vec[2]);
}

function pack_vec4(Array<byte> data, Vector4 vec)
{
  pack_float(data, vec[0]);
  pack_float(data, vec[1]);
  pack_float(data, vec[2]);
  pack_float(data, vec[3]);
}


function pack_quat(Array<byte> data, Quat vec)
{
  pack_float(data, vec[0]);
  pack_float(data, vec[1]);
  pack_float(data, vec[2]);
  pack_float(data, vec[3]);
}

function pack_mat4(Array<byte> data, Matrix4 mat)
{
  var m = mat.getAsArray();
  
  for (var i=0; i<16; i++) {
    pack_float(data, m);
  }
}

function pack_dataref(Array<byte> data, DataBlock b)
{
  if (b != undefined)
    pack_int(data, b.lib_id);
  else
    pack_int(data, -1);
}

/*strings are packed as 32-bit unicode codepoints*/
function pack_string(Array<byte> data, String str)
{
  pack_int(data, str.length);
  
  for (var i=0; i<str.length; i++) {
    pack_int(data, str.charCodeAt(i));
  }
}

function unpack_dataref(DataView data, unpack_ctx uctx) : int
{
  var r = unpack_int(data, uctx);
  return r;
}

function unpack_byte(DataView data, unpack_ctx uctx) : byte
{
  var ret = data.getInt8(uctx.i);
  uctx.i += 1;
  
  return ret;  
}

function unpack_int(DataView data, unpack_ctx uctx) : int
{
  var ret = data.getInt32(uctx.i);

  uctx.i += 4;
  return ret;
}

function unpack_float(DataView data, unpack_ctx uctx) : float
{
  var ret = data.getFloat32(uctx.i);
  
  uctx.i += 4;
  return ret;
}
function unpack_vec2(Array<byte> data, unpack_ctx uctx)
{
  var x = unpack_float(data, uctx);
  var y = unpack_float(data, uctx);
  
  return new Vector2([x, y]);
}

function unpack_vec3(DataView data, unpack_ctx uctx) : Vector3
{
  var vec = new Vector3();
  
  var x = unpack_float(data, uctx);
  var y = unpack_float(data, uctx);
  var z = unpack_float(data, uctx);
  
  vec[0] = x; vec[1] = y; vec[2] = z;
  
  return vec;
}


function unpack_vec4(Array<byte> data, unpack_ctx uctx)
{
  var x = unpack_float(data, uctx);
  var y = unpack_float(data, uctx);
  var z = unpack_float(data, uctx);
  var w = unpack_float(data, uctx);
  
  return new Vector4([x, y, z, w]);
}


function unpack_quat(Array<byte> data, unpack_ctx uctx)
{
  var x = unpack_float(data, uctx);
  var y = unpack_float(data, uctx);
  var z = unpack_float(data, uctx);
  var w = unpack_float(data, uctx);
  
  return new Quat([x, y, z, w]);
}

function unpack_mat4(Array<byte> data, unpack_ctx uctx)
{
  var m = new Array(16);
  
  for (var i=0; i<16; i++) {
    m[i] = unpack_float(data, uctx);
  }
  
  return new Matrix4(m);
}

function unpack_string(DataView data, unpack_ctx uctx) : String
{
  var str = ""
  
  var slen = unpack_int(data, uctx);
  
  for (var i=0; i<slen; i++) {
    str += String.fromCharCode(unpack_int(data, uctx));
  }
  
  return str;
}

function unpack_ctx() {
  this.i = 0;
}

create_prototype(unpack_ctx);

function send_mesh(Mesh mesh)
{
  var buf = new ArrayBuffer(2);
  var uint = new Uint8Array(buf);
  uint[0] = 35;
  uint[1] = 36;
  
  var data = []
  mesh.pack(data);
  console.log(data);
  
  localStorage.mesh_bytes = data;
}

function NetJobFinish(job, owner);
function NetJobError(job, owner, error);
function NetJobStatus(job, owner, status) : NetStatus;

function NetStatus() {
  this.progress = 0 : float;
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
  var ret = {};
  
  if (headers == undefined)
    return ret;
  
  var in_name = true;
  var key = ""
  var value = ""
  for (var i=0; i<headers.length; i++) {
    var c = headers[i];
    
    if (c == "\n") {
      ret[key.trim()] = value.trim();
      key = ""
      value = ""
      in_name = true
      
      continue;
    } else if (c == "\r") {
      continue
    }
    
    if (in_name) {
      if (c == " " || c == "\t") {
        continue;
      } else if (c == ":") {
        in_name = false;
      } else {
        key += c;
      }
    } else {
      value += c;
    }
  }
  
  if (key.trim().length != 0) {
    ret[key.trim()] = value.trim();
  }
  
  return ret;
}

function api_exec(path, netjob, mode, 
    data, mime, extra_headers, 
    responseType) //mode, data are optional
{
  var owner = netjob.owner;
  var iter = netjob.iter;
  
  if (mode == undefined)
    mode = "GET";
  
  if (mime == undefined)
    mime = "application/octet-stream"
  
  if (data == undefined) {
    data = "";
  }  
  
  var error = netjob.error;
  
  if (error == undefined) {
    error = function(netjob, owner, msg) { console.log("Network Error: " + msg) };
  }
  
  var req = new XMLHttpRequest();
  req.open(mode, path, true);
  if (mode != "GET")
    req.setRequestHeader("Content-type", mime);
  
  if (extra_headers != undefined) {
    for (var k in extra_headers) {
      req.setRequestHeader(k, extra_headers[k]);
    }
  }
  
  if (responseType == undefined)
    responseType = "text"
  
  req.responseType = responseType
  req.onreadystatechange=function() {
   console.log(req.readyState, req.status);
    if (req.readyState==4 && (req.status>=200 && req.status <=300)) {
      var obj;
      
      netjob.headers = parse_headers(req.getAllResponseHeaders());
      console.log(netjob.headers)
      
      if (netjob.headers["Content-Type"] == "application/x-javascript") {
        try {
          obj = JSON.parse(req.response);
        } catch (_error) {
          error(netjob, owner, "JSON parse error");
          obj = {}
          return;
        }
        netjob.value = obj;
      } else {
        netjob.value = req.response;
      }     
      
      try {
        iter.next();
      } catch (_error) {
        if (_error != StopIteration) {
          throw _error;
        } else {
          if (netjob.finish) {
            netjob.finish(netjob, owner);
          }
        }
      }
    } else if (req.status >= 400) {
      error(netjob, netjob.owner, req.responseText);
      console.log(req.readyState, req.status, req.responseText);
    }
  }
  
  req.send(data);
}

function AuthSessionGen(job, user, password, refresh_token) {
  if (refresh_token == undefined) {
    var sha1pwd = CryptoJS.enc.Base64.stringify(CryptoJS.SHA1(password))
    api_exec("/api/auth?user="+user+"&password="+sha1pwd, job);
    yield 1;
    
    console.log("job.value: ", job.value);
  
    refresh_token = job.value["refresh_token"];
  }
  
  api_exec("/api/auth/session?refreshToken="+refresh_token, job);
  yield 1;
  
  var access_token = job.value["access_token"];
  job.value = {refresh : refresh_token, access : access_token};
  
  if (job.finish != undefined)
    job.finish(job, job.owner);
}

function auth_session(user, password, finish, error, status) {
  var obj = {};
  
  obj.job = new NetJob(obj, undefined, finish, error, status);
  obj.job.finish = finish;
  obj.iter = new AuthSessionGen(obj.job, user, password);
  
  obj.job.iter = obj.iter;
  try {
    obj.iter.next();
  } catch (_error) {
    if (_error != StopIteration) {
      throw _error;
    }
  }
  
  return obj;
}

function call_api(iternew, args, finish, error, status) {
  var obj = {};
  
  obj.job = new NetJob(obj, undefined, finish, error, status);
  
  var iter = new iternew(obj.job, args);
  
  iter.job = obj.job;
  obj.iter = obj.job.iter = iter;
  
  try {
    obj.iter.next();
  } catch (_error) {
    if (_error != StopIteration) {
      throw _error;
    }
  }
  
  return obj;
}

function get_user_info(job, args) {
  var token = g_app_state.session.tokens.access;
  api_exec("/api/auth/userinfo?accessToken="+token, job);
  yield;
}

function get_dir_files(job, args) {
  var token = g_app_state.session.tokens.access;
  var path = args.path;
  
  if (path == undefined) {
    api_exec("/api/files/dir/list?accessToken="+token+"&id="+args.id, job);
  } else {
    api_exec("/api/files/dir/list?accessToken="+token+"&path="+path, job);
  }
  
  yield;
}

function upload_file(job, args) {
  var suffix;
  
  var token = g_app_state.session.tokens.access;
  if (args.path == undefined) {
    suffix = "&id="+args.id;
  } else {
    suffix = "&path="+args.path;
  }
  
  var url = "/api/files/upload/start?accessToken="+token+suffix;
  api_exec(url, job);  
  yield 1;
  
  console.log(job.value);
  
  var upload_token = job.value.uploadToken;
  
  var data = args.data;
  var len = data.byteLength;
  var csize = 1024*256;
  
  var c = 0;
  var ilen = Math.ceil(len/csize);
  
  console.log("beginning upload", ilen);
  for (var i=0; i<ilen; i++) {
    console.log("Uploading chunk "+(i+1)+" of "+ilen);
    
    var url = "/api/files/upload?accessToken="+token+"&uploadToken="+upload_token;
    
    var size = i == ilen-1 ? len%(csize+1) : csize;
      
    console.log(i*csize, size, data);
    
    var chunk = new DataView(data, i*csize, size);
    var last = i*csize+size-1;
    
    var headers = {
      "Content-Range" : "bytes "+c+"-"+(c+size-1)+"/"+len
    }
    
    console.log(headers["Content-Range"], size, c, chunk)
    
    api_exec(url, job, "PUT", chunk, undefined, headers);
    yield;
    
    c += size;
  }
}

function get_file_data(job, args) {
  var token = g_app_state.session.tokens.access;
  var path = args.path;
  
  var url;
  if (path == undefined) {
    url = "/api/files/get?accessToken="+token+"&id="+args.id;
  } else {
    url = "/api/files/get?accessToken="+token+"&path="+path;
  }
  
  api_exec(url, job, undefined, undefined, undefined, undefined, "arraybuffer");
  yield;
  
  console.log(job.value);
}

function BJSON() {
}

BJSON.UNDEFINED = 0
BJSON.NULL = 1
BJSON.STRING = 2
BJSON.INT32 = 3
BJSON.FLOAT32 = 4
BJSON.BOOLEAN = 5
BJSON.OBJECT = 6
BJSON.ARRAY = 7

BJSON.stringify = function(obj) {
  function clean(ob) {
    if (ob == undefined)
      return undefined;
    
    if (ob.hasOwnProperty("toJSON") || (ob.prototype != undefined && ob.prototype.hasOwnProperty("toJSON"))) {
      return clean(ob.toJSON());
    }
    
    if (ob instanceof String || typeof ob == "string") {
      return new String(ob);
    } else if (ob instanceof Array) {
      var a2 = [];
      for (var i=0; i<ob.length; i++) {
        a2.push(clean(ob[i]));
      }
      
      return a2;
    } else if (ob == undefined) {
      return undefined;
    } else if (ob == null) {
      return null
    } else if (ob instanceof Number 
            || ob instanceof Boolean
            || typeof ob == "number" 
            || typeof ob == "boolean") 
    {
      if (ob instanceof Boolean || typeof(ob) == "boolean")
        return new Boolean(ob);
      else
        return new Number(ob);    
    } else {
      var keys = obj_get_keys(ob);
      var ob2 = {};
      
      for (var i=0; i<keys.length; i++) {
        var k = keys[i];
        var val = clean(ob[k]);
        
        if (val != undefined || ob[k] == undefined) {
          ob2[k] = val;
        }
      }
      
      return ob2;
    }
  }
  
  function serialize(data, ob) {
    if (ob == undefined) {
      pack_byte(data, BJSON.UNDEFINED);
    } else if (ob instanceof String || typeof ob == "string") 
    {
      pack_byte(data, BJSON.STRING);
      pack_string(data, ob);      
    } else if (ob instanceof Array) {
      pack_byte(data, BJSON.ARRAY);
      pack_int(data, ob.length);
      
      for (var i=0; i<ob.length; i++) {
        serialize(data, ob[i]);
      }
    } else if (ob == null) {
      pack_byte(data, BJSON.NULL);
    } else if (ob instanceof Number 
            || ob instanceof Boolean
            || typeof ob == "number" 
            || typeof ob == "boolean") 
    {
      if (ob instanceof Boolean || typeof ob == "boolean") {
        pack_byte(data, BJSON.BOOLEAN);
        pack_byte(data, !!ob);
      } else if (Math.floor(ob) == ob) {
        pack_byte(data, BJSON.INT32);
        pack_int(data, ob);
      } else {
        pack_byte(data, BJSON.FLOAT32);
        pack_float(data, ob);
      }
    } else {
      var keys = obj_get_keys(ob);
         
      pack_byte(data, BJSON.OBJECT);
      pack_int(data, keys.length);
      
      for (var i=0; i<keys.length; i++) {
        var k = keys[i];
        var val = ob[k];
        
        pack_string(data, k);
        serialize(data, val);
      }
    }
  }
  
  var obj = clean(obj);
  
  var data = []
  serialize(data, obj);
  
  data = new DataView(new Uint8Array(data).buffer);
  
  return data;
}

BJSON.parse = function(data, uc) {//uc is private
  if (!(data instanceof DataView)) {
    if (data instanceof ArrayView)
      data = DataView(data.buffer);
    else if (data instanceof ArrayBuffer) {
      data = DataView(data);
    } else {
      throw new Error("Binary JSON parse error");
    }
  }
  
  if (uc == undefined)
    uc = new unpack_ctx();
  
  var type = unpack_byte(data, uc);
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
      var obj = {};
      var totkeys = unpack_int(data, uc);
      for (var i=0; i<totkeys; i++) {
        var k = unpack_string(data, uc);
        var v = BJSON.parse(data, uc)
        obj[k] = v;
      }
      
      return obj;
    case BJSON.ARRAY:
      var arr = [];
      var len = unpack_int(data, uc);
      for (var i=0; i<len; i++) {
        arr.push(BJSON.parse(data, uc));
      }
      
      return arr;
    default:
      throw new Error("corrupted binary JSON data");
  }
}


BJSON.UNDEFINED = 0
BJSON.NULL = 1
BJSON.STRING = 2
BJSON.INT32 = 3
BJSON.FLOAT32 = 4
BJSON.BOOLEAN = 5
BJSON.OBJECT = 6
BJSON.ARRAY = 7