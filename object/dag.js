"use strict";

var DagFlags = {
  DIRTY : 1,
  HAS_EXECUTE : 2,
  SORTDIRTY : 4
};

function DAGNode() {
  //field_ins/outs are lists of strings,
  //properties to pull inputs/outputs from.
  
  this.nodedata = undefined;
  this.field_ins = [];
  this.field_outs = [];
  
  this.ins = [];
  this.outs = [];
  
  this.flag = DagFlags.DIRTY;
}
create_prototype(DAGNode);
DAGNode.prototype.execute = function() {};

DAGNode.prototype.get_ins = function() {
  var ns = new Array();
  for (var i=0; i<n.ins.length; i++) {
    ns.push(n.ins[i]);
  }
  
  for (var i=0; i<n.field_ins.length; i++) {
    var n2 = nodehash.get(n.nodedata[n.field_ins[i]]);
    ns.push(n2);
  }
  cd .
  return ns;
}

DAGNode.prototype.get_outs = function() {
  var ns = new Array();
  for (var i=0; i<n.outs.length; i++) {
    ns.push(n.outs[i]);
  }
  
  for (var i=0; i<n.field_outs.length; i++) {
    var n2 = nodehash.get(n.nodedata[n.field_outs[i]]);
    ns.push(n2);
  }
  
  return ns;
}

function DAG() {
  //maps the data objects of nodes to the nodes themselves
  this.nodedata_hash = new HashTable();
  this.nodes = new GArray();
  this.sortlist = new GArray();
}
create_prototype(DAG);

DAG.prototype.sort() = function() {
  var nodes = this.nodes;
  var nodehash = this.nodedata_hash;
  
  for (var i=0; i<nodes.length; i++) {
    nodes[i].flag |= DagFlags.SORTDIRTY;
  }
  
  var dag = this;
  var sortl = new GArray();
  function dosort(n) {
    if (n.ins.length() == 0 && n.field_ins.length() == 0) {
      sortl.push(n);
      n.flag &= ~DagFlags.SORTDIRTY;
      
      return;
    }
    
    var ins = n.get_ins();
    var outs = n.get_outs();
   
    for (var i=0; i<ins.length; i++) {
      var n2 = ins[i];
      
      if (n2.flag & DagFlags.SORTDIRTY) {
        dosort(n2);
      }
    }
    
    sortl.push(n);
    n.flag &= ~SORTDIRTY;
    
    for (var i=0; i<outs.length; i++) {
      if (outs[i].flag & DagFlags.SORTDIRTY)
        dosort(outs[i]);
    }
  }
  
  for (var j=0; j<nodes.length; j++) {
    if (nodes[j].flag & DagFlags.SORTDIRTY)
      dosort(nodes[j]);
  }
  
  this.sortlist = sortl;
}
