"use strict";

function export_stl_str(Mesh mesh) 
{
  var s = "solid obj\n";
  var tris = mesh.looptris;
  var ilen = tris.length/3;
  
  function f_str(f) {
    var ret = f.toString();
    
    if (!ret.contains("."))
      ret += ".0";
    return ret;
  }
  
  function v_str(v) {
    return f_str(v[0]) + " " + f_str(v[1]) + " " + f_str(v[2]);
  }
  
  for (var i=0; i<ilen; i++) {
    var v1 = tris[i*3].v.co;
    var v2 = tris[i*3+1].v.co;
    var v3 = tris[i*3+2].v.co;
    s += "facet normal " + v_str(tris[i*3].f.no) + "\n"
    s += "\touter loop\n"
    s += "\t\tvertex " + v_str(v1) + "\n";
    s += "\t\tvertex " + v_str(v2) + "\n";
    s += "\t\tvertex " + v_str(v3) + "\n";
    s += "\tendloop\n";
    s += "endfacet\n";
  }
  
  var arr = new Uint8Array(s.length);
  for (var i=0; i<s.length; i++) {
    arr[i] = s.charCodeAt(i);
  }
  return new DataView(arr.buffer);
}

function export_stl_bin(Mesh mesh)
{
  var arr = [];
  var tris = mesh.looptris;
  var tot = Math.floor(tris.length/3);
  var i;
  
  for (var i=0; i<80; i++) {
    arr.push(0);
  }
  
  pack_int(arr, tot, true);
  for (i=0; i<tot; i++) {
    pack_vec3(arr, tris[i*3].f.no, true);
    
    var v1 = tris[i*3].v.co;
    var v2 = tris[i*3+1].v.co;
    var v3 = tris[i*3+2].v.co;
    
    pack_vec3(arr, v1, true);
    pack_vec3(arr, v2, true);
    pack_vec3(arr, v3, true);
  }
  
  return new DataView(new Uint8Array(arr).buffer);
}