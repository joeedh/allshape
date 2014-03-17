"use strict";
var _b64str='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
var _b64_map={}
for (var i=0; i<64; i++) {
  _b64_map[_b64str[i]] = i;
}
_b64_map["="] = 65;
var _b64_arr=[0, 1, 2, 3];
function b64encode(arr, add_newlines, collimit) {
 if (add_newlines==undefined) {
   add_newlines = false;
 }
 if (collimit==undefined) {
   collimit = 76;
 }
 
 var s="";
 var is_str=btypeof(arr)=="string";
 var ci=0;
 for (var i=0; i<arr.length-2; i+=3) {
   if (arr[i]<0||arr[i]>255) {
     console.log("Invalid input ", arr[i], " at index ", i, " passed to B64Encode");
     throw new Error("Invalid input "+arr[i]+" at index "+i+" passed to B64Encode");
   }
   var a=arr[i], b=arr[i+1], c=arr[i+2];
   if (is_str) {
     a = a.charCodeAt(0);
     b = b.charCodeAt(0);
     c = c.charCodeAt(0);
   }
   var n=a|(b<<8)|(c<<16);
   var b1=n&63;
   var b2=(n>>6)&63;
   var b3=(n>>12)&63;
   var b4=(n>>18)&63;
   _b64_arr[0] = b1;
   _b64_arr[1] = b2;
   _b64_arr[2] = b3;
   _b64_arr[3] = b4;
   for (var j=0; j<4; j++) {
     if (ci>=collimit&&add_newlines) {
       ci = 0;
       s+="\n";
     }
     s+=_b64str.charAt(_b64_arr[j]);
     ci++;
   }
 }
 if ((arr.length%3)!=0) {
   i = arr.length%3;
   if (i==1) {
     var n=arr[arr.length-1];
     if (is_str)
      n = n.charCodeAt(0);
     var b1=n&63;
     var b2=(n>>6)&63;
     s+=_b64str.charAt(b1)+_b64str.charAt(b2)+"==";
   }
   else {
    var n;
    if (is_str)
     n = arr[arr.length-2].charCodeAt(0)|(arr[arr.length-1].charCodeAt(0)<<8);
    else 
     n = arr[arr.length-2]|(arr[arr.length-1]<<8);
    var b1=n&63;
    var b2=(n>>6)&63;
    var b3=(n>>12)&63;
    s+=_b64str.charAt(b1)+_b64str.charAt(b2)+_b64str.charAt(b3)+"=";
   }
 }
 return s;
}
function b64decode(s, gen_str, gen_uint8arr) {
 if (gen_str==undefined) {
   gen_str = false;
 }
 if (gen_uint8arr==undefined) {
   gen_uint8arr = true;
 }
 var s2="";
 for (var i=0; i<s.length; i++) {
   if (s[i]!="\n"&&s[i]!="\r"&&s[i]!=" "&&s[i]!="\t")
    s2+=s[i];
 }
 s = s2;
 s2 = gen_str ? "" : [];
 for (var i=0; i<s.length; i+=4) {
   var a=_b64_map[s[i]], b=_b64_map[s[i+1]], c=_b64_map[s[i+2]], d=_b64_map[s[i+3]];
   var n=a|(b<<6)|(c<<12)|(d<<18);
   if (c==65) {
     a = n&255;
     if (gen_str)
      s2+=String.fromCharCode(a);
     else 
      s2.push(a);
     continue;
   }
   else 
    if (d==65) {
     a = n&255;
     b = (n>>8)&255;
     if (gen_str) {
       s2+=String.fromCharCode(a)+String.fromCharCode(b);
     }
     else {
      s2.push(a);
      s2.push(b);
     }
     continue;
   }
   a = n&255;
   b = (n>>8)&255;
   c = (n>>16)&255;
   if (gen_str) {
     s2+=String.fromCharCode(a)+String.fromCharCode(b);
     if (d!="=")
      s2+=String.fromCharCode(c);
   }
   else {
    s2.push(a);
    s2.push(b);
    if (d!="=")
     s2.push(c);
   }
 }
 if (!gen_str&&gen_uint8arr)
  s2 = new Uint8Array(s2);
 return s2;
}
function limit_line(s, limit) {
 if (limit==undefined) {
   limit = 80;
 }
 var s2="";
 var ci=0;
 for (var i=0; i<s.length; i++) {
   if (ci>limit) {
     s2+="\n";
     ci = 0;
   }
   if (s2=="\n")
    ci = 0;
   s2+=s.charAt(i);
   ci++;
 }
 return s2;
}
