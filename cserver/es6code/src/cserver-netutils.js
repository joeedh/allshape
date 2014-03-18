"use strict";

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
    var chunk_url = "/admin/media_upload?filename="+path
    
    call_api(upload_file, {data:data, url:url, chunk_url:chunk_url}, 
             callbacks.success, callbacks.error, callbacks.progress)
  }
  
  static upload_files(FileList files, NetStatus callbacks=new NetStatus()) {
    function upload_multiple(job, args) {
      var files = args.files;
      for (var i=0; i<files.length; i++) {
        var f = files[i]
        console.log(f)
        
        var url = "/admin/media_upload?name="+f.name
        
        yield 1;
      }
    }
    
    var reader = new FileReader();
    for (var i=0; i<files.length; i++) {
      var f = files[i];
      
      console.log(files, f);
      var reader = new FileReader()
      reader.onload = function(data) {
        console.log("yay, uploading");
        netutils.upload_data(f.name, reader.result, callbacks);
      }
      reader.readAsArrayBuffer(f)
    }
    //var args = {files : files}
    //call_api(upload_files, args, callbacks.success, callbacks.error, callbacks.progress)
  }
}
