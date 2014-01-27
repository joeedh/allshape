global PackedDialog;

FileDialogModes = {OPEN: "Open", SAVE: "Save"}

function FileDialog(mode, ctx, callback)
{
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
inherit(FileDialog, PackedDialog);

FileDialog.prototype.populate = function() {
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

FileDialog.prototype.entry_clicked = function(text, id) {
  if (!id.is_dir) {
    this.textbox.set_text(text);
  }
}

var fdialog_exclude_chars = new set([
  "*",
  "\\",
  ";",
  ":",
  "&",
  "^"
]);

FileDialog.prototype.end = function(do_cancel) {
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

function file_dialog(mode, ctx, callback)
{
  console.log(ctx, ctx.screen);
  fd = new FileDialog(mode, ctx, callback);
  fd.call(ctx.screen.mpos);  
}
  
function FileOpenOp()
{
  ToolOp.call(this);
  this.name = "open_file";
  this.uiname = "Open";
  
  this.is_modal = false;
  
  this.undoflag = UndoFlags.IGNORE_UNDO;
  this.flag = ToolFlags.HIDE_TITLE_IN_LAST_BUTTONS;
  
  this.inputs = {path : new StringProperty("", "path", "File Path", "File Path")};
}
inherit(FileOpenOp, ToolOp);

FileOpenOp.prototype.exec = function(ctx)
{
  console.log("File save");
  
  var mesh_data = []
  
  ctx.mesh.pack(mesh_data);
  mesh_data = ctx.appstate.create_user_file().buffer;
  
  function error(job, owner, msg) {
    console.log("network error", msg);
  }
  
  function status(job, owner, status) {
    console.log("status: ", status.progress, status);
  }
  
  function open_callback(dialog, path) {
    console.log("loading...", path);
    
    function finish(job, owner) {
      g_app_state.load_user_file(new DataView(job.value));
      g_app_state.filepath = path;
      console.log("finished downloading");
    }
    
    call_api(get_file_data, {path:path}, finish, error, status);
  }
  
  console.log("File open");
  file_dialog("OPEN", ctx, open_callback);
}
  
function FileSaveAsOp()
{
  ToolOp.call(this);
  this.name = "save_file_as";
  this.uiname = "Save As";
  
  this.is_modal = false;
  
  this.undoflag = UndoFlags.IGNORE_UNDO;
  this.flag = ToolFlags.HIDE_TITLE_IN_LAST_BUTTONS;
  
  this.inputs = {path : new StringProperty("", "path", "File Path", "File Path")};
}
inherit(FileSaveAsOp, ToolOp);

FileSaveAsOp.prototype.exec = function(ctx)
{
  console.log("File save");
  
  var mesh_data = []
  
  ctx.mesh.pack(mesh_data);
  mesh_data = ctx.appstate.create_user_file().buffer;
  
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
    global formacad_file_ext;
    
    if (!path.endsWith(formacad_file_ext)) {
      path = path + formacad_file_ext;
    }
    
    call_api(upload_file, {path:path, data:mesh_data}, finish, error, status);
  }
  
  file_dialog("SAVE", ctx, save_callback);
}

function FileSaveOp()
{
  ToolOp.call(this);
  this.name = "save_file";
  this.uiname = "Save";
  
  this.is_modal = false;
  
  this.undoflag = UndoFlags.IGNORE_UNDO;
  this.flag = ToolFlags.HIDE_TITLE_IN_LAST_BUTTONS;
  
  this.inputs = {};
}
inherit(FileSaveOp, ToolOp);

FileSaveOp.prototype.exec = function(ctx)
{
  console.log("File save");
  
  var mesh_data = []
  
  ctx.mesh.pack(mesh_data);
  mesh_data = ctx.appstate.create_user_file().buffer;
  
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
    global formacad_file_ext;
    
    if (!path.endsWith(formacad_file_ext)) {
      path = path + formacad_file_ext;
    }
    
    call_api(upload_file, {path:path, data:mesh_data}, finish, error, status);
  }
    
  if (g_app_state.filepath != "") {
    save_callback(undefined, g_app_state.filepath);
  } else {
    file_dialog("SAVE", ctx, save_callback);
  }
}

function LoginDialog(ctx)
{
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

inherit(LoginDialog, PackedDialog);

LoginDialog.prototype.end = function(do_cancel) {
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
  
  password = CryptoJS.enc.Base64.stringify(CryptoJS.SHA1(password))
  
  console.log(user, password);
  
  var session = g_app_state.session;
  
  session.username = user;
  session.password = password;
  session.store();
  
  auth_session(user, password, finish, error);

  //prior(LoginDialog, this).end.call(this, do_cancel);
}

function login_dialog(ctx)
{
  ld = new LoginDialog(ctx);
  ld.call(new Vector2(ctx.screen.size).mulScalar(0.5).floor());  
}