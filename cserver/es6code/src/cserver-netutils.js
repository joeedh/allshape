class NetStatus {
  progress(perc, msg="") {
  }
  
  error(code, msg) {
  }
  
  success(code, msg) {
  }
}

class netutils {
  static upload_data(String path, ArrayBuffer data, NetStatus callbacks) {
    var url = "/admin/media_upload?filename=" + path + "&size="+data.byteLength;
    call_api(upload_file, {data:data, url:url}, callbacks.success, callbacks.error, callbacks.progress)
  }
}
