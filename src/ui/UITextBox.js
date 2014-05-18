"use strict";

#include "src/core/utildefine.js"

class UITextBox extends UIElement {
  constructor(ctx, text="", pos=undefined, size=undefined, path=undefined) {
    UIElement.call(this, ctx, path);
    
    this.on_end_edit = undefined;
    
    if (pos != undefined) {
      this.pos[0] = pos[0];
      this.pos[1] = pos[1];
    }
    if (size != undefined) {
      this.size[0] = size[0];
      this.size[1] = size[1];
    }
    
    this.prop = undefined;
    this.text = text
    this.start_text = text;
    this.min_width = 110;
    
    if (this.state & UIFlags.USE_PATH) {
      this.prop = ctx.api.get_prop_meta(ctx, this.data_path);
      this.val = this.prop.data;
      this.text = this.prop.uiname + ": "
    }
    
    this.selecting = false;
    this.cur_sel_i = 0; //index in this.sel that corresponds to the cursor
    this.sel = [0, 0];
    this.selcursor = 0; //selcursor is the current location of the mouse within text
    this.cursor = 0;
    this.last_cursor = 0;
    this.clicked = false;
    this.callback = undefined;
    this.text_offx = 13;
    this.text_min_offx = 13;
    this.replace_mode = false;
    this.editing = false;
    this.gmap = undefined : Array<int>; //x positions of each character in .text
    
    this.cancel_on_escape = false;
    this.mpos = [0,0];
    this.last_mpos = [0,0];
  }

  set_text(text) {
    if (this.text != text)
      this.do_recalc();
      
    this.text = text;
  }

  on_tick() {
    if (!this.clicked && (this.state & UIFlags.USE_PATH)) {
      var val = this.get_prop_data();
      if (val != this.text) {
        this.text = val == undefined ? val : "";
        this.do_recalc();
      }
    }
    
    if (this.clicked && this.cursor != this.last_cursor) {
      this.do_recalc();
      this.last_cursor = this.cursor;
    }
  }

  on_mousedown(MouseEvent event) {
    this.mpos = [event.x, event.y]
    
    if (event.button == 0) {
      if (this.clicked == false) {
        this.begin_edit(event);
        this.selecting = true;
      } else if (!this.selecting && !inrect_2d([event.x, event.y], [0, 0], this.size)) {
        this.end_edit(false);
      } else {
        this.selecting = true;
        this.cursor = this.selcursor;
        this.set_cursor();
        if (!event.shiftKey) {
          this.sel = [this.cursor, this.cursor];
        } else {
          this.handle_selecting();
        }
      }
    }
  }

  on_mouseup(MouseEvent event) {
    this.mpos = [event.x, event.y]
    
    if (this.clicked && this.selecting) {
      this.selecting = false;
      this.do_recalc();
    }
  }

  handle_selecting() {
    var cur = this.selcursor;
    
    if (cur < this.sel[0] && this.cur_sel_i == 1) {
      this.sel[1] = this.sel[0];
      this.cur_sel_i = 0;
    } else if (cur > this.sel[1] && this.cur_sel_i == 0) {
      this.cur_sel_i = 1;
    }
    
    this.sel[this.cur_sel_i] = cur;
    this.cursor = cur;
    this.set_cursor();
  }


  on_mousemove(MouseEvent event) {
    this.mpos = [event.x, event.y]
    if (!this.clicked) return;
    
    if (inrect_2d(this.last_mpos, [-10, -10], [this.size[0]+20, this.size[1]+20]) !=
        inrect_2d(this.mpos, [-10, -10], [this.size[0]+20, this.size[1]+20])) 
    {
      this.do_recalc();
    }
    
    if (inrect_2d([event.x, event.y], [-10, -10], [this.size[0]+20, this.size[1]+20])) {
      this.find_selcursor(event);
    }
    
    if (this.selecting) {
      this.handle_selecting();
    }
    
    this.last_mpos = [this.mpos[0], this.mpos[1]];
  }

  begin_edit(event) {
    if (this.editing) {
      console.trace("Invalid UITextBox.begin_edit() call");
      this.end_edit();
      return;
    }
    
    console.log("begin textbox edit");
    this.do_recalc();
    this.editing = true;
    
    this.push_modal();
    this.start_text = new String(this.text);
    this.gen_glyphmap();
    this.do_recalc();
    
    if (event != undefined) {
      this.find_selcursor(event);
    } else {
      this.selcursor = 0;
      //this.find_selcursor(new MyMouseEvent(x, y, 0, MyMouseEvent.MOUSEMOVE));
    }
    
    this.cursor = this.selcursor;
    this.sel = [0, this.text.length];
    this.clicked = true;
    
    var this2 = this;
    function end_edit() {
      this2.end_edit(false, false);
    }
    
    open_mobile_keyboard(this, end_edit);
  }

  end_edit(Boolean cancel=false, Boolean close_keyboard=true) {
    this.editing = false;
    
    if (cancel) {
      this.text = this.start_text;
    }
    
    this.clicked = false;
    this.pop_modal();
    this.do_recalc();
    this.selecting = false;
    this.state &= ~UIFlags.HIGHLIGHT;
    this.text_offx = this.text_min_offx;
    
    if (this.callback) {
      this.callback(this, this.text);
    }
    
    if  (this.state & UIFlags.USE_PATH) {
      this.set_prop_data(this.text);
    }
    
    if (close_keyboard)
      close_mobile_keyboard()
    
    if (this.on_end_edit)
      this.on_end_edit(this, cancel);
  }

  set_cursor() {
    this.cursor = Math.max(Math.min(this.cursor, this.text.length), 0);
    
    if (this.clicked && this.cursor != this.last_cursor) {
      this.do_recalc();
      this.last_cursor = this.cursor;
      
      var pad1 = this.text_min_offx;
      var pad2 = 28;
      
      if (this.gmap[this.cursor] > this.size[0]-pad2) {
        this.text_offx += this.size[0]-pad2-this.gmap[this.cursor];
        this.gen_glyphmap();
      } else if (this.gmap[this.cursor] < pad1) {
        this.text_offx += pad1-this.gmap[this.cursor];
        this.gen_glyphmap();
      }
    }
  }

  insert(text) {
    if (this.has_sel()) {
      var text2 = this.text.slice(0, this.sel[0]) + text + this.text.slice(this.sel[1], this.text.length);
      this.replace_text(text2);
      this.cursor = this.sel[0] + text.length;
      this.sel = [0,0];
    } else {
      var text2 = this.text.slice(0, this.cursor) + text + this.text.slice(this.cursor, this.text.length);
      this.replace_text(text2);
      
      this.cursor += text.length;
    }
  }

  delcmd(dir) {
    if (this.has_sel()) {
      this.insert("");
    } else {
      if (this.cursor+dir >= 0 && this.cursor+dir <= this.text.length) {
        var text2;
        
        if (dir > 0) {
          text2 = this.text.slice(0, this.cursor) + this.text.slice(this.cursor+1, this.text.length);
        } else {
          text2 = this.text.slice(0, this.cursor-1) + this.text.slice(this.cursor, this.text.length);
          this.cursor -= 1;
          this.set_cursor();
        }
        this.replace_text(text2);
      }
    }
    
    this.set_cursor();
  }

  find_next_textbox() {
    var p = this.parent;
    
    while (p != undefined) {
      //break at appropriate window boundary
      if (p instanceof Area || p instanceof Dialog) {
        break;
      }
      
      p = p.parent;
    }
    
    var root = p;
    
    p = this.parent;
    var i = this.parent.children.indexOf(this);
    var c = this;
    
    function find_textbox(e, exclude) {
      if (e instanceof UITextBox && e != exclude) 
        return e;
      
      if (e instanceof UIFrame) {
        for (var c in e.children) {
          var ret = find_textbox(c, exclude);
          if (ret != undefined)
            return ret;
        }
      }
    }
    
    var next;
    do {
      next = find_textbox(c, this);
      if (next)
        break;
      
      p = p.parent;
      c = c.parent;
      i = p.children.indexOf(c);
    } while (p != root);
    if (!next) {
      next = find_textbox(root, this);
    }
    
    if (!next) {
      console.log("Error in find_next_textbox()");
      this.end_edit();
      return;
    }
    
    if (next == this) {
      this.end_edit();
      return;
    }
    
    this.end_edit();
    next.begin_edit();
  }

  on_charcode(KeyboardEvent event) {
    this.insert(event["char"]);
  }

  on_textinput(ObjectMap event) {
    console.log("text input", event);
    
    //if (IsMobile)
    //  this.replace_text(event.text);
  }
  
  on_keydown(KeyboardEvent event) {
    var this2 = this;
    
    function start_sel() {
      if (!this2.has_sel()) {
        this2.sel[0] = this2.sel[1] = this2.cursor;
      }
    }
    
    if (event.keyCode == charmap["Enter"]) {
      this.end_edit();
    } else if (event.keyCode == charmap["Escape"]) {
      this.end_edit(this.cancel_on_escape);
    } else if (event.keyCode == charmap["Left"]) {
      start_sel();
      
      this.cursor -= 1;
      this.set_cursor();
      
      if (event.shiftKey) {
        this.selcursor = this.cursor;
        this.handle_selecting();
      } else {
        this.sel = [0, 0];
      }
    } else if (event.keyCode == charmap["Right"]) {
      start_sel();
      
      this.cursor += 1;
      this.selcursor = this.cursor;
      this.set_cursor();
      
      if (event.shiftKey) {
        this.selcursor = this.cursor;
        this.handle_selecting();
      } else {
        this.sel = [0, 0];
      }
    } else if (event.keyCode == charmap["Insert"]) {
      this.replace_mode ^= true;
      this.do_recalc();
    } else if (event.keyCode == charmap["Delete"]) {
      this.delcmd(1);
    } else if (event.keyCode == charmap["Backspace"]) {
      this.delcmd(-1);
    } else if (event.keyCode == charmap["A"] && event.ctrlKey && !event.shiftKey && !event.altKey) {
      this.sel = [0, this.text.length];
      this.do_recalc();
    } else if (event.keyCode == charmap["Home"]) {
      start_sel();
      
      this.cursor = 0;
      this.selcursor = this.cursor;
      this.set_cursor();
      
      if (event.shiftKey) {
        this.selcursor = this.cursor;
        this.handle_selecting();
      } else {
        this.sel = [0, 0];
      }
    } else if (event.keyCode == charmap["End"]) {
      start_sel();
      
      this.cursor = this.text.length;
      this.selcursor = this.cursor;
      this.set_cursor();
      
      if (event.shiftKey) {
        this.selcursor = this.cursor;
        this.handle_selecting();
      } else {
        this.sel = [0, 0];
      }
    } else if (event.keyCode == charmap["Tab"]) {
      this.find_next_textbox();
    }
  }

  find_selcursor(MouseEvent event) {
    var gmap = this.gmap;
    var selcursor=0;
    
    if (event.x <= gmap[0]) {
      selcursor = 0;
    } else if (event.x >= gmap[gmap.length-1]) {
      selcursor = this.text.length;
    } else {
      for (var i=0; i<gmap.length-1; i++) {
        if (event.x >= gmap[i] && event.x <= gmap[i+1]) {
          selcursor = i;
          break;
        }
      }
    }
    
    if (selcursor != this.selcursor) {
      this.selcursor = selcursor;
      this.do_recalc();
    }
  }

  replace_text(text) {
    this.text = text;
    
    this.gen_glyphmap();
    this.set_cursor();
    
    //clamp selcursor
    this.selcursor = Math.min(Math.max(0, this.selcursor), this.text.length);
    this.do_recalc();
  }
  has_sel() {
    return this.sel[1]-this.sel[0] > 0;
  }

  gen_glyphmap() {
    this.gmap = [];
    var gmap = this.gmap;
    
    function calc_callback(Array<float> vrect, Array<float> trect) {
      gmap.push(Math.min(vrect[0], trect[0]));
    }
    
    this.ctx.font.calc_string(this.text, calc_callback);
    gmap.push(this.ctx.font.calcsize(this.text)[0]);
    
    this.text_offx = Math.min(this.text_offx, gmap[gmap.length-1]);
    
    for (var i=0; i<gmap.length; i++) {
      gmap[i] = Math.floor(gmap[i]) + this.text_offx;
    }
  }

  build_draw(UICanvas canvas) {
    var tsize = canvas.textsize(this.text);
    
    canvas.begin(this);

    if (this.clicked) 
      canvas.invbox([0, 0], this.size, uicolors["TextBoxInv"], 16);
    else if (this.state & UIFlags.HIGHLIGHT)
      canvas.box([0, 0], this.size, uicolors["TextBoxHighlight"], 16)
    else {
      canvas.box([0, 0], this.size, uicolors["TextBoxInv"], 16);
    }
    
    canvas.push_scissor([0, 0], this.size);
    
    if (this.clicked && this.has_sel()) {
      var x1 = this.gmap[this.sel[0]];
      var x2 = this.gmap[this.sel[1]];
      
      canvas.simple_box([x1, 0], [x2-x1, this.size[1]], uicolors["TextSelect"], 100);
    }
    
    //canvas.push_scissor([this.text_min_offx-4, 0], [this.size[0]-4, this.size[1]]);
    canvas.text([this.text_offx, (this.size[1]-tsize[1])*0.25], this.text, uicolors["DefaultText"]);
    //canvas.pop_scissor();
    
    if (this.clicked) {
      if (inrect_2d(this.mpos, [-10,-10], [this.size[0]+20, this.size[1]+20])) {
        if (!this.has_sel() || (this.selcursor < this.sel[0] || this.selcursor > this.sel[1])) {
          var x = this.gmap[this.selcursor];
          if (x == undefined)
            x = 0;
          
          //console.log(x, 0, this.size[1], uicolors["HighlightCursor"]);
          //canvas.pop_scissor();
          //canvas.end(this);
          //return;
          
          canvas.line([x, 0], [x, this.size[1]], uicolors["HighlightCursor"], undefined, 2.0);
        }
      }
    
    //canvas.pop_scissor();
    //canvas.end(this);
    //return;
    
    if (!this.has_sel()) {
        var x = this.gmap[this.cursor];
        var w = this.replace_mode ? 4.0 : 2.0;
        
        if (x != undefined &&  w != undefined) {
          canvas.line([x, 0], [x, this.size[1]], uicolors["TextEditCursor"], undefined, w);
        }
      }
    }
    
    canvas.pop_scissor();
    canvas.end(this);
  }

  get_min_size(UICanvas canvas, Boolean isvertical)
  {
    return [this.min_width, 26];
  }
}
