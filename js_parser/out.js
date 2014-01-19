GArray.prototype.call(this);
inherit(tst, GArray);
function Face(looplists) {
 if (looplists!=undefined) {
   server_log("p|Face|js_tsts.js:0|looplists:"+get_type_name(looplists));
 }
 else {
  server_log("p|Face|js_tsts.js:0|looplists:undefined");
 }
 var __ret_0=undefined;
 server_log("r|Face|js_tsts.js:51|__ret:"+get_type_name(__ret_0));
 return __ret_0;
}
