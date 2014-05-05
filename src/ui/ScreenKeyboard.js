"use strict";

class ScreenKeyboard extends RowFrame {
  constructor(Context ctx, EventHandler client, Function on_close) {
    RowFrame.call(this, ctx);
    
    this.size = [0, 0];
    this.pos = [0, 0];
    this.abspos = [0, 0];
    this.on_close = on_close;
    
    this.client = client;
    
    this.was_shift = false;
    this.caps = true;
    
    var this2;
    
    function callback(but) {
      this2.callback(but);
    }
    
    function key(c) {
      var ret = new UIButton(ctx, c);
      
      if (c == "Backspace") {
        ret = new UIButtonIcon(ctx, "Backspace", Icons.BACKSPACE);  
      } else if (c == "Left") {
        ret = new UIButtonIcon(ctx, "Left", Icons.LEFT_ARROW);  
      } else if (c == "Right") {
        ret = new UIButtonIcon(ctx, "Right", Icons.RIGHT_ARROW);  
      }
      
      if (c.length == 1) {
        ret.get_min_size = function(canvas, isvertical) {
          return [32, 32];
        }
      }
      
      ret.callback = callback;
      return ret;
    }
    
    var this2 = this;
    function addstr(frame, s) {
      var col = frame.col();
      for (var i=0; i<s.length; i++) {
        col.add(key(s[i]));
      }
    }
    
    this.addstr = addstr;
    this.key = key;
    
    this.do_page(addstr, key, this.page_lower);
  }

  firecode(int c) {
    var screen = g_app_state.screen;

    var event = new MyKeyboardEvent(c);
    
    event.keyCode = event.key = c;
    event.shiftKey = screen.shiftKey;
    event.altKey = screen.altKey;
    event.ctrlKey = screen.ctrlKey;
    
    this.client._on_keydown(event);
    this.client._on_keyup(event);
  }
  
  firechar(String c) {
    var screen = g_app_state.screen;

    var event = new MyKeyboardEvent(c.charCodeAt(0));
    
    event["char"] = c;
    event.shiftKey = screen.shiftKey;
    event.altKey = screen.altKey;
    event.ctrlKey = screen.ctrlKey;
    
    this.client._on_charcode(event);
  }
  
  callback(UIButton but) {
    if (but.text.length == 1) {
      this.firechar(but.text);
    } else {
      var s = "do_" + but.text;
      if (s in this)
        this[s](but);
    }
  }
  
  handle_client_mevt(event) {
    if (this.client instanceof UIElement) {
      event.x -= this.client.abspos[0];
      event.y -= this.client.abspos[1];
    }
  }
  
/*  
  on_mousemove(event) {
    prior(ScreenKeyboard, this).on_mousemove.call(this, event);
    
    if (this.active == undefined) {
      this.handle_client_mevt(event);
      this.client._on_mousemove(event);
    }
  }
  
  on_mousedown(event) {
    prior(ScreenKeyboard, this).on_mousemove.call(this, event);
    
    if (this.active == undefined) {
      this.handle_client_mevt(event);
      this.client._on_mousedown(event);
    }
  }
  
  on_mouseup(event) {
    prior(ScreenKeyboard, this).on_mousemove.call(this, event);
    
    if (this.active == undefined) {
      this.handle_client_mevt(event);
      this.client._on_mouseup(event);
    }
  }
*/
  do_Backspace(UIButton but) {
    console.log("backspace");
    this.firecode(charmap["Backspace"]);
  }
  
  do_Left(UIButton but) {
    console.log("left");
    this.firecode(charmap["Left"]);
  }
  
  do_Right(UIButton but) {
    console.log("right");
    this.firecode(charmap["Right"]);
  }
  
  do_Shift(UIButton but) {
    if (this.was_shift) {
      this.was_shift = false;
      this.do_page(this.addstr, this.key, this.page_lower);
    } else {
      this.was_shift = true;
      this.do_page(this.addstr, this.key, this.page_upper);
    }
  }
  
  do_Space(UIButton but) {
    this.firechar(" ");
  }
  
  do_Close(UIButton but) {
    this.end();
  }
  
  do_page(addstr, key, pagefunc) {
    this.children = new GArray();
    
    pagefunc.call(this, addstr, key);
    
    //backspace
    this.children[0].add(key("Backspace"));
    
    var last = this.children[this.children.length-1];
    last.prepend(key("Shift"));
    last.add(key("Caps"));
    
    var last2 = this.children[this.children.length-2];
    last2.prepend(new UILabel(this.ctx, "     "));
    last2.add(key("Enter"));
    
    var col = this.col();
    col.add(key("                Space               "));
    col.add(key("Close"));
    col.add(key("Left"));
    col.add(key("Right"));
  }
  
  page_lower(Function addstr, Function key) {
    addstr(this, "1234567890-=")
    addstr(this, "qwertyuiop[]");
    addstr(this, "asdfghjkl;'");
    addstr(this, "zxcvbnm,./");
  }
  
  page_upper(Function addstr, Function key) {
    addstr(this, "!@#$%^&*()_+");
    addstr(this, "QWERTYUIOP{}");
    addstr(this, 'ASDFGHJKL:"');
    addstr(this, "ZXCVBNM<>?");
  }
  
  build_draw(UICanvas canvas, Boolean isVertical) {
    var clr = [0.4, 0.4, 0.5, 0.6];
    canvas.simple_box([0, 0], this.size, clr);
    
    prior(ScreenKeyboard, this).build_draw.call(this, canvas, isVertical);
  }
  
  end() {
    this.pop_modal();
    if (this.parent.children.has(this)) {
      this.parent.remove(this);
      this.parent.do_recalc();
    }
    
    if (this.on_close) {
      this.on_close();
    }
  }
}

var _ui_keyboard = undefined;
function call_keyboard(UIElement e, Function on_close) {
  var ctx = new Context();
  var screen = ctx.screen;
  var board = new ScreenKeyboard(ctx, e, on_close);
  
  board.size[0] = screen.size[0];
  board.size[1] = screen.size[0] <= screen.size[1] ? screen.size[1]/3.0 : screen.size[1]/2.0;
  
  //if (e.abspos[1] > board.pos[1] && e.abspos[1] < board.size[1]) {
    board.pos[1] += e.abspos[1] + e.size[1];
 // }
  
  screen.add(board);
  screen.push_modal(board);
  board.do_recalc();
  
  _ui_keyboard = board;
}

function end_keyboard(UIElement e)
{
  if (_ui_keyboard != undefined) {
    _ui_keyboard.end();
    _ui_keyboard = undefined;
  }
}