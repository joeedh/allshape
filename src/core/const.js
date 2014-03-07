"use strict";

/* various constant (except for DEBUG) globals */

//file extension
var formacad_file_ext = ".al3";

//application version
var g_app_version = 0.04;

/*all selection bitflags flags must use this value, even if they define
  their own enumeration member, e.g. MeshFlags.SELECT*/
var SELECT = 1;

//release mode
var RELEASE = false;

//debug flags
var DEBUG = {
  modal : false, 
  datalib : false, 
  glext : false, //prints gl extensions to console on startup
  selbuf : false,
  transform : false,
  keyboard : false,
  modifier_keys : false,
  mouse : false,
  touch : false,
  mousemove : false,
  ui_datapaths : false,
  ui_menus : false,
  ui_canvas : false,
  Struct : false
};
