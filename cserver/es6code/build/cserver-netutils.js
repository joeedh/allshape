function NetStatus() {
}
create_prototype(NetStatus);
NetStatus.prototype.progress = function(perc, msg) {
 if (msg==undefined) {
   msg = "";
 }
}
NetStatus.prototype.error = function(code, msg) {
}
NetStatus.prototype.success = function(code, msg) {
}
function netutils() {
}
create_prototype(netutils);
define_static(netutils, "upload_data", function(path, data, callbacks) {
 var url="/admin/media_upload?filename="+path+"&size="+data.byteLength;
 call_api(upload_file, {data: data, url: url}, callbacks.success, callbacks.error, callbacks.progress);
});
