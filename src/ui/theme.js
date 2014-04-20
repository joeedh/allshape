"use strict";

function darken(c, m) {
  for (var i=0; i<3; i++) {
    c[i] *= m;
  }
  
  return c;
}

var default_ui_font_size =  1.0;
var ui_hover_time = 800;

var colors3d = {
  ActiveObject : [0.8, 0.6, 0.3, 1.0],
  Selection : [0.7, 0.4, 0.1, 1.0]
};

var view3d_bg = [0.6, 0.6, 0.9, 1.0];

function ui_weight_clr(clr, weights) {
  var c1 = [clr[0], clr[1], clr[2], clr[3]];
  var c2 = [clr[0], clr[1], clr[2], clr[3]];
  var c3 = [clr[0], clr[1], clr[2], clr[3]];
  var c4 = [clr[0], clr[1], clr[2], clr[3]];
  
  return [
    lighten(c1, weights[0]),
    lighten(c2, weights[1]),
    lighten(c3, weights[2]),
    lighten(c4, weights[3])
  ];
}

var lighten = darken
var uicolors = {
  "Box"       : ui_weight_clr([1.0, 0.765, 0.6, 0.9], [0.85, 0.9, 1.0, 1.0]),
  "HoverHint" : ui_weight_clr([0.85, 0.85, 0.85, 0.9], [0.9, 0.9, 1.0, 1.0]),
  "ErrorBox"  : ui_weight_clr([1.0, 0.3, 0.2, 0.9], [0.7, 0.8, 1.05, 1.05]),
  "ShadowBox" : [0.0, 0.0, 0.0, 1.0],
  "WarningBox": [
    darken([1.0, 0.8, 0.1, 0.9], 0.7),
    darken([1.0, 0.8, 0.1, 0.9], 0.8),
    lighten([1.0, 0.8, 0.1, 0.9], 1.05),
    lighten([1.0, 0.8, 0.1, 0.9], 1.05)
  ],
  "ListBoxBG": [0.9, 0.9, 0.9, 0.9],  
  "ListBoxText": [0.2, 0.2, 0.2, 1.0],  
  "InvBox": ui_weight_clr([1.0, 0.6, 0.4, 0.9], [0.7, 0.7, 0.7, 0.7]),
  "HLightBox": [
    [0.75, 0.75, 0.21, 0.3],
    [0.75, 0.75, 0.21, 0.3],
    [1.0, 0.75, 0.21, 0.875],
    [1.0, 0.75, 0.21, 0.875]
  ],
  "Highlight": [1.0, 0.75, 0.21, 1],
  "MenuHighlight": [1.0, 1, 1, 1],
  "SimpleBox": [
    darken([0.5, 0.5, 0.5, 0.4], 1),
    darken([0.5, 0.5, 0.5, 0.4], 1),
    darken([0.5, 0.5, 0.5, 0.4], 1),
    darken([0.5, 0.5, 0.5, 0.4], 1)
  ],
  "DialogBox": [
    darken([0.5, 0.5, 0.5, 0.8], 1),
    darken([0.5, 0.5, 0.5, 0.8], 1),
    darken([0.5, 0.5, 0.5, 0.8], 1),
    darken([0.5, 0.5, 0.5, 0.8], 1)
  ],
  "MenuBox": [
    [0.85, 0.65, 0.35, 0.8],
    [0.85, 0.65, 0.35, 0.8],
    [0.85, 0.65, 0.35, 0.8],
    [0.85, 0.65, 0.35, 0.8]
  ],
  "RadialMenu": [0.85, 0.65, 0.35, 0.8],
  "RadialMenuHighlight" : [0.85, 0.85, 0.85, 0.5],
  "DefaultLine" : [0.2, 0.2, 0.2, 1.0],
  "SelectLine" : [0.7, 0.7, 0.7, 1.0],
  "Check" : [0.9, 0.7, 0.4, 1],
  "Arrow" : [0.4, 0.4, 0.4, 1],
  "DefaultText" : [0.2, 0.2, 0.2, 1.0],
  "BoxText" : [0.2, 0.2, 0.2, 1.0],
  "HotkeyText" : [0.4, 0.4, 0.4, 0.9],
  "HighlightCursor" : [0.9, 0.9, 0.9, 0.875],
  "TextSelect" : [0.4, 0.4, 0.4, 0.75],
  "TextEditCursor" : [0.1, 0.1, 0.1, 1.0],
  "TextBox": [
    [0.8, 0.8, 0.8, 0.9],
    [0.8, 0.8, 0.8, 0.9],
    [0.8, 0.8, 0.8, 0.9],
    [0.8, 0.8, 0.8, 0.9]
  ],
  "TextBoxHighlight": [0.9, 0.9, 0.9, 1.0],
  "TextBoxInv": [
    [0.7, 0.7, 0.7, 1.0],
    [0.7, 0.7, 0.7, 1.0],
    [0.6, 0.6, 0.6, 1.0],
    [0.6, 0.6, 0.6, 1.0]
  ],
  "MenuSep" : [0.1, 0.2, 0.2, 1.0],
  "RadialMenuSep" : [0.1, 0.2, 0.2, 1.0],
  "MenuLabel" : [
    [0.6, 0.6, 0.6, 0.9],
    [0.6, 0.6, 0.6, 0.9],
    [0.75, 0.75, 0.75, 0.9],
    [0.75, 0.75, 0.75, 0.9]
  ],
  "MenuLabelInv" : [
    [0.75, 0.75, 0.75, 0.9],
    [0.75, 0.75, 0.75, 0.9],
    [0.6, 0.6, 0.6, 0.9],
    [0.6, 0.6, 0.6, 0.9]
  ]
};
