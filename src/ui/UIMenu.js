"use strict";

class UIMenuEntry extends UIElement{
  constructor(label, hotkey, pos, size) {
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

  on_mousedown(MouseEvent event) {
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

  on_mouseup(MouseEvent event) {
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

  build_draw(UICanvas canvas) {
    canvas.begin(this);
    
    var tsize = canvas.textsize(this.text, menu_text_size);
    var y = 0.5*(this.size[1]-tsize[1]);
    
    var textclr, hotclr;
    if (this.state & UIFlags.HIGHLIGHT) {
      //console.log(uicolors["MenuTextHigh"], "--=-=-=")
      canvas.simple_box([0, -2], [this.size[0]-3, this.size[1]], uicolors["MenuHighlight"], 35.0)
      textclr = hotclr = uicolors["MenuTextHigh"];
    } else {
      textclr = uicolors["MenuText"];
      hotclr = uicolors["HotkeyText"];
    }
    
    canvas.text([2, y], this.text, textclr, menu_text_size);
    if (this.hotkey != undefined) {
      var tsize = canvas.textsize(this.hotkey, menu_text_size);
      
      canvas.text([this.size[0]-tsize[0]-8, y], this.hotkey, hotclr, menu_text_size);
    }
    
    canvas.end(this);
  }

  get_min_size(UICanvas canvas, Boolean isvertical)
  {
    return [canvas.textsize(this.text, menu_text_size)[0]+4, 24]
  }
}

class UIMenu extends UIFrame {
  constructor(name, callback) {
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

  add_item(text, hotkey, id) {
    var en = new UIMenuEntry(text, hotkey, [0,0], [0,0]);
    
    en.close_on_right = this.close_on_right;
    en.i = this.children.length;
    if (id == undefined)
      id = en.id;
      
    this.idmap[en.i] = id;
    
    this.add(en);
    
    return en;
  }

  on_keydown(KeyboardEvent event) {
    if (event.keyCode == charmap["Enter"]) {
      if (this.active != undefined && this.active.constructor.name == UIMenuEntry.name) {
        this.active.callback(this.active);
      }
    } else if (event.keyCode == charmap["Escape"]) {
      this.end_menu();
    }
  }

  packmenu(canvas) {
    var maxwid=-1;
    var y = 0;
    
    var ehgt = IsMobile ? 45 : 25;
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
      maxwid = Math.max(canvas.textsize(st, menu_text_size)[0]+30, maxwid)
      hkey_line_pos = Math.max(canvas.textsize(c.label + "    ", menu_text_size)[0]+18, hkey_line_pos);
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

  end_menu() {
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

  on_mousedown(event) {
    if (!inrect_2d([event.x, event.y], [0, 0], this.size)) {
      this.end_menu();
    } else {
      UIFrame.prototype.on_mousedown.call(this, event);
    }
  }

  on_mousemove(event) {
    UIFrame.prototype.on_mousemove.call(this, event);
    
    /*the menu code is designed so that client users can insert
      hidden elements for, as an example, switching between menus on
      a menu bar.  theoretically, the client could also insert icon
      elements and the like.*/
    if (!inrect_2d([event.x, event.y], [-12, -100], [this.size[0]+12*2, this.size[1]+200])) {
      this.end_menu();
    }
  }

  build_draw(canvas, isvertical) {
    if (!this.packed) {
      this.packmenu(canvas);
      this.packed = true;
    }
    
    canvas.shadow_box([8, -1], [this.size[0]-10, this.size[1]-10]);
    canvas.simple_box([0, 0], this.size, uicolors["MenuBox"][0], 35.0);
    canvas.box_outline([0, 0], this.size, uicolors["MenuBorder"], 35.0);
    canvas.box([0, 0], this.size, uicolors["Box"], 35.0, true);
    canvas.text([24, this.size[1]-22], this.name, uicolors["MenuText"], menu_text_size)
    
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
      
      canvas.line([0, y+3, 0], [this.size[0], y+3, 0], clr, clr, 1);
      y += ehgt;
    }
    
    UIFrame.prototype.build_draw.call(this, canvas, true);
     
    y += 10;
    
    if (this.name != undefined && this.name != "")
      canvas.line([0, y, 0], [this.size[0], y, 0], clr, clr, 1);
    
    //canvas.line([20, 0, 0], [20, this.size[1], 0], uicolors["MenuSep"], undefined, 1);
    //if (this.hkey_line_pos != 0)
    //  canvas.line([this.hkey_line_pos, 0, 0], [this.hkey_line_pos, this.size[1], 0], uicolors["MenuSep"], undefined, 1);
  }
}

//is_menu_open is defined in RadialMenu.js

function ui_call_menu(menu, frame, pos, center=true, min_width=20)//center is optional, defaults to true
{
  console.log("menu call");
  
  var off = [pos[0], pos[1]];
  if (frame.parent != undefined)
    frame.parent.abs_transform(off);
  
  while (frame.parent != undefined) {
    frame = frame.parent;
  }
  off[0] -= frame.pos[0]; off[1] -= frame.pos[1];
  
  menu.closed = false;
  menu.minwidth = min_width
  
  console.log("menu frame", frame);
  canvas = frame.canvas; //get_canvas();
  menu.canvas = canvas;
  menu.do_recalc();
  menu.packmenu(canvas);
  
  if (center) {
    off[0] -= menu.size[0]/3
    off[1] -= menu.size[1]/3
  }
  
  menu.pos[0] = off[0];
  menu.pos[1] = off[1];
  
  menu.call_time = time_ms()
  menu.last_active = frame.active
  
  console.log("menu call");
  frame.add(menu);
  frame.push_modal(menu);
  //frame._on_mousemove({"x": pos[0]-frame.pos[0], "y":pos[1]-frame.pos[1]})
}

function toolop_menu(ctx, name, oplist) {
  var oplist_instance = []
  
  function op_callback(entry, id) {
    var op = oplist_instance[id];
    
    if (op.flag & ToolFlags.USE_DEFAULT_INPUT)
      g_app_state.toolstack.default_inputs(new Context(), op);
    
    ctx.toolstack.exec_tool(op);
  }
  
  var menu = new UIMenu(name, op_callback);
  for (var i=0; i<oplist.length; i++) {
    var opstr = oplist[i];
    var op = opstr;
    var add_sep = (i > 1 && oplist[i-1] == "sep");
    
    if (oplist[i] == "sep") {
      continue;
    }

    if (typeof opstr == "string") {
      op = ctx.api.get_op(ctx, opstr);
    }
    
    if (op == undefined)
      continue;
    
    var hotkey;
    hotkey = ctx.api.get_op_keyhandler(ctx, opstr);
    
    if (DEBUG.ui_menus)
      console.log("---------", hotkey, opstr, ctx.screen)
    
    if (hotkey != undefined)
      hotkey = hotkey.build_str(true);
    else
      hotkey = ""
      
    oplist_instance.push(op);
    
    var en = menu.add_item(op.uiname, hotkey, oplist_instance.length-1);
    en.add_sep = add_sep;
  }
  
  return menu;
}