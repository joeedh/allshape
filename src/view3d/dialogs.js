global PackedDialog;

FileDialogModes = {OPEN: "Open", SAVE: "Save"}

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

    this.pos = [0,0];

    this.flag = DialogFlags.MODAL;
    this.callback = callback;

    var col = this.subframe.col();
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
    
    function error(job, owner, msg) {
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
  console.log(ctx, ctx.screen);
  fd = new FileDialog(mode, ctx, callback);
  fd.call(ctx.screen.mpos);  
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
    
    function error(job, owner, msg) {
      console.log("network error", msg);
    }
    
    function status(job, owner, status) {
      console.log("status: ", status.progress, status);
    }
    
    function open_callback(dialog, path) {
      console.log("loading...", path);
      
      function finish(job, owner) {
        g_app_state.load_user_file_new(new DataView(job.value));
        g_app_state.filepath = path;
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
    
    mesh_data = g_app_state.create_user_file_new().buffer;
    function error(job, owner, msg) {
      console.log("network error", msg);
    }
    
    function finish(job, owner) {
      console.log("finished uploading");
    }
    
    function status(job, owner, status) {
      console.log("status: ", status.progress, status);
    }
    
    function save_callback(dialog, path) {
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
  constructor() {
    ToolOp.call(this, "save_file", "Save");

    this.is_modal = false;
    
    this.undoflag = UndoFlags.IGNORE_UNDO;
    this.flag = ToolFlags.HIDE_TITLE_IN_LAST_BUTTONS;
    
    this.inputs = {};
  }

  exec(ctx) {
    console.log("File save");
    
    mesh_data = g_app_state.create_user_file_new().buffer;
    
    function error(job, owner, msg) {
      console.log("network error", msg);
    }
    
    function finish(job, owner) {
      console.log("finished uploading");
    }
    
    function status(job, owner, status) {
      console.log("status: ", status.progress, status);
    }
    
    function save_callback(dialog, path) {
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
    row.label("User:")
    row.label("Password:")
    
    row = col.row();
    row.add(this.userbox, PackFlags.INHERIT_WIDTH);
    row.add(this.passbox, PackFlags.INHERIT_WIDTH);
  }

  end(do_cancel) {
    var dialog = this;
    
    var session = g_app_state.session
    console.log(session.tokens);
    
    if (do_cancel) {
      prior(LoginDialog, this).end.call(this, do_cancel);
      return;
    }
    
    function finish(job, owner) {
      if (dialog.closed)
        return;
      
      var session = g_app_state.session;
      
      console.log(job.value, "----------");
      session.tokens = job.value;
      session.is_logged_in = true;
      session.store();
      
      console.log(job.value);
      dialog.closed = true;
      prior(LoginDialog, dialog).end.call(dialog, false);
      
      g_app_state.session.validate_session();
    }
    
    function error(job, owner, msg) {
      if (dialog.errlabel == undefined) {
        dialog.errlabel = dialog.subframe.label("", undefined, PackFlags.INHERIT_WIDTH);
      }
      
      dialog.errlabel.set_text("Error");
      console.log(msg);
    }
    
    var user = this.userbox.text;
    var password = this.passbox.text;
    
    console.log(user, password);
    
    var session = g_app_state.session;
    
    session.username = user;
    session.password = password;
    session.store();
    
    auth_session(user, password, finish, error);

    //prior(LoginDialog, this).end.call(this, do_cancel);
  }
}

function login_dialog(ctx)
{
  ld = new LoginDialog(ctx);
  //XXX
  //ld.call(new Vector2(ctx.screen.size).mulScalar(0.5).floor());  
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
    
    mesh_data = export_stl_str(ctx.mesh).buffer;
    
    function error(job, owner, msg) {
      console.log("network error", msg);
    }
    
    var this2 = this;
    function finish(job, owner) {
      console.log("finished uploading");
      var url = "/api/files/get?path=/"+this2._path + "&";
      url += "accessToken="+g_app_state.session.tokens.access;
      
      console.log(url)
      window.open(url);
    }
    
    function status(job, owner, status) {
      console.log("status: ", status.progress, status);
    }
    
    function save_callback(dialog, path) {
      console.log("saving...", path);
      global allshape_file_ext;
      
      this2._path = path;
      if (!path.endsWith(".stl")) {
        path = path + ".stl";
      }
      
      var token = g_app_state.session.tokens.access;
      var url = "/api/files/upload/start?accessToken="+token+"&path="+path
      var url2 = "/api/files/upload?accessToken="+token;
      
      call_api(upload_file, {data:mesh_data, url:url, chunk_url:url2}, finish, error, status);
    }
    
    file_dialog("SAVE", new Context(), save_callback);
  }
}
