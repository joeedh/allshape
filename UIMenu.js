function UIMenuEntry(label, hotkey, pos, size) {
  UIElement.call(this);
  
  this.clicked = false;
  this.label = label
  this.text = ""
  this.pos = pos
  this.hotkey = hotkey
  this.size = size
  this.i = 0
  this.callback = undefined;
  this.add_sep = false;
  this.packed = false;
}
inherit(UIMenuEntry, UIElement);

UIMenuEntry.prototype.on_mousedown = function(MouseEvent event) {
  if ((event.button == 0 || (event.button==2&&this.parent.close_on_right)) && !this.clicked) {
    this.clicked = true;
    this.do_recalc();
    
    if (inrect_2d([event.x, event.y], [0,0], this.size)) {
      if (this.callback != undefined) {
        this.callback(this);
      }
    }
    
  }  
}

UIMenuEntry.prototype.on_mouseup = function(MouseEvent event) {
  if (event.button == 0 || (event.button==2&&this.parent.close_on_right)) {
    this.clicked = false;
    this.do_recalc();
    
    if (inrect_2d([event.x, event.y], [0,0], this.size)) {
      if (this.callback != undefined) {
        this.callback(this);
      }
    }
  }  
}

UIMenuEntry.prototype.build_draw = function(UICanvas canvas) {
  canvas.begin(this);
  
  if (this.state & UIFlags.HIGHLIGHT)
    canvas.simple_box([0, -2], [this.size[0]-3, this.size[1]], uicolors["MenuHighlight"], 35.0)
  
  canvas.text([2, 2], this.text, uicolors["BoxText"]);
  if (this.hotkey != undefined) {
    var twid = canvas.textsize(this.hotkey)[0];
    
    canvas.text([this.size[0]-twid-8, 2], this.hotkey, uicolors["HotkeyText"]);      
  }
  
  canvas.end(this);
}

UIMenuEntry.prototype.get_min_size = function(UICanvas canvas, Boolean isvertical)
{
  return [canvas.textsize(this.text)[0]+4, 24]
}

function UIMenu(name, callback) {
  UIFrame.call(this);
  
  this.name = name
  this.callback = callback;
  this.idmap = {}
  this.closed = false;
  this.chosen_id = undefined : String;
  this.minwidth = undefined : int;
  this.hkey_line_pos = 0;
  this.close_on_right = false;
  this.call_time = 0;
  this.last_active = undefined;
  this.ignore_next_mouseup = undefined : int;
}

inherit(UIMenu, UIFrame)

UIMenu.prototype.add_item = function(text, hotkey, id) 
{
  var en = new UIMenuEntry(text, hotkey, [0,0], [0,0]);
  
  en.close_on_right = this.close_on_right;
  en.i = this.children.length;
  if (id == undefined)
    id = en.id;
    
  this.idmap[en.i] = id;
  
  this.add(en);
}

UIMenu.prototype.on_keydown = function(KeyboardEvent event) {
  if (event.keyCode == charmap["Enter"]) {
    if (this.active != undefined && this.active.constructor.name == UIMenuEntry.name) {
      this.active.callback(this.active);
    }
  } else if (event.keyCode == charmap["Escape"]) {
    this.end_menu();
  }
}

UIMenu.prototype.packmenu = function(canvas)
{
  var maxwid=-1;
  var y = 0;
  
  var ehgt = 25
  var padx = 2
  
  this.ehgt = ehgt
  
  var this2 = this;
  function menu_callback(e) {
    if (this2.closed) return;

    this2.end_menu();
    
    if (this2.callback != undefined) {
      this2.chosen_id = this2.idmap[e.i];
      this2.callback(e, this2.idmap[e.i]);
    }
  }
    
  for (var c in this.children) {
    if (c.constructor.name != "UIMenuEntry") continue; //there may be other elements present
    
    c.callback = menu_callback;
  }
  
  if (this.name != undefined && this.name != "")
    y = ehgt+15;
  else
    y = 5;
    
  var maxcol = 0
  var hkey_line_pos = 0
  for (var c in this.children) {
    if (c.constructor.name != "UIMenuEntry") continue; //there may be other elements present
    
    var st = c.label + "    " + c.hotkey;
    maxwid = Math.max(canvas.textsize(st)[0]+30, maxwid)
    hkey_line_pos = Math.max(canvas.textsize(c.label + "    ")[0]+18, hkey_line_pos);
    maxcol = Math.max(st.length, maxcol)
    y += ehgt;
  }
  
  this.hkey_line_pos = hkey_line_pos;
  
  if (this.minwidth != undefined) 
    maxwid = Math.max(this.minwidth, maxwid);
  
  this.size = [maxwid, y]
  
  y = 5
  for (var c in this.children) {
    if (c.constructor.name != "UIMenuEntry") continue; //there may be other elements present
    
    c.text = "    " + c.label
    var col = Math.abs(maxcol - c.text.length - c.hotkey.length)
    
    c.pos[1] = y
    c.pos[0] = padx
    c.size[0] = maxwid
    c.size[1] = ehgt
    y += ehgt;
  }
}

UIMenu.prototype.end_menu = function()
{
  if (!this.closed) {
    this.closed = true;
    this.pop_modal();
    this.parent.remove(this);
    this.parent.do_recalc();
    
    if (this.parent.active == this)
      this.parent.active = this.last_active;
    
    if (this.ignore_next_mouseup_event != undefined) {
      ignore_next_mouseup_event(this.ignore_next_mouseup_event);
    }
  }
}

UIMenu.prototype.on_mousedown = function(event)
{
  if (!inrect_2d([event.x, event.y], [0, 0], this.size)) {
    this.end_menu();
  } else {
    UIFrame.prototype.on_mousedown.call(this, event);
  }
}


UIMenu.prototype.on_mousemove = function(event)
{
  UIFrame.prototype.on_mousemove.call(this, event);
  
  /*the menu code is designed so that client users can insert
    hidden elements for, as an example, switching between menus on
    a menu bar.  theoretically, the client could also insert icon
    elements and the like.*/
  if (!inrect_2d([event.x, event.y], [-12, -100], [this.size[0]+12*2, this.size[1]+200])) {
    this.end_menu();
  }
}

UIMenu.prototype.build_draw = function(canvas, isvertical) 
{
  canvas.begin(this);
  
  if (!this.packed) {
    this.packmenu(canvas);
    this.packed = true;
  }
  
  canvas.simple_box([0, 0], this.size, uicolors["MenuBox"][0], 35.0);
  canvas.text([24, this.size[1]-22], this.name, uicolors["BoxText"])
  
  UIFrame.prototype.build_draw.call(this, canvas, true);
  
  var clr = uicolors["MenuSep"]
  var ehgt = this.ehgt
  y = ehgt+2
  
  for (var i=1; i<this.children.length; i++) {
    var c = this.children[i]
    
    if (c.constructor.name != UIMenuEntry.name) continue; //there may be other elements present
    
    if (!c.add_sep) {
      y += ehgt;
      continue;
    }
    
    canvas.line([0, y, 0], [this.size[0], y, 0], clr, clr, 1);
    y += ehgt;
  }
  
  y += 10;
  
  if (this.name != undefined && this.name != "")
    canvas.line([0, y, 0], [this.size[0], y, 0], clr, clr, 1);
  
  canvas.line([20, 0, 0], [20, this.size[1], 0], uicolors["MenuSep"], undefined, 1);
  if (this.hkey_line_pos != 0)
    canvas.line([this.hkey_line_pos, 0, 0], [this.hkey_line_pos, this.size[1], 0], uicolors["MenuSep"], undefined, 1);
  
  canvas.end(this);
}

//is_menu_open is defined in RadialMenu.js

function ui_call_menu(menu, frame, pos, center, min_width)//center is optional, defaults to true
{
  var off = [pos[0], pos[1]];
  
  if (center == undefined) {
    center = true;
  }
  
  while (frame.parent != undefined) {
    frame = frame.parent;
    off[0] += frame.pos[0]; off[1] += frame.pos[1]
  }
  
  off[0] -= frame.pos[0]; off[1] -= frame.pos[1];
  
  menu.closed = false;
  menu.minwidth = min_width
  
  menu.canvas = frame.get_canvas();
  menu.do_recalc();
  menu.packmenu(frame.get_canvas());
  
  if (center) {
    off[0] -= menu.size[0]/3
    off[1] -= menu.size[1]/3
  }
  
  menu.pos[0] = off[0];
  menu.pos[1] = off[1];
  
  menu.call_time = time_ms()
  menu.last_active = frame.active
  
  frame.add(menu);
  frame.push_modal(menu);
  frame._on_mousemove({"x": pos[0]-frame.pos[0], "y":pos[1]-frame.pos[1]})
}

function toolop_menu(ctx, name, oplist) {
  var oplist_instance = []
  
  function op_callback(entry, id) {
    ctx.toolstack.exec_tool(oplist_instance[id]);
  }
  
  var menu = new UIMenu(name, op_callback);
  for (var i=0; i<oplist.length; i++) {
    var opstr = oplist[i];
    var op = opstr;
    
    if (typeof opstr == "string") {
      op = ctx.api.get_op(ctx, opstr);
    }
    
    if (op == undefined)
      continue;
    
    var hotkey;
    hotkey = ctx.api.get_op_keyhandler(ctx, opstr);
    
    if (ctx.screen == null)
      ctx.screen = ctx.screen;
      
    console.log("---------", hotkey, opstr, ctx.screen)
    
    if (hotkey != undefined)
      hotkey = hotkey.build_str(true);
    else
      hotkey = ""
      
    oplist_instance.push(op);
    menu.add_item(op.uiname, hotkey, oplist_instance.length-1);
  }
  
  return menu;
}