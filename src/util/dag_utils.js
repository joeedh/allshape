//if field is not undefined, use the data
//contained in owner.[field].  otherwise, use
//own data.
function Matrix4Socket(name, owner, field, flag) {
  //flag is optional
  DagSocket.call(this, name, owner, flag);
  
  this.matrix = new Matrix4();
  this.field = field;
}
inherit(Matrix4Socket, DagSocket);

Matrix4Socket.prototype.get_data = function(edge) {
  if (this.field != undefined)
    return this.owner["field"];
  else return this.matrix;
}

function DepSocket(name, owner, flag) {
  DagSocket.call(this, name, owner, flag);
};
inherit(DepSocket, DagSocket);
