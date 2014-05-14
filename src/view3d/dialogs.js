"use strict";
global PackedDialog;

var FileDialogModes = {OPEN: "Open", SAVE: "Save"}
var fdialog_exclude_chars = new set([
  "*",
  "\\",
  ";",
  ":",
  "&",
  "^"
]);

class FileDialog extends PackedDialog {
  constructor(mode, ctx, callback) {
    PackedDialog.call(this, FileDialogModes[mode], ctx, ctx.screen);
    
    this.subframe.default_packflag |= PackFlags.INHERIT_WIDTH;

    this.pos = [0,0];

    this.flag = DialogFlags.MODAL;
    this.callback = callback;

    var col = this.subframe.col();
    col.default_packflag &= ~PackFlags.INHERIT_WIDTH;
    col.add(Dialog.okay_button(ctx));
    col.add(Dialog.cancel_button(ctx));

    this.textbox = new UITextBox(ctx, "", [0,0], [0,0])
    this.subframe.add(this.textbox, PackFlags.INHERIT_WIDTH);

    this.listbox = new UIListBox(ctx, [0,0], [400, 300])

    var this2 = this;
    this.listbox.callback = function(listbox, text, id) {
      this2.entry_clicked(text, id);
    }

    this.subframe.add(this.listbox, PackFlags.INHERIT_WIDTH);

    this.dirpath = "/"
    this.populate();
  }

  populate() {
    var this2 = this;
    
    function finish(job, owner, msg) {
      this2.listbox.reset();
      var files = job.value.items;
      
      if (DEBUG.netio)
        console.log(files);
      for (var i=0; i<files.length; i++) {
        var fname = files[i].name;
        var ftype;
        if (files[i].is_dir) {
          ftype = "folder";
          fname = "["+fname+"]"
        } else {
          ftype = "file";
        }
        
        this2.listbox.add_item(fname, files[i]);
      }
      
      this2.do_recalc();
    }
    
    var was_closed = false;
    function error(job, owner, msg) {
      if (!was_closed) {
        error_dialog(this2.ctx, "Network Error", function() {
          this2.end(true);
        }, true);
      }
      was_closed = true;
    }
    
    call_api(get_dir_files, {path : this.dirpath}, finish, error);
  }

  entry_clicked(text, id) {
    if (!id.is_dir) {
      this.textbox.set_text(text);
    }
  }

  end(do_cancel) {
    if (!do_cancel && this.textbox.text.trim() == "") {
      console.log("no char in path")
      return;
    }
    
    var text = this.dirpath + this.textbox.text.trim()
    var eset = fdialog_exclude_chars;
    
    for (var i=0; i<text.length; i++) {
      if (eset.has(text[i])) {
        console.log("bad char in path")
        return;
      }
    }
    
    prior(FileDialog, this).end.call(this, do_cancel);
    
    if (this.callback != undefined && !do_cancel) {
       this.callback(this, text);
    }
  }
}

function file_dialog(mode, ctx, callback)
{
  var fd = new FileDialog(mode, ctx, callback);
  fd.call(ctx.screen.mpos);  
}

function download_file(path, on_finish, path_label=path, use_note=false, 
                       suppress_errors=false, on_error=undefined) 
{
  var ctx = new Context();
    
  var pd;

  if (use_note)
    pd = g_app_state.notes.progbar("Get " + path_label, 0);
  else
    pd = new ProgressDialog(ctx, "Downloading " + path_label);
    
  if (on_error == undefined)
    on_error = function() { };
    
  var did_error = false;
  function error(job, owner, msg) {
    if (!did_error) {
      did_error = true;
      pd.end()
      
      on_error(job, owner, msg);
      
      if (!suppress_errors)
        g_app_state.notes.label("Network Error");
    }
  }
  
  function status(job, owner, status) {
    pd.value = status.progress;
    if (DEBUG.netio)
      console.log("status: ", status.progress);
  }
      
  function finish(job, owner) {
    pd.end();
    on_finish(new DataView(job.value));
    
    if (DEBUG.netio)
      console.log("finished downloading");
  }
  
  var s = g_app_state.screen.size;
  if (!use_note)
    pd.call([s[0]*0.5, s[1]*0.5]);
  
  call_api(get_file_data, {path:path}, finish, error, status);
}

class FileOpenOp extends ToolOp {  
  constructor() {
    ToolOp.call(this, "open_file", "Open");
    
    this.is_modal = false;
    
    this.undoflag = UndoFlags.IGNORE_UNDO;
    this.flag = ToolFlags.HIDE_TITLE_IN_LAST_BUTTONS;
    
    this.inputs = {path : new StringProperty("", "path", "File Path", "File Path")};
  }

  exec(ctx) {
    console.log("File open");
    
    /*I should really make these file operations modal, since
        they create ui elements
     */
    ctx = new Context();
    var pd = new ProgressDialog(ctx, "Downloading");
    
    function error(job, owner, msg) {
      pd.end()
      error_dialog(ctx, "Network Error", undefined, true);
    }
    
    function status(job, owner, status) {
      pd.value = status.progress;
      pd.bar.do_recalc();
      if (DEBUG.netio)
        console.log("status: ", status.progress);
    }
        
    function open_callback(dialog, path) {
      if (DEBUG.netio)
        console.log("loading...", path);
      pd.call(ctx.screen.mpos);
      
      function finish(job, owner) {
        pd.end();
        g_app_state.load_user_file_new(new DataView(job.value));
        g_app_state.filepath = path;
        if (DEBUG.netio)
          console.log("finished downloading");
      }
      
      call_api(get_file_data, {path:path}, finish, error, status);
    }
    
    console.log("File open");
    file_dialog("OPEN", new Context(), open_callback);
  }
}

class FileSaveAsOp extends ToolOp {
  constructor() {
    ToolOp.call(this, "save_file_as", "Save As");
    
    this.is_modal = false;
    
    this.undoflag = UndoFlags.IGNORE_UNDO;
    this.flag = ToolFlags.HIDE_TITLE_IN_LAST_BUTTONS;
    
    this.inputs = {path : new StringProperty("", "path", "File Path", "File Path")};
  }

  exec(ctx) {
    console.log("File save");
    
    //I should really make these file operations modal, since
    //they create ui elements
    ctx = new Context();
    var pd = new ProgressDialog(ctx, "Uploading");
    
    var mesh_data = g_app_state.create_user_file_new().buffer;
    function error(job, owner, msg) {
      pd.end()
      error_dialog(ctx, "Network Error", undefined, true);
    }
    
    function finish(job, owner) {
      if (DEBUG.netio)
        console.log("finished uploading");
      pd.end()
    }
    
    function status(job, owner, status) {
      pd.value = status.progress;
      if (DEBUG.netio)
        console.log("status: ", status.progress, status);
    }
    
    function save_callback(dialog, path) {
      pd.call(ctx.screen.mpos);
      if (DEBUG.netio)
        console.log("saving...", path);
      global allshape_file_ext;
      
      if (!path.endsWith(allshape_file_ext)) {
        path = path + allshape_file_ext;
      }
      
      var token = g_app_state.session.tokens.access;
      var url = "/api/files/upload/start?accessToken="+token+"&path="+path
      var url2 = "/api/files/upload?accessToken="+token;
      
      call_api(upload_file, {data:mesh_data, url:url, chunk_url:url2}, finish, error, status);
    }
    
    file_dialog("SAVE", new Context(), save_callback);
  }
}

class FileNewOp extends ToolOp {
  constructor() {
    ToolOp.call(this, "new_file", "New");

    this.is_modal = false;
    
    this.undoflag = UndoFlags.IGNORE_UNDO;
    this.flag = ToolFlags.HIDE_TITLE_IN_LAST_BUTTONS;
    
    this.inputs = {};
  }

  exec(ctx) {
    function new_callback(dialog, do_cancel) {
      if (!do_cancel) {
        gen_default_file(g_app_state.screen.size);
      }
    }
    
    var okay = new OkayDialog("Create blank scene?\nAny unsaved changes\nwill be lost", new_callback)
    okay.call();
    console.log("File new");
  }
}

class FileSaveOp extends ToolOp {
  constructor(Boolean do_progress=true) {
    ToolOp.call(this, "save_file", "Save");

    this.do_progress = true;
    this.is_modal = false;
    
    this.undoflag = UndoFlags.IGNORE_UNDO;
    this.flag = ToolFlags.HIDE_TITLE_IN_LAST_BUTTONS;
    
    this.inputs = {};
  }

  exec(ctx) {
    console.log("File save");
    
    var mesh_data = g_app_state.create_user_file_new().buffer;
    
    /*I should really make these file operations modal, since
        they create ui elements
     */
    ctx = new Context();
    var pd = new ProgressDialog(ctx, "Uploading");
    
    function error(job, owner, msg) {
      pd.end()
      error_dialog(ctx, "Network Error", undefined, true);
    }
    
    function status(job, owner, status) {
      pd.value = status.progress;
      pd.bar.do_recalc();
      if (DEBUG.netio)
        console.log("status: ", status.progress);
    }
    
    function finish(job, owner) {
      pd.end();
      if (DEBUG.netio)
        console.log("finished uploading");
    }
    
    function save_callback(dialog, path) {
      pd.call(ctx.screen.mpos);
      if (DEBUG.netio)
        console.log("saving...", path);
      global allshape_file_ext;
      
      if (!path.endsWith(allshape_file_ext)) {
        path = path + allshape_file_ext;
      }
      
      var token = g_app_state.session.tokens.access;
      var url = "/api/files/upload/start?accessToken="+token+"&path="+path
      var url2 = "/api/files/upload?accessToken="+token;
      
      call_api(upload_file, {data:mesh_data, url:url, chunk_url:url2}, finish, error, status);
    }
      
    if (g_app_state.filepath != "") {
      save_callback(undefined, g_app_state.filepath);
    } else {
      file_dialog("SAVE", new Context(), save_callback);
    }
  }
}

var test_pd = undefined;
function test_progress_dialog() {
  global test_pd;
  
  var ctx = new Context();
  var pd = new ProgressDialog(ctx, "test", 0.2);
  
  pd.call(ctx.screen.mpos);
  
  test_pd = pd;
}

class ProgressDialog extends PackedDialog {
  constructor(Context ctx, String label, float val=0.0, float min=0.0, float max=1.0) {
    PackedDialog.call(this, label, ctx, ctx.screen);
    
    this.pos = [0,0];
    this.closed = false;
    
    this.flag = DialogFlags.MODAL;
    
    var col = this.subframe.col();   
    
    this.bar = new UIProgressBar(ctx, val, min, max);
    col.add(this.bar);
    
    //ensure the user sees the full progress bar,
    //even for quick actions
    this._full_ms = 0;
    this._do_end = false;
    this._end_flash = 150;
  }
  
  on_tick() {
    if (this._do_end && time_ms() - this._full_ms > this._end_flash) {
      prior(ProgressDialog, this).end.call(this, false);
    }
  }
  
  end(Boolean do_cancel) {
    if (this.bar.value >= this.bar.max) {
      this._full_ms = time_ms();
      this._do_end = true;
      this.bar.value = this.bar.max;
      this.bar.do_recalc();
    } else {
      prior(ProgressDialog, this).end.call(this, false);
    }
  }
  
  set value(float val) {
    if (val != this.bar.value)
      this.do_recalc();
    this.bar.set_value(val);
  }
  
  get value() {
    return this.bar.value;
  }
}

class LoginDialog extends PackedDialog {
  constructor(ctx) {
    PackedDialog.call(this, "User Login", ctx, ctx.screen);
    
    this.pos = [0,0];
    this.closed = false;
    
    this.flag = DialogFlags.MODAL;
    
    var col = this.subframe.col();
    col.add(Dialog.okay_button(ctx));
    col.add(Dialog.cancel_button(ctx));
    
    var session = g_app_state.session;
    
    this.userbox = new UITextBox(ctx, session.username, [0,0], [0,0]);
    this.passbox = new UITextBox(ctx, session.password, [0,0], [0,0]);
    this.errlabel = undefined;
    
    var col = this.subframe.col(undefined, PackFlags.INHERIT_WIDTH);
    var row = col.row();
    row.label("User:").color = uicolors["DialogText"];
    row.label("Password:").color = uicolors["DialogText"];
    
    row = col.row();
    row.add(this.userbox, PackFlags.INHERIT_WIDTH);
    row.add(this.passbox, PackFlags.INHERIT_WIDTH);
  }

  end(do_cancel) {
    var dialog = this;
    
    var session = g_app_state.session
    if (DEBUG.netio)
      console.log(session.tokens);
    
    if (do_cancel) {
      prior(LoginDialog, this).end.call(this, do_cancel);
      return;
    }
    
    function finish(job, owner) {
      if (dialog.closed)
        return;
      
      var session = g_app_state.session;
      
      if (DEBUG.netio)
        console.log(job.value, "1");
      
      session.tokens = job.value;
      session.is_logged_in = true;
      session.store();
      
      if (DEBUG.netio)
        console.log(job.value, "2");
      dialog.closed = true;
      prior(LoginDialog, dialog).end.call(dialog, false);
      
      g_app_state.session.validate_session();
    }
    
    function error(job, owner, msg) {
      if (dialog.errlabel == undefined) {
        dialog.errlabel = dialog.subframe.label("", undefined, PackFlags.INHERIT_WIDTH);
        dialog.errlabel.color = uicolors["DialogText"];
      }
      
      dialog.errlabel.set_text("Error");
      console.log(msg);
    }
    
    var user = this.userbox.text;
    var password = this.passbox.text;
    
    if (DEBUG.netio)
      console.log(user, password);
    
    var session = g_app_state.session;
    
    session.username = user;
    session.password = password;
    session.store();
    
    auth_session(user, password, finish, error);

    //prior(LoginDialog, this).end.call(this, do_cancel);
  }
}

function error_dialog(Context ctx, String msg, Function callback=undefined, Boolean center=false) {
  var pd = new ErrorDialog(msg, callback);
  
  var s = ctx.screen.size;
  var mpos = center ? [Math.floor(s[0]/2.0), Math.floor(s[1]/2.0)] : ctx.screen.mpos;
  
  pd.call(mpos);
  
  return pd;
}

function login_dialog(ctx)
{
  var ld = new LoginDialog(ctx);
  
  ld.call(new Vector2(ctx.screen.size).mulScalar(0.5).floor());  
}

class FileSaveSTLOp extends ToolOp {
  constructor() {
    ToolOp.call(this, "export_stl", "Export STL");
    
    this.is_modal = false;
    
    this.undoflag = UndoFlags.IGNORE_UNDO;
    this.flag = ToolFlags.HIDE_TITLE_IN_LAST_BUTTONS;
    
    this.inputs = {path : new StringProperty("", "path", "File Path", "File Path")};
  }
    
  exec(ctx) {
    console.log("Export STL");
    
    var mesh_data = export_stl_str(ctx.mesh).buffer;
    
    /*I should really make these file operations modal, since
        they create ui elements
     */
    ctx = new Context();
    var pd = new ProgressDialog(ctx, "Uploading");
    
    function error(job, owner, msg) {
      pd.end()
      error_dialog(ctx, "Network Error", undefined, true);
    }
    
    function status(job, owner, status) {
      pd.value = status.progress;
      pd.bar.do_recalc();
      
      if (DEBUG.netio)
        console.log("status: ", status.progress);
    }
    
    var this2 = this;
    function finish(job, owner) {
      if (DEBUG.netio)
        console.log("finished uploading");
      var url = "/api/files/get?path=/"+this2._path + "&";
      url += "accessToken="+g_app_state.session.tokens.access;
      
      if (DEBUG.netio)
        console.log(url)
      window.open(url);
      
      pd.end();
    }
    
    function save_callback(dialog, path) {
      pd.call(ctx.screen.mpos);
      
      if (DEBUG.netio)
        console.log("saving...", path);
      global allshape_file_ext;
      
      if (!path.endsWith(".stl")) {
        path = path + ".stl";
      }
      this2._path = path;
      
      var token = g_app_state.session.tokens.access;
      var url = "/api/files/upload/start?accessToken="+token+"&path="+path
      var url2 = "/api/files/upload?accessToken="+token;
      
      call_api(upload_file, {data:mesh_data, url:url, chunk_url:url2}, finish, error, status);
    }
    
    file_dialog("SAVE", new Context(), save_callback);
  }
}

class FileSaveB64Op extends ToolOp {
  constructor() {
    ToolOp.call(this, "export_al3_b64", "Export AL3-B64");
    
    this.is_modal = false;
    
    this.undoflag = UndoFlags.IGNORE_UNDO;
    this.flag = ToolFlags.HIDE_TITLE_IN_LAST_BUTTONS;
    
    this.inputs = {path : new StringProperty("", "path", "File Path", "File Path")};
  }
    
  exec(ctx) {
    console.log("Export AL3-B64");
    
    //compression is off, for now
    var buf = g_app_state.create_user_file_new({
      compress : true
    });
    buf = b64encode(new Uint8Array(buf.buffer));
    
    //line wrap
    var buf2 = ""
    for (var i=0; i<buf.length; i++) {
      buf2 += buf[i];
      if (((i+1)%79) == 0) {
        buf2 += "\n";
      }
    }
    buf = buf2;
    
    var byte_data = [];
    pack_static_string(byte_data, buf, buf.length);
    byte_data = new Uint8Array(byte_data).buffer;
    
    /*I should really make these file operations modal, since
        they create ui elements
     */
    ctx = new Context();
    var pd = new ProgressDialog(ctx, "Uploading");
    
    function error(job, owner, msg) {
      pd.end()
      error_dialog(ctx, "Network Error", undefined, true);
    }
    
    function status(job, owner, status) {
      pd.value = status.progress;
      pd.bar.do_recalc();
      if (DEBUG.netio)
        console.log("status: ", status.progress);
    }
    
    var this2 = this;
    function finish(job, owner) {
      if (DEBUG.netio)
        console.log("finished uploading");
      var url = "/api/files/get?path=/"+this2._path + "&";
      url += "accessToken="+g_app_state.session.tokens.access;
      
      if (DEBUG.netio)
        console.log(url)
      window.open(url);
      
      pd.end();
    }
    
    function save_callback(dialog, path) {
      pd.call(ctx.screen.mpos);
      
      if (DEBUG.netio)
        console.log("saving...", path);
      
      if (!path.endsWith(".al3.b64")) {
        path = path + ".al3.b64";
      }
      this2._path = path;
      
      var token = g_app_state.session.tokens.access;
      var url = "/api/files/upload/start?accessToken="+token+"&path="+path
      var url2 = "/api/files/upload?accessToken="+token;
      
      call_api(upload_file, {data:byte_data, url:url, chunk_url:url2}, finish, error, status);
    }
    
    file_dialog("SAVE", new Context(), save_callback);
  }
}
