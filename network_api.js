#define EXPORT_FUNC(func)

NetStates = {NORMAL: 0, PUSHING: 1, FETCHING: 2};
StateStates = {OK : 1, ERROR: 2, WAITING: 3, DONE: 4};
StateFlags = {ERROR: 2, REMOVE: 4, KEEP: 8};
StateErrors = {NOERRORSET: 0, IO : 1, PERMISSIONS: 2, NOTEXIST: 3, INVALIDARGS: 4};

CmdTypes = {INVALID: 0, SAVE_MESH: 1, GET_DIR_INFO: 2, GET_FILE_INFO: 3, GET_FILE_META: 4}

function NetMessage(String msg, NetError errobj) {
  String.call(msg);
  this.errobj = errobj
}
inherit(NetMessage, String);
EXPORT_FUNC(NetMessage)

function NetError(code, msg) {
  this.msg = msg;
}
create_prototype(NetError);
EXPORT_FUNC(NetError)

NetError.prototype.toString = function() {
  return this.constructor.name + ":" + this.code + ":" + this.msg
}

function NetCommand(id) {
  this.id = id;
}
create_prototype(NetCommand);
EXPORT_FUNC(NetCommand)

NetCommand.prototype.process = function(ctx, state) {
}

NetCommand.prototype.pack = function(data) {
}

NetCommand.prototype.unpack = function(data, unpack_ctx) {
}

function NetState(id) {
  this.id = 0;
  this.flag = StateFlags
  this.errcode = 0;
  this.errobj = ""
  
  this.statequeue = new GArray();
  this.childstate = undefined;
  this.parent = undefined;
  this.packetqueue = new GArray();
  this.errhandlers = {}
}
create_prototype(NetState);
EXPORT_FUNC(NetState)


//error handle function prototype.
//if an error handler return true or undefined (i.e. nothing),
//the error is assumed to be handled.
//otherwise, the error is propegated up the state stack

function NetStateErrorFunc(exception, state);

NetState.prototype.add_error_handler = function(errcode, NetStateErrorFunc func)
{
  this.errhandlers[errcode] = func;
}

//errobj can be either StateError-derived object, 
//or a string
NetState.prototype.error = function(code, errobj) {
  if (!errobj instanceof String) {
    errobj = new NetError(code, errobj);
  }
  
  extramsg = errobj.msg;
  
  this.errcode = code;
  this.errobj = errobj;
  
  var handled = false;
  
  if (code in this.errhandlers) {
    handled = this.errhandlers[code](errobj, this);
    if (handled == undefined)
      handled = true;
  }
  
  if (!handled) {
    var parent = this.parent
    this.pop_this()
    
    if (parent != undefined) {
      parent.error(code, extramsg)
    }
  }
}

NetState.prototype.get_active = function() {
  var st = this;
  while (st.childstate != undefined) {
    st = st.childstate;
  }
  
  return st;
}

NetState.prototype.on_message = function(ctx, msg) {
}

NetState.prototype.process_cmd = function(ctx, msg) {
}

NetState.prototype.on_command = function(ctx, command) {
}

NetState.prototype.send_command = function(command) {
}

NetState.prototype.push_state = function(state) {
  state.parent = this;
  if (this.childstate == undefined) {
    this.childstate = state;
  } else {
    this.statequeue.push(state); 
  }
}

NetState.prototype.pop_state = function() {
  this.childstate = undefined;
  
  if (this.statequeue.length > 0) {
    this.childstate = this.statequeue.shift();
    this.childstate.parent = this;
    this.childstate.on_active();
  }
}

NetState.prototype.pop_this = function() {
  if (this.parent != undefined) {
    this.parent.pop_state();
  }
}

NetState.prototype.on_active = function() {
}

function NormalState() {
  NetState.call(this, NetStates.NORMAL);
}
